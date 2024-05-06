var CustomThroughputRule;

function CustomThroughputRuleClass() {

    let factory = dashjs.FactoryMaker;
    let SwitchRequest = factory.getClassFactoryByName('SwitchRequest');
    let MetricsModel = factory.getSingletonFactoryByName('MetricsModel');

    let Debug = factory.getSingletonFactoryByName('Debug');

    let context = this.context;
    let instance,
        logger;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function checkConfig() {
        if (!dashMetrics || !dashMetrics.hasOwnProperty('getCurrentBufferState')) {
            throw new Error(Constants.MISSING_CONFIG_ERROR);
        }
    }

    function getMaxIndex(rulesContext) {

        console.log('===================use throughputRule===================')

        const switchRequest = SwitchRequest(context).create();

        if (!rulesContext || !rulesContext.hasOwnProperty('getMediaInfo') || !rulesContext.hasOwnProperty('getMediaType') || !rulesContext.hasOwnProperty('useBufferOccupancyABR') ||
            !rulesContext.hasOwnProperty('getAbrController') || !rulesContext.hasOwnProperty('getScheduleController')) {
            return switchRequest;
        }

        checkConfig();

        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = rulesContext.getMediaType();
        const currentBufferState = dashMetrics.getCurrentBufferState(mediaType);
        const scheduleController = rulesContext.getScheduleController();
        const abrController = rulesContext.getAbrController();
        const streamInfo = rulesContext.getStreamInfo();
        const streamId = streamInfo ? streamInfo.id : null;
        const isDynamic = streamInfo && streamInfo.manifestInfo ? streamInfo.manifestInfo.isDynamic : null;
        const throughputHistory = abrController.getThroughputHistory();
        const throughput = throughputHistory.getSafeAverageThroughput(mediaType, isDynamic); // 吞吐量
        const latency = throughputHistory.getAverageLatency(mediaType); // 延迟
        const useBufferOccupancyABR = rulesContext.useBufferOccupancyABR();

        if (isNaN(throughput) || !currentBufferState || useBufferOccupancyABR) {
            return switchRequest;
        }

        // 首先检查当前没有中止加载的请求。如果缓冲状态良好（已加载）或者是动态流（如直播），
        // 则基于当前的吞吐量和延迟，通过 abrController 确定合适的视频码率等级。
        // 此外，设置加载延迟为0，并记录决策的原因。
        if (abrController.getAbandonmentStateFor(streamId, mediaType) !== MetricsConstants.ABANDON_LOAD) {
            if (currentBufferState.state === MetricsConstants.BUFFER_LOADED || isDynamic) {
                switchRequest.quality = abrController.getQualityForBitrate(mediaInfo, throughput, streamId, latency);
                scheduleController.setTimeToLoadDelay(0);
                switchRequest.reason = {throughput: throughput, latency: latency};
            }
        }

        return switchRequest;
    }

    instance = {
        getMaxIndex: getMaxIndex
    };

    setup();

    return instance;
}

CustomThroughputRuleClass.__dashjs_factory_name = 'CustomThroughputRule';
CustomThroughputRule = dashjs.FactoryMaker.getClassFactory(CustomThroughputRuleClass);

