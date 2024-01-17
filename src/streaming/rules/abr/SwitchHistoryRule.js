
import FactoryMaker from '../../../core/FactoryMaker';
import Debug from '../../../core/Debug';
import SwitchRequest from '../SwitchRequest';

// 基于过去的切换历史来决定是否需要进行新的比特率切换
function SwitchHistoryRule() {

    const context = this.context;

    let instance,
        logger;

    //MAX_SWITCH is the number of drops made. It doesn't consider the size of the drop.
    // MAX_SWITCH是切换请求的最大比例，表示切换的比例不能超过这个值
    const MAX_SWITCH = 0.075;
    
    //Before this number of switch requests(no switch or actual), don't apply the rule.
    //must be < SwitchRequestHistory SWITCH_REQUEST_HISTORY_DEPTH to enable rule
    // 在此数量的切换请求之前（无论是切换还是实际的切换）不应用此规则
    // 必须小于SwitchRequestHistory SWITCH_REQUEST_HISTORY_DEPTH以启用规则
    const SAMPLE_SIZE = 6;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function getMaxIndex(rulesContext) {
        // 获取切换请求历史
        const switchRequestHistory = rulesContext ? rulesContext.getSwitchHistory() : null;
        const switchRequests = switchRequestHistory ? switchRequestHistory.getSwitchRequests() : [];
        let drops = 0;
        let noDrops = 0;
        let dropSize = 0;
        const switchRequest = SwitchRequest(context).create();

        // 遍历切换请求历史
        for (let i = 0; i < switchRequests.length; i++) {
            if (switchRequests[i] !== undefined) {
                drops += switchRequests[i].drops;
                noDrops += switchRequests[i].noDrops;
                dropSize += switchRequests[i].dropSize;
                // 如果已经达到样本大小，并且切换比例超过了阈值，则进行比特率切换
                if (drops + noDrops >= SAMPLE_SIZE && (drops / noDrops > MAX_SWITCH)) {
                    // 设置切换请求的质量等级
                    switchRequest.quality = (i > 0 && switchRequests[i].drops > 0) ? i - 1 : i;
                    // 设置切换请求的原因
                    switchRequest.reason = {index: switchRequest.quality, drops: drops, noDrops: noDrops, dropSize: dropSize};
                    logger.debug('Switch history rule index: ' + switchRequest.quality + ' samples: ' + (drops + noDrops) + ' drops: ' + drops);
                    break;
                }
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


SwitchHistoryRule.__dashjs_factory_name = 'SwitchHistoryRule';
export default FactoryMaker.getClassFactory(SwitchHistoryRule);
