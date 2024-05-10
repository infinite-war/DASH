// 自定义ABR
let MultiMetricsRule;

const SWITCH_STATE_PLUS = "状态转移1: r_{k+1} = r_k + 1";
const SWITCH_STATE_MINUS = "状态转移2: r_{k+1} = r_k - 1";
const SWITCH_STATE_EQ = "状态转移3: r_{k+1} = r_k";
const SWITCH_STATE_B = "状态转移4: r_{k+1} = r_{b_N}";
const SWITCH_STATE_PAUSE = "状态转移5: pause";
const SWITCH_STATE_STABLE = "状态转移6: r_{k+1} = r_stable";

function MultiMetricsRuleClass(){

    const context = this.context;

    let factory = dashjs.FactoryMaker;
    let SwitchRequest = factory.getClassFactoryByName('SwitchRequest');
    // let DashAdapter = factory.getSingletonFactoryByName('DashAdapter');
    let dashAdapter = window.player.getDashAdapter();
    // 官方提供的获取环境信息(网络条件、缓存占用情况)获取接口
    let MetricsModel = factory.getSingletonFactoryByName('MetricsModel');
    let DashMetrics = factory.getSingletonFactoryByName('DashMetrics');
    let DashManifestModel = factory.getSingletonFactoryByName('DashManifestModel');
    let StreamController = factory.getSingletonFactoryByName('StreamController');
    const mediaPlayerModel = factory.getSingletonFactoryByName('MediaPlayerModel');

    let HTTPRequestConstructor = factory.getSingletonFactoryByName('HTTPRequestConstructor');
    let HTTPRequest = HTTPRequestConstructor().getInstance();
    let EventBus = factory.getSingletonFactoryByName('EventBus');
    let eventBus = EventBus(context).getInstance();
    let MetricsConstantsConstructor = factory.getSingletonFactoryByName('MetricsConstantsConstructor');
    let MetricsConstants = MetricsConstantsConstructor().getInstance();
    let EventsConstructor = factory.getSingletonFactoryByName('EventsConstructor');
    let Events = EventsConstructor().getInstance();
    let MediaPlayerEventsConstructor = factory.getSingletonFactoryByName('MediaPlayerEventsConstructor');
    let MediaPlayerEvents = MediaPlayerEventsConstructor().getInstance();
    let ConstantsConstructor = factory.getSingletonFactoryByName('ConstantsConstructor');
    let Constants = ConstantsConstructor().getInstance();

    
    let Debug = factory.getSingletonFactoryByName('Debug');

    let instance,
        logger;
    let bandWidthList,  // kbps
        RateList,       // kbps
        rateLevelList,
        videoRateList,
        MPD;
    let bolaStateDict = {};
    // pop()弹尾部、shift()弹头部
    function init(){
        bolaStateDict = {};
        bandWidthList = [];
        RateList = [];
        rateLevelList = [];
        videoRateList = [];
        window.player.on(dashjs.MediaPlayer.events.MANIFEST_LOADED, function(event) {
            // 获取已加载的 manifest 对象
            MPD = event.data.Period;
            let repList = MPD.AdaptationSet[0].Representation;
            for(let i = 0; i < repList.length; i++){
                RateList.push(extractLastNumericValue(repList[i].id));
                rateLevelList.push(i);
            }
            RateList.sort(function(a, b){return a - b});
            // 在此可以使用 manifest 对象进行 ABR 决策
            // 例如提取可用的视频质量、编解码器配置等
        })
    }

    function extractLastNumericValue(str) {
        const match = str.match(/(\d+)k$/);
        if (match) {
            return parseInt(match[1], 10);
        }
        return NaN;
    }

    // 初始化代码。当自定义ABR类的对象被创建时调用，可以在其中执行一些需要提前执行的代码
    function setup(){
        init();
        logger = Debug(context).getInstance().getLogger(instance);

        eventBus.on(MediaPlayerEvents.BUFFER_EMPTY, onBufferEmpty, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_SEEKING, onPlaybackSeeking, instance);
        eventBus.on(MediaPlayerEvents.METRIC_ADDED, onMetricAdded, instance);
        eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChangeRequested, instance);
        eventBus.on(MediaPlayerEvents.FRAGMENT_LOADING_ABANDONED, onFragmentLoadingAbandoned, instance);

        eventBus.on(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, instance);
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


    //获取内容块大小(Byte)
    function getBytesLength(request) {
        return request.trace.reduce((a, b) => a + b.b[0], 0);
    }

    // 接受一个包含比特率的数组作为参数，并返回一个新数组，其中每个元素是对应比特率的自然对数值
    function utilitiesFromBitrates(bitrates) {
        return bitrates.map(b => Math.log(b));
    }
    
    // 缓冲区上限配置见Settings.js(902)
    function getMaxIndex(rulesContext) {
        console.log('===================use MultiMetricsRule===================');     

        if (!rulesContext || !rulesContext.hasOwnProperty('getMediaInfo') || !rulesContext.hasOwnProperty('getMediaType') ||
            !rulesContext.hasOwnProperty('getScheduleController') || !rulesContext.hasOwnProperty('getStreamInfo') ||
            !rulesContext.hasOwnProperty('getAbrController') || !rulesContext.hasOwnProperty('useBufferOccupancyABR')) {
            return switchRequest;
        }
        
        const mediaInfo = rulesContext.getMediaInfo();
        const scheduleController = rulesContext.getScheduleController();
        const streamInfo = rulesContext.getStreamInfo();
        const abrController = rulesContext.getAbrController();
        const throughputHistory = abrController.getThroughputHistory();
        const streamId = streamInfo ? streamInfo.id : null;
        const isDynamic = streamInfo && streamInfo.manifestInfo && streamInfo.manifestInfo.isDynamic;

        // 实现自定义ABR算法
        let metricsModel = MetricsModel(context).getInstance();
        var mediaType = rulesContext.getMediaInfo().type;
        var metrics = metricsModel.getMetricsFor(mediaType, true);
        var dashMetrics = DashMetrics(context).getInstance();
        let requests = dashMetrics.getHttpRequests(mediaType);
        let lastRequest = null;
        let currentRequest = null;
        // 是否考虑传输时延
        let latencyInBandwidth = true;

        const throughput = throughputHistory.getAverageThroughput(mediaType, isDynamic);
        // const safeThroughput = throughputHistory.getSafeAverageThroughput(mediaType, isDynamic);
        // const latency = throughputHistory.getAverageLatency(mediaType);
		
        const switchRequest = SwitchRequest(context).create();
        switchRequest.pri
        if(!requests) {
            return SwitchRequest(context).create();
        }
        // 获取上一个有效的HTTP请求
        let i = requests.length - 1; 
        while(i >=0 && lastRequest === null) {
            currentRequest = requests[i];
            if (currentRequest._tfinish && currentRequest.trequest && currentRequest.tresponse && currentRequest.trace && currentRequest.trace.length > 0) {
                lastRequest = requests[i];
            }
            i--;
        }
        if(lastRequest === null) {
            return SwitchRequest(context).create();
        }
        if(lastRequest.type !== 'MediaSegment' ) {
            return SwitchRequest(context).create();
        }

        // ================================可获取的数据=============================================

        
        // trequest:客户端发送HTTP请求的时间点
        // tresponse:客户端接收到HTTP相应的第一个字节的时间点
        // _tfinish：客户端接受完HTTP相应的最后一个字节的时间点，既请求完成时间。
        // 请求时间
        // let requestTime = (lastRequest.tresponse.getTime() - lastRequest.trequest.getTime()) / 1000;
        // // 下载时间
        // let downloadTime = (lastRequest._tfinish.getTime() - lastRequest.tresponse.getTime()) / 1000;
        // // 视频块传输时间
        // let transmissionTime = (lastRequest._tfinish.getTime() - lastRequest.trequest.getTime()) / 1000; // 单位为s 

        // =========== 视频切片相关 ============
        // 上一个视频切片大小
        let chunkSzie = getBytesLength(lastRequest);
        // 获取上一个视频切片的时长 
        let chunkDuration = rulesContext.getRepresentationInfo().fragmentDuration;
        // 上一个视频切片的码率级别
        let lastQuality = rulesContext.getRepresentationInfo().quality;

        //  ========== 带宽相关 ==========
        // 实际吞吐量(kbps)
        // let throughput = chunkSzie*8 / transmissionTime / 1000;

        // switchRequest.quality = 8;
        // switchRequest.priority = SwitchRequest.PRIORITY.STRONG;
        // return switchRequest;

        // 前N个(<=N)请求的平均带宽
        count = 1;
        let N = 10;
        let alpha = 0.8;
        let w = 0.5;
        let a = 1;
        let b = 1;
        let t_s = 4;  // 视频切片时长
        let t_p = 0;  // 停顿时长
        let lambda = 0.4;
        let mu = 0.6;
        // 缓冲区视频内容时长(s)
        let l_k = dashMetrics.getCurrentBufferLevel(mediaType, true);
        let l_min = 10;
        let l_max = window.player.getSettings().streaming.buffer.stableBufferTime;
        let r_k = rulesContext.getRepresentationInfo().quality;
        videoRateList.push(RateList[r_k]);
        rateLevelList.push(r_k);
        if(videoRateList.length > N){
            videoRateList.shift();
        }
        if(rateLevelList.length > N){
            rateLevelList.shift();
        }

        // switchRequest.quality = 9;
        // switchRequest.priority = SwitchRequest.PRIORITY.STRONG;
        // return switchRequest;


        // // 均带宽(bps)
        // let avgBandwidth = latencyInBandwidth ? (totalBytesLength / totalTime) : (totalBytesLength / downloadTime);
        setBandWidthList(requests, N);
        let preBandWidthList = bandWidthList.slice(0, bandWidthList.length-1);

        let m_b_N = getMean(bandWidthList);
        let m_b_N_1 = getMean(preBandWidthList);
        let m_v_N = getMean(videoRateList);
        // let sig_v_N = getSigma(videoRateList);
        let d_k = Math.abs(m_b_N - m_v_N) / m_b_N;
        let d_max = 0.4;

        let b_p = alpha * m_b_N_1;
        let b_k = bandWidthList.slice(-1);
        let b_next = 0;

        if(b_k < b_p ){
            b_next = b_k;
        }else if(b_k > m_b_N_1){
            b_next = m_b_N;
        }else if(b_k >= b_p && b_k <= m_b_N_1){
            let buttom = (1-(1-w)**N);
            for(let i = 1; i <= bandWidthList.length; i++){
                w_temp = w*(1-w)**i / buttom;
                b_next += w_temp * bandWidthList[bandWidthList.length - i];
            }
        }

        if(l_k >= l_min && l_k <= l_max){
            if(d_k >= 0 && d_k <= d_max){
                let calF = function(vList){
                    let temp_m = getMean(vList);
                    let temp_sig = getSigma(vList);
                    let F_m = Math.log(temp_m + a);
                    let F_sig = Math.log(temp_sig + b);
                    let F_k = lambda * F_m - mu * F_sig;
                    return F_k;
                }
                
                let r_k_plus = Math.min(r_k + 1, RateList.length-1);
                let r_k_minus = Math.max(r_k + 1, 0);
                let r_k_eq = r_k;
                let tempVList_plus = [videoRateList, RateList[r_k_plus]];
                let tempVList_minus = [videoRateList, RateList[r_k_minus]];
                let tempVList_eq = [videoRateList, RateList[r_k_eq]];
                let F_next_plus = calF(tempVList_plus);
                let F_next_minus = calF(tempVList_minus);
                let F_next_eq = calF(tempVList_eq);
                
                // switchRequest.priority = SwitchRequest.PRIORITY.STRONG;
                let F_next_max = Math.max(F_next_plus, F_next_minus, F_next_eq);
                if(F_next_max == F_next_plus){
                    switchRequest.quality = r_k_plus;
                    switchRequest.reason = SWITCH_STATE_PLUS;
                }else if(F_next_max == F_next_minus){
                    switchRequest.quality = r_k_minus;
                    switchRequest.reason = SWITCH_STATE_MINUS;
                }else if(F_next_eq == F_next_eq){
                    switchRequest.quality = r_k_eq;
                    switchRequest.reason = SWITCH_STATE_EQ;
                }
            }else{
                switchRequest.quality = getClosestRate(m_b_N);
                // switchRequest.priority = SwitchRequest.PRIORITY.STRONG;
                switchRequest.reason = SWITCH_STATE_B;
            }
        }else if(l_k > l_max){
            switchRequest.quality = getClosestRate(m_b_N);
            return SwitchRequest(context).create();
        }else if(l_k < l_min){
            switchRequest.quality = -1;
            for(let i = r_k; i >= 0; i--){
                l_k_1 = l_k + t_s - (RateList[r_k]/b_next) - t_p;
                if( l_k_1 > l_k){
                    switchRequest.quality = i;
                    break;
                }
            }
            switchRequest.quality = Math.max(switchRequest.quality, 0);
            switchRequest.priority = SwitchRequest.PRIORITY.STRONG;
            switchRequest.reason = SWITCH_STATE_STABLE;
        }



        // console.log('视频块大小为:' +chunkSzie / 1024+'KB');
        // console.log('吞吐量：'+throughput+'KBps');
        console.log('MMRule决策码率级别'+switchRequest.quality);
        // switchRequest.priority = SwitchRequest.PRIORITY.STRONG;
        return switchRequest;
    }

    function setBandWidthList(requests, N){
        bandWidthList = []
        count = 1;
        let totalBytesLength = 0;
        let totalTime = 0;
        let downloadTime = 0;
        let i = requests.length - 1; 
        while (i >= 0 && count < N) {
            currentRequest = requests[i];
            if (currentRequest._tfinish && currentRequest.trequest
                 && currentRequest.tresponse && currentRequest.trace && currentRequest.trace.length > 0) {
                let _totalTime = (currentRequest._tfinish.getTime() - currentRequest.trequest.getTime()) / 1000;
                let _downloadTime = (currentRequest._tfinish.getTime() - currentRequest.tresponse.getTime()) / 1000;

                totalTime += _totalTime;
                downloadTime += _downloadTime;
                currentBytesLength = getBytesLength(currentRequest)
                totalBytesLength += currentBytesLength;
                count += 1;
                currentBitLength = currentBytesLength * 8;
                bandWidthList.push(currentBitLength / _totalTime / 1000);
            }
            i--;
        }
        totalBytesLength *= 8;
        // 均带宽(bps)
        // let avgBandwidth = (totalBytesLength / totalTime);
    }

    function getMean(arr){
        return arr.reduce((s, cur) => s + cur, 0) / arr.length;
    }

    function getSigma(arr){
        let n = arr.length;
        let mean = getMean(arr);
        let diffsSquaredSum = arr.reduce((acc, cur) => acc + Math.pow(cur - mean, 2), 0);
        let variance = diffsSquaredSum / n;
        let stdDev = Math.sqrt(variance);
        return stdDev;
    }

    function getClosestRate(m){
        let ans = 1e8;
        let choice = 0;

        for(let i=0; i<RateList.length; i++){
            let diff = Math.abs(RateList[i] - m);
            if(diff < ans){
                ans = diff;
                choice = i;
            }
        }
        return choice; 
    }

 



    function reset() {
        init();
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

MultiMetricsRuleClass.__dashjs_factory_name = 'MultiMetricsRule';
MultiMetricsRule = dashjs.FactoryMaker.getClassFactory(MultiMetricsRuleClass);