// 自定义ABR
let MultiMetricsRule;

function MultiMetricsRuleClass(){
    let factory = dashjs.FactoryMaker;
    let SwitchRequest = factory.getClassFactoryByName('SwitchRequest');
    // 官方提供的获取环境信息(网络条件、缓存占用情况)获取接口
    let MetricsModel = factory.getSingletonFactoryByName('MetricsModel');
    let DashManifestModel = factory.getSingletonFactoryByName('DashManifestModel');
    let StreamController = factory.getSingletonFactoryByName('StreamController');
    let Debug = factory.getSingletonFactoryByName('Debug');

    let context = this.context;
    let instance,
        logger;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    // 初始化代码。当自定义ABR类的对象被创建时调用，可以在其中执行一些需要提前执行的代码
    function setup(){
        logger = Debug(context).getInstance().getLogger(instance);
    }

    // ABR决策逻辑的核心代码2。将dash.js中可获取的metric作为输入，
    // 返回SwitchRequest对象，其中的quality即为目标码率级别。
    function getMaxIndex(rulesContext){
        // implement your ABR logic
        // 媒体类型
        let mediaType = rulesContext.getMediaInfo().type;
        let dashMetrics = DashMetrics(context).getInstance();
        // 过去发送的HTTP请求
        let requests = dashMetrics.getHttpRequests(mediaType);

        // 缓冲区水平
        let bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType, true);

        logger.debug("[MultiMetricsRule][" + mediaType + "][] Checking download ratio rule... (current = " + current + ")");
        logger.debug("[MultiMetricsRule][" + dashMetrics + "][DownloadRatioRule] Checking download ratio rule... (current = " + current + ")");

        return SwitchRequest(context).create();
    }

    instance = {
        getMaxIndex: getMaxIndex
    };

    setup();
    return instance;

}

MultiMetricsRuleClass.__dashjs_factory_name = 'MultiMetricsRule';
MultiMetricsRule = dashjs.FactoryMaker.getClassFactory(MultiMetricsRuleClass);