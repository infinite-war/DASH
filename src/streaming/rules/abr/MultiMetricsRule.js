import MetricsConstants from '../../constants/MetricsConstants';
import SwitchRequest from '../SwitchRequest';
import FactoryMaker from '../../../core/FactoryMaker';
import {HTTPRequest} from '../../vo/metrics/HTTPRequest';
import EventBus from '../../../core/EventBus';
import Events from '../../../core/events/Events';
import Debug from '../../../core/Debug';
import MediaPlayerEvents from '../../MediaPlayerEvents';
import Constants from '../../constants/Constants';

// BOLA的三种状态
// BOLA_STATE_ONE_BITRATE   : If there is only one bitrate (or initialization failed), always return NO_CHANGE.
//                            特殊情况，如仅有一个码率或者初始化失败
// BOLA_STATE_STARTUP       : Set placeholder buffer such that we download fragments at most recently measured throughput.
//                            默认初始状态，基于placeholder buffer进行码率决策
// BOLA_STATE_STEADY        : Buffer primed, we switch to steady operation.
//                            buffer足够时，基于BOLA进行决策（重点）
// TODO: add BOLA_STATE_SEEK and tune BOLA behavior on seeking
const BOLA_STATE_ONE_BITRATE = 0;
const BOLA_STATE_STARTUP = 1;
const BOLA_STATE_STEADY = 2;

const MINIMUM_BUFFER_S = 10; // BOLA should never add artificial delays if buffer is less than MINIMUM_BUFFER_S.
const MINIMUM_BUFFER_PER_BITRATE_LEVEL_S = 2;
// E.g. if there are 5 bitrates, BOLA switches to top bitrate at buffer = 10 + 5 * 2 = 20s.
// If Schedule Controller does not allow buffer to reach that level, it can be achieved through the placeholder buffer level.

const PLACEHOLDER_BUFFER_DECAY = 0.99; // Make sure placeholder buffer does not stick around too long.

function MultiMerticsRule(config) {

    config = config || {};
    const context = this.context;

    const dashMetrics = config.dashMetrics;
    const mediaPlayerModel = config.mediaPlayerModel;
    const eventBus = EventBus(context).getInstance();

    let instance,
        logger,
        bolaStateDict;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();

        eventBus.on(MediaPlayerEvents.BUFFER_EMPTY, onBufferEmpty, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_SEEKING, onPlaybackSeeking, instance);
        eventBus.on(MediaPlayerEvents.METRIC_ADDED, onMetricAdded, instance);
        eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChangeRequested, instance);
        eventBus.on(MediaPlayerEvents.FRAGMENT_LOADING_ABANDONED, onFragmentLoadingAbandoned, instance);

        eventBus.on(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, instance);
    }

    // 接受一个包含比特率的数组作为参数，并返回一个新数组，其中每个元素是对应比特率的自然对数值
    function utilitiesFromBitrates(bitrates) {
        return bitrates.map(b => Math.log(b));
        // no need to worry about offset, utilities will be offset (uniformly) anyway later
    }

    // 计算BOLA相关参数，见 https://blog.csdn.net/LvGreat/article/details/130487156
    // NOTE: in live streaming, the real buffer level can drop below minimumBufferS, but bola should not stick to lowest bitrate by using a placeholder buffer level
    // 在直播流中，实际缓冲级别可能会低于最小 BufferS，但 bola 不应该通过使用占位符缓冲级别来坚持最低比特率
    function calculateBolaParameters(stableBufferTime, bitrates, utilities) {
        const highestUtilityIndex = utilities.reduce((highestIndex, u, uIndex) => (u > utilities[highestIndex] ? uIndex : highestIndex), 0);

        if (highestUtilityIndex === 0) {
            // if highestUtilityIndex === 0, then always use lowest bitrate
            return null;
        }

        // 计算实际缓冲时间
        const bufferTime = Math.max(stableBufferTime, MINIMUM_BUFFER_S + MINIMUM_BUFFER_PER_BITRATE_LEVEL_S * bitrates.length);

        // 代码中参数设置的逻辑是：使得BOLA可以在缓冲区水平为minimumBufferS时选择最低码率，
        // 在bufferTarget时选择最高码率，这个设定类似于BBA的双阈值。
        // TODO: Investigate if following can be better if utilities are not the default Math.log utilities.
        // If using Math.log utilities, we can choose Vp and gp to always prefer bitrates[0] at minimumBufferS and bitrates[max] at bufferTarget.
        // (Vp * (utility + gp) - bufferLevel) / bitrate has the maxima described when:
        // Vp * (utilities[0] + gp - 1) === minimumBufferS and Vp * (utilities[max] + gp - 1) === bufferTarget
        // gp 是一个常数，用于调整缓冲区水平和效用值之间的关系；
        // Vp 是一个常数，用于计算缓冲区水平应该达到的值。
        // giving:
        const gp = (utilities[highestUtilityIndex] - 1) / (bufferTime / MINIMUM_BUFFER_S - 1);
        const Vp = MINIMUM_BUFFER_S / gp;
        // note that expressions for gp and Vp assume utilities[0] === 1, which is true because of normalization

        return { gp: gp, Vp: Vp };
    }

    function getInitialBolaState(rulesContext) {
        const initialState = {};
        const mediaInfo = rulesContext.getMediaInfo();
        const bitrates = mediaInfo.bitrateList.map(b => b.bandwidth);
        let utilities = utilitiesFromBitrates(bitrates);
        utilities = utilities.map(u => u - utilities[0] + 1); // normalize
        const stableBufferTime = mediaPlayerModel.getStableBufferTime();
        const params = calculateBolaParameters(stableBufferTime, bitrates, utilities);

        if (!params) {
            // only happens when there is only one bitrate level
            initialState.state = BOLA_STATE_ONE_BITRATE;
        } else {
            initialState.state = BOLA_STATE_STARTUP;

            initialState.bitrates = bitrates;
            initialState.utilities = utilities;
            initialState.stableBufferTime = stableBufferTime;
            initialState.Vp = params.Vp;
            initialState.gp = params.gp;

            initialState.lastQuality = 0;
            clearBolaStateOnSeek(initialState);
        }

        return initialState;
    }

    function clearBolaStateOnSeek(bolaState) {
        bolaState.placeholderBuffer = 0;
        bolaState.mostAdvancedSegmentStart = NaN;
        bolaState.lastSegmentWasReplacement = false;
        bolaState.lastSegmentStart = NaN;
        bolaState.lastSegmentDurationS = NaN;
        bolaState.lastSegmentRequestTimeMs = NaN;
        bolaState.lastSegmentFinishTimeMs = NaN;
    }

    // 检查 BOLA 状态的稳定缓冲时间是否需要调整
    // If the buffer target is changed (can this happen mid-stream?), then adjust BOLA parameters accordingly.
    function checkBolaStateStableBufferTime(bolaState, mediaType) {
        const stableBufferTime = mediaPlayerModel.getStableBufferTime();
        if (bolaState.stableBufferTime !== stableBufferTime) {
            const params = calculateBolaParameters(stableBufferTime, bolaState.bitrates, bolaState.utilities);
            if (params.Vp !== bolaState.Vp || params.gp !== bolaState.gp) {
                // correct placeholder buffer using two criteria:
                // 1. do not change effective buffer level at effectiveBufferLevel === MINIMUM_BUFFER_S ( === Vp * gp )
                // 2. scale placeholder buffer by Vp subject to offset indicated in 1.

                const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType);
                // 有效缓冲级别
                let effectiveBufferLevel = bufferLevel + bolaState.placeholderBuffer;

                effectiveBufferLevel -= MINIMUM_BUFFER_S;
                effectiveBufferLevel *= params.Vp / bolaState.Vp;
                effectiveBufferLevel += MINIMUM_BUFFER_S;

                // 更新 BOLA 状态中的稳定缓冲时间、Vp 和 gp 参数，以及占位缓冲
                bolaState.stableBufferTime = stableBufferTime;
                bolaState.Vp = params.Vp;
                bolaState.gp = params.gp;
                bolaState.placeholderBuffer = Math.max(0, effectiveBufferLevel - bufferLevel);
            }
        }
    }

    function getBolaState(rulesContext) {
        const mediaType = rulesContext.getMediaType();
        let bolaState = bolaStateDict[mediaType];
        if (!bolaState) {
            bolaState = getInitialBolaState(rulesContext);
            bolaStateDict[mediaType] = bolaState;
        } else if (bolaState.state !== BOLA_STATE_ONE_BITRATE) {
            checkBolaStateStableBufferTime(bolaState, mediaType);
        }
        return bolaState;
    }

    // 重点：根据当前缓冲水平来选择最适合的视频质量
    // The core idea of BOLA.
    function getQualityFromBufferLevel(bolaState, bufferLevel) {
        const bitrateCount = bolaState.bitrates.length;
        // 视频质量级别
        let quality = NaN;
        let score = NaN;
        for (let i = 0; i < bitrateCount; ++i) {
            // V_p 是 BOLA 参数中的一个常数
            // utilities[i] 表示第 i 个比特率对应的效用值
            // g_p 是 BOLA 参数中的另一个常数
            // bitrates[i] 是第 i 个比特率的值
            let s = (bolaState.Vp * (bolaState.utilities[i] + bolaState.gp) - bufferLevel) / bolaState.bitrates[i];
            if (isNaN(score) || s >= score) {
                score = s;
                quality = i;
            }
        }
        return quality;
    }

    // 计算在特定质量级别下，系统最大允许的缓冲水平
    // maximum buffer level which prefers to download at quality rather than wait
    function maxBufferLevelForQuality(bolaState, quality) {
        return bolaState.Vp * (bolaState.utilities[quality] + bolaState.gp);
    }

    // the minimum buffer level that would cause BOLA to choose quality rather than a lower bitrate
    function minBufferLevelForQuality(bolaState, quality) {
        const qBitrate = bolaState.bitrates[quality];
        const qUtility = bolaState.utilities[quality];

        let min = 0;
        for (let i = quality - 1; i >= 0; --i) {
            // for each bitrate less than bitrates[quality], BOLA should prefer quality (unless other bitrate has higher utility)
            if (bolaState.utilities[i] < bolaState.utilities[quality]) {
                const iBitrate = bolaState.bitrates[i];
                const iUtility = bolaState.utilities[i];

                const level = bolaState.Vp * (bolaState.gp + (qBitrate * iUtility - iBitrate * qUtility) / (qBitrate - iBitrate));
                min = Math.max(min, level); // we want min to be small but at least level(i) for all i
            }
        }
        return min;
    }

    /*
     * The placeholder buffer increases the effective buffer that is used to calculate the bitrate.
     * There are two main reasons we might want to increase the placeholder buffer:
     *
     * 1. When a segment finishes downloading, we would expect to get a call on getMaxIndex() regarding the quality for
     *    the next segment. However, there might be a delay before the next call. E.g. when streaming live content, the
     *    next segment might not be available yet. If the call to getMaxIndex() does happens after a delay, we don't
     *    want the delay to change the BOLA decision - we only want to factor download time to decide on bitrate level.
     *
     * 2. It is possible to get a call to getMaxIndex() without having a segment download. The buffer target in dash.js
     *    is different for top-quality segments and lower-quality segments. If getMaxIndex() returns a lower-than-top
     *    quality, then the buffer controller might decide not to download a segment. When dash.js is ready for the next
     *    segment, getMaxIndex() will be called again. We don't want this extra delay to factor in the bitrate decision.
     */
    // 更新占位缓冲（placeholder buffer）。占位缓冲的作用是增加有效缓冲区的大小，以便在计算比特率时考虑下载时间等因素
    function updatePlaceholderBuffer(bolaState, mediaType) {
        const nowMs = Date.now();

        if (!isNaN(bolaState.lastSegmentFinishTimeMs)) {
            // compensate for non-bandwidth-derived delays, e.g., live streaming availability, buffer controller
            const delay = 0.001 * (nowMs - bolaState.lastSegmentFinishTimeMs);
            bolaState.placeholderBuffer += Math.max(0, delay);
        } else if (!isNaN(bolaState.lastCallTimeMs)) {
            // no download after last call, compensate for delay between calls
            const delay = 0.001 * (nowMs - bolaState.lastCallTimeMs);
            bolaState.placeholderBuffer += Math.max(0, delay);
        }

        bolaState.lastCallTimeMs = nowMs;
        bolaState.lastSegmentStart = NaN;
        bolaState.lastSegmentRequestTimeMs = NaN;
        bolaState.lastSegmentFinishTimeMs = NaN;

        checkBolaStateStableBufferTime(bolaState, mediaType);
    }

    // 该函数用于处理当缓冲区为空时的事件。函数的主要目的是在重新缓冲时，防止占位缓冲（placeholder buffer）人为地提高 BOLA 的质量。
    function onBufferEmpty(e) {
        // if we rebuffer, we don't want the placeholder buffer to artificially raise BOLA quality
        const mediaType = e.mediaType;
        // if audio buffer runs empty (due to track switch for example) then reset placeholder buffer only for audio (to avoid decrease video BOLA quality)
        const stateDict = mediaType === Constants.AUDIO ? [Constants.AUDIO] : bolaStateDict;
        for (const mediaType in stateDict) {
            if (bolaStateDict.hasOwnProperty(mediaType) && bolaStateDict[mediaType].state === BOLA_STATE_STEADY) {
                bolaStateDict[mediaType].placeholderBuffer = 0;
            }
        }
    }

    // 在播放器进行跳转操作时，重新设置相关的 BOLA 状态，以确保 BOLA 算法的正确运行
    function onPlaybackSeeking() {
        // TODO: 1. Verify what happens if we seek mid-fragment.
        // TODO: 2. If e.g. we have 10s fragments and seek, we might want to download the first fragment at a lower quality to restart playback quickly.
        for (const mediaType in bolaStateDict) {
            if (bolaStateDict.hasOwnProperty(mediaType)) {
                const bolaState = bolaStateDict[mediaType];
                if (bolaState.state !== BOLA_STATE_ONE_BITRATE) {
                    bolaState.state = BOLA_STATE_STARTUP; // TODO: BOLA_STATE_SEEK?
                    clearBolaStateOnSeek(bolaState);
                }
            }
        }
    }

    // 处理当媒体片段加载完成时的事件
    function onMediaFragmentLoaded(e) {
        if (e && e.chunk && e.chunk.mediaInfo) {
            const bolaState = bolaStateDict[e.chunk.mediaInfo.type];
            if (bolaState && bolaState.state !== BOLA_STATE_ONE_BITRATE) {
                const start = e.chunk.start;
                if (isNaN(bolaState.mostAdvancedSegmentStart) || start > bolaState.mostAdvancedSegmentStart) {
                    bolaState.mostAdvancedSegmentStart = start;
                    bolaState.lastSegmentWasReplacement = false;
                } else {
                    bolaState.lastSegmentWasReplacement = true;
                }

                bolaState.lastSegmentStart = start;
                bolaState.lastSegmentDurationS = e.chunk.duration;
                bolaState.lastQuality = e.chunk.quality;

                checkNewSegment(bolaState, e.chunk.mediaInfo.type);
            }
        }
    }

    function onMetricAdded(e) {
        if (e && e.metric === MetricsConstants.HTTP_REQUEST && e.value && e.value.type === HTTPRequest.MEDIA_SEGMENT_TYPE && e.value.trace && e.value.trace.length) {
            const bolaState = bolaStateDict[e.mediaType];
            if (bolaState && bolaState.state !== BOLA_STATE_ONE_BITRATE) {
                bolaState.lastSegmentRequestTimeMs = e.value.trequest.getTime();
                bolaState.lastSegmentFinishTimeMs = e.value._tfinish.getTime();

                checkNewSegment(bolaState, e.mediaType);
            }
        }
    }

    /*
     * When a new segment is downloaded, we get two notifications: onMediaFragmentLoaded() and onMetricAdded(). It is
     * possible that the quality for the downloaded segment was lower (not higher) than the quality indicated by BOLA.
     * This might happen because of other rules such as the DroppedFramesRule. When this happens, we trim the
     * placeholder buffer to make BOLA more stable. This mechanism also avoids inflating the buffer when BOLA itself
     * decides not to increase the quality to avoid oscillations.
     *
     * We should also check for replacement segments (fast switching). In this case, a segment is downloaded but does
     * not grow the actual buffer. Fast switching might cause the buffer to deplete, causing BOLA to drop the bitrate.
     * We avoid this by growing the placeholder buffer.
     */
    // 检查新下载的片段，并根据不同情况调整占位缓冲
    // 主要目的是使 BOLA 更加稳定，并避免在特定情况下缓冲区的不必要增长或缩减
    function checkNewSegment(bolaState, mediaType) {
        if (!isNaN(bolaState.lastSegmentStart) && !isNaN(bolaState.lastSegmentRequestTimeMs) && !isNaN(bolaState.placeholderBuffer)) {
            bolaState.placeholderBuffer *= PLACEHOLDER_BUFFER_DECAY;

            // Find what maximum buffer corresponding to last segment was, and ensure placeholder is not relatively larger.
            if (!isNaN(bolaState.lastSegmentFinishTimeMs)) {
                const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType);
                const bufferAtLastSegmentRequest = bufferLevel + 0.001 * (bolaState.lastSegmentFinishTimeMs - bolaState.lastSegmentRequestTimeMs); // estimate
                const maxEffectiveBufferForLastSegment = maxBufferLevelForQuality(bolaState, bolaState.lastQuality);
                const maxPlaceholderBuffer = Math.max(0, maxEffectiveBufferForLastSegment - bufferAtLastSegmentRequest);
                bolaState.placeholderBuffer = Math.min(maxPlaceholderBuffer, bolaState.placeholderBuffer);
            }

            // then see if we should grow placeholder buffer

            if (bolaState.lastSegmentWasReplacement && !isNaN(bolaState.lastSegmentDurationS)) {
                // compensate for segments that were downloaded but did not grow the buffer
                bolaState.placeholderBuffer += bolaState.lastSegmentDurationS;
            }

            bolaState.lastSegmentStart = NaN;
            bolaState.lastSegmentRequestTimeMs = NaN;
        }
    }

    function onQualityChangeRequested(e) {
        // Useful to store change requests when abandoning a download.
        if (e) {
            const bolaState = bolaStateDict[e.mediaType];
            if (bolaState && bolaState.state !== BOLA_STATE_ONE_BITRATE) {
                bolaState.abrQuality = e.newQuality;
            }
        }
    }

    function onFragmentLoadingAbandoned(e) {
        if (e) {
            const bolaState = bolaStateDict[e.mediaType];
            if (bolaState && bolaState.state !== BOLA_STATE_ONE_BITRATE) {
                // deflate placeholderBuffer - note that we want to be conservative when abandoning
                const bufferLevel = dashMetrics.getCurrentBufferLevel(e.mediaType);
                let wantEffectiveBufferLevel;
                if (bolaState.abrQuality > 0) {
                    // deflate to point where BOLA just chooses newQuality over newQuality-1
                    wantEffectiveBufferLevel = minBufferLevelForQuality(bolaState, bolaState.abrQuality);
                } else {
                    wantEffectiveBufferLevel = MINIMUM_BUFFER_S;
                }
                const maxPlaceholderBuffer = Math.max(0, wantEffectiveBufferLevel - bufferLevel);
                bolaState.placeholderBuffer = Math.min(bolaState.placeholderBuffer, maxPlaceholderBuffer);
            }
        }
    }

    // 决策函数
    function getMaxIndex(rulesContext) {
        console.log('===================use MMRule====================')
        // 初始化
        const switchRequest = SwitchRequest(context).create();

        if (!rulesContext || !rulesContext.hasOwnProperty('getMediaInfo') || !rulesContext.hasOwnProperty('getMediaType') ||
            !rulesContext.hasOwnProperty('getScheduleController') || !rulesContext.hasOwnProperty('getStreamInfo') ||
            !rulesContext.hasOwnProperty('getAbrController') || !rulesContext.hasOwnProperty('useBufferOccupancyABR')) {
            return switchRequest;
        }
        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = rulesContext.getMediaType();
        const scheduleController = rulesContext.getScheduleController();
        const streamInfo = rulesContext.getStreamInfo();
        const abrController = rulesContext.getAbrController();
        const throughputHistory = abrController.getThroughputHistory();
        const streamId = streamInfo ? streamInfo.id : null;
        const isDynamic = streamInfo && streamInfo.manifestInfo && streamInfo.manifestInfo.isDynamic;
        const useBufferOccupancyABR = rulesContext.useBufferOccupancyABR();
        switchRequest.reason = switchRequest.reason || {};

        if (!useBufferOccupancyABR) {
            return switchRequest;
        }

        scheduleController.setTimeToLoadDelay(0);

        // 获取BOLA状态
        const bolaState = getBolaState(rulesContext);

        if (bolaState.state === BOLA_STATE_ONE_BITRATE) {
            // shouldn't even have been called
            return switchRequest;
        }

        // 获取可探测的信息：缓冲区水平、吞吐量、延迟
        const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType);
        const throughput = throughputHistory.getAverageThroughput(mediaType, isDynamic);
        const safeThroughput = throughputHistory.getSafeAverageThroughput(mediaType, isDynamic);
        const latency = throughputHistory.getAverageLatency(mediaType);
        let quality;

        switchRequest.reason.state = bolaState.state;
        switchRequest.reason.throughput = throughput;
        switchRequest.reason.latency = latency;

        if (isNaN(throughput)) { // isNaN(throughput) === isNaN(safeThroughput) === isNaN(latency)
            // still starting up - not enough information
            return switchRequest;
        }

        switch (bolaState.state) {
            case BOLA_STATE_STARTUP:
                // 启动阶段基于RB选择码率：getQualityForBitrate
                quality = abrController.getQualityForBitrate(mediaInfo, safeThroughput, streamId, latency);

                switchRequest.quality = quality;
                switchRequest.reason.throughput = safeThroughput;

                bolaState.placeholderBuffer = Math.max(0, minBufferLevelForQuality(bolaState, quality) - bufferLevel);
                bolaState.lastQuality = quality;

                // 若buffer高于视频块时长，则切换为BOLA_STATE_STEADY状态
                if (!isNaN(bolaState.lastSegmentDurationS) && bufferLevel >= bolaState.lastSegmentDurationS) {
                    bolaState.state = BOLA_STATE_STEADY;
                }

                break; // BOLA_STATE_STARTUP

            case BOLA_STATE_STEADY:

                // NB: The placeholder buffer is added to bufferLevel to come up with a bitrate.
                //     This might lead BOLA to be too optimistic and to choose a bitrate that would lead to rebuffering -
                //     if the real buffer bufferLevel runs out, the placeholder buffer cannot prevent rebuffering.
                //     However, the InsufficientBufferRule takes care of this scenario.

                // 函数基于缓冲区水平和占位缓冲使用 BOLA 核心逻辑选择适当的质量级别，并根据 BOLA-O 策略避免振荡。
                // 同时，函数还根据缓冲水平和占位缓冲计算出延迟时间，并告知调度控制器是否需要暂停加载。

                updatePlaceholderBuffer(bolaState, mediaType);

                // 稳定阶段基于BOLA-BASIC选择码率：getQualityFromBufferLevel（BOLA的核心决策逻辑，与论文一致，
                // 可参见：BOLA (INFOCOM ’16) 核心算法逻辑 https://blog.csdn.net/LvGreat/article/details/130487156）
                quality = getQualityFromBufferLevel(bolaState, bufferLevel + bolaState.placeholderBuffer);

                // BOLA-O 逻辑
                // we want to avoid oscillations
                // We implement the "BOLA-O" variant: when network bandwidth lies between two encoded bitrate levels, stick to the lowest level.
                // 修改的BOLA-O逻辑：当网络带宽位于两个编码比特率级别之间时，坚持使用最低级别
                const qualityForThroughput = abrController.getQualityForBitrate(mediaInfo, safeThroughput, streamId, latency);
                if (quality > bolaState.lastQuality && quality > qualityForThroughput) {
                    // only intervene if we are trying to *increase* quality to an *unsustainable* level
                    // we are only avoid oscillations - do not drop below last quality

                    quality = Math.max(qualityForThroughput, bolaState.lastQuality);
                }

                // We do not want to overfill buffer with low quality chunks.
                // Note that there will be no delay if buffer level is below MINIMUM_BUFFER_S, probably even with some margin higher than MINIMUM_BUFFER_S.
                // 计算需要的延迟时间，确保缓冲区不会过度填充
                // 这里比较了缓冲区水平和占位缓冲加上当前选择的质量级别对应的最大缓冲水平，取其差值作为延迟时间
                let delayS = Math.max(0, bufferLevel + bolaState.placeholderBuffer - maxBufferLevelForQuality(bolaState, quality));

                // First reduce placeholder buffer, then tell schedule controller to pause.
                // 减少占位符缓冲区，然后告诉调度控制器暂停。
                if (delayS <= bolaState.placeholderBuffer) {
                    bolaState.placeholderBuffer -= delayS;
                    delayS = 0;
                } else {
                    delayS -= bolaState.placeholderBuffer;
                    bolaState.placeholderBuffer = 0;

                    if (quality < abrController.getMaxAllowedIndexFor(mediaType, streamId)) {
                        // At top quality, allow schedule controller to decide how far to fill buffer.
                        scheduleController.setTimeToLoadDelay(1000 * delayS);
                    } else {
                        delayS = 0;
                    }
                }

                switchRequest.quality = quality;
                switchRequest.reason.throughput = throughput;
                switchRequest.reason.latency = latency;
                switchRequest.reason.bufferLevel = bufferLevel;
                switchRequest.reason.placeholderBuffer = bolaState.placeholderBuffer;
                switchRequest.reason.delay = delayS;

                bolaState.lastQuality = quality;
                // keep bolaState.state === BOLA_STATE_STEADY

                break; // BOLA_STATE_STEADY

            default:
                logger.debug('BOLA ABR rule invoked in bad state.');
                // should not arrive here, try to recover
                switchRequest.quality = abrController.getQualityForBitrate(mediaInfo, safeThroughput, streamId, latency);
                switchRequest.reason.state = bolaState.state;
                switchRequest.reason.throughput = safeThroughput;
                switchRequest.reason.latency = latency;
                bolaState.state = BOLA_STATE_STARTUP;
                clearBolaStateOnSeek(bolaState);
        }

        return switchRequest;
    }

    function resetInitialSettings() {
        bolaStateDict = {};
    }

    // 重置播放器实例的状态
    function reset() {
        resetInitialSettings();
        // 移除了一系列事件监听器。这些监听器包括了处理缓冲区为空、播放跳转、指标添加、质量变更请求、片段加载放弃等事件的处理函数。
        eventBus.off(MediaPlayerEvents.BUFFER_EMPTY, onBufferEmpty, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_SEEKING, onPlaybackSeeking, instance);
        eventBus.off(MediaPlayerEvents.METRIC_ADDED, onMetricAdded, instance);
        eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChangeRequested, instance);
        eventBus.off(MediaPlayerEvents.FRAGMENT_LOADING_ABANDONED, onFragmentLoadingAbandoned, instance);

        // 移除了片段加载完成事件的监听器
        eventBus.off(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, instance);
    }

    instance = {
        getMaxIndex: getMaxIndex,
        reset: reset
    };

    setup();
    return instance;
}

MultiMerticsRule.__dashjs_factory_name = 'MultiMerticsRule';
export default FactoryMaker.getClassFactory(MultiMerticsRule);
