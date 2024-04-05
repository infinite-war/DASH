// 自定义ABR
let MultiMetricsRule;

function MultiMetricsRuleClass(){
    let factory = dashjs.FactoryMaker;
    let SwitchRequest = factory.getClassFactoryByName('SwitchRequest');
    // 官方提供的获取环境信息(网络条件、缓存占用情况)获取接口
    let MetricsModel = factory.getSingletonFactoryByName('MetricsModel');
    let DashMetrics = factory.getSingletonFactoryByName('DashMetrics');
    let DashManifestModel = factory.getSingletonFactoryByName('DashManifestModel');
    let StreamController = factory.getSingletonFactoryByName('StreamController');

    let MediaPlayerModel = config.mediaPlayerModel;
    let EventBus = EventBus(context).getInstance();
    
    let Debug = factory.getSingletonFactoryByName('Debug');

    let context = this.context;
    let instance,
        logger;

    // 初始化代码。当自定义ABR类的对象被创建时调用，可以在其中执行一些需要提前执行的代码
    function setup(){
        logger = Debug(context).getInstance().getLogger(instance);
    }

    //获取字节长度
	function getBytesLength(request) {
        return request.trace.reduce((a, b) => a + b.b[0], 0);
    }
    
    function getMaxIndex(rulesContext) {
		console.log("===================use my rule===================");        
		// 实现自定义ABR算法
        let metricsModel = MetricsModel(context).getInstance();
        var mediaType = rulesContext.getMediaInfo().type;
        var metrics = metricsModel.getMetricsFor(mediaType, true);
		var dashMetrics = DashMetrics(context).getInstance();
		var bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType); // 当前缓冲的秒数
		let requests = dashMetrics.getHttpRequests(mediaType);
		let lastRequest = null;
		let currentRequest = null;

        console.log(dashMetrics)
        // console.log(metricsModel)
		
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

		// 视频块传输时间
		// trequest:客户端发送HTTP请求的时间点
		// tresponse:客户端接收到HTTP相应的第一个字节的时间点
		// _tfinish：客户端接受完HTTP相应的最后一个字节的时间点，既请求完成时间。
		
		let transmissionTime = (lastRequest._tfinish.getTime() - lastRequest.trequest.getTime()) / 1000;  // 单位为s 
		
		// 有了传输数据量（视频块大小）和传输时间，视频块吞吐量（单位为bps）则由视频块传输时间计算得到:
		let chunkSzie = getBytesLength(lastRequest);
		let throughput = chunkSzie / transmissionTime;
		throughput = throughput / 1024;
		console.log('视频块大小为:' +chunkSzie / 1024+'KB');
		console.log('吞吐量：'+throughput+'KBps');
		// 获取上一个视频块的码率级别
		let lastQuality = rulesContext.getRepresentationInfo().quality;
		console.log('获取码率级别'+lastQuality);
		// 获取上一个视频块的时长 
		let chunkDuration = rulesContext.getRepresentationInfo().fragmentDuration;
        return SwitchRequest(context).create();
    }


    // ABR决策逻辑的核心代码2。将dash.js中可获取的metric作为输入，
    // 返回SwitchRequest对象，其中的quality即为目标码率级别。
    // function getMaxIndex(rulesContext){
    //     // implement your ABR logic
    //     // 媒体类型
    //     let mediaType = rulesContext.getMediaInfo().type;
    //     let dashMetrics = DashMetrics(context).getInstance();
    //     // 过去发送的HTTP请求
    //     let requests = dashMetrics.getHttpRequests(mediaType);

    //     // 缓冲区水平
    //     let bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType, true);

    //     logger.debug("[MultiMetricsRule][" + mediaType + "][] Checking download ratio rule... (current = " + current + ")");
    //     logger.debug("[MultiMetricsRule][" + dashMetrics + "][DownloadRatioRule] Checking download ratio rule... (current = " + current + ")");

    //     return SwitchRequest(context).create();
    // }

    instance = {
        getMaxIndex: getMaxIndex
    };

    setup();
    return instance;

}

MultiMetricsRuleClass.__dashjs_factory_name = 'MultiMetricsRule';
MultiMetricsRule = dashjs.FactoryMaker.getClassFactory(MultiMetricsRuleClass);