var BolaRule;


function CustomThroughputRuleClass() {

    let factory = dashjs.FactoryMaker;
    let SwitchRequest = factory.getClassFactoryByName('SwitchRequest');
    let MetricsModel = factory.getSingletonFactoryByName('MetricsModel');
	let DashMetrics = factory.getSingletonFactoryByName('DashMetrics');

    let Debug = factory.getSingletonFactoryByName('Debug');

    let context = this.context;
    let instance,
        logger;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }
	
	//获取字节长度
	function getBytesLength(request) {
        return request.trace.reduce((a, b) => a + b.b[0], 0);
    }
    
    function getMaxIndex(rulesContext) {
	
    }

    instance = {
        getMaxIndex: getMaxIndex
    };

    setup();

    return instance;
}

BolaRuleClass.__dashjs_factory_name = 'BolaRule';
BolaRule = dashjs.FactoryMaker.getClassFactory(BolaRuleClass);
