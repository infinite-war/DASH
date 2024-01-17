import FactoryMaker from '../../../core/FactoryMaker';
import SwitchRequest from '../SwitchRequest';
import Debug from '../../../core/Debug';

// 基于丢帧历史来决定是否需要进行新的比特率切换
function DroppedFramesRule() {

    const context = this.context;
    let instance,
        logger;

    // 规定的允许丢帧的百分比阈值
    const DROPPED_PERCENTAGE_FORBID = 0.15;
    // 在此帧数之前（已渲染并计入这些索引）不应用规则
    const GOOD_SAMPLE_SIZE = 375; //Don't apply the rule until this many frames have been rendered(and counted under those indices).

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function getMaxIndex(rulesContext) {
        const switchRequest = SwitchRequest(context).create();

        // 检查rulesContext是否存在且具有getDroppedFramesHistory属性
        if (!rulesContext || !rulesContext.hasOwnProperty('getDroppedFramesHistory')) {
            return switchRequest;
        }

        // 获取丢帧历史
        const droppedFramesHistory = rulesContext.getDroppedFramesHistory();
        const streamId = rulesContext.getStreamInfo().id;

        if (droppedFramesHistory) {
            // 获取特定流的帧历史
            const dfh = droppedFramesHistory.getFrameHistory(streamId);

            if (!dfh || dfh.length === 0) {
                return switchRequest;
            }

            let droppedFrames = 0;
            let totalFrames = 0;
            let maxIndex = SwitchRequest.NO_CHANGE;

            // 从索引1开始循环（不测量零索引的丢帧）
            for (let i = 1; i < dfh.length; i++) {
                if (dfh[i]) {
                    droppedFrames = dfh[i].droppedVideoFrames;
                    totalFrames = dfh[i].totalVideoFrames;

                    // 如果已经渲染的帧数大于规定的帧数，并且丢帧比例超过阈值，则进行比特率切换
                    if (totalFrames > GOOD_SAMPLE_SIZE && droppedFrames / totalFrames > DROPPED_PERCENTAGE_FORBID) {
                        maxIndex = i - 1;
                        logger.debug('index: ' + maxIndex + ' Dropped Frames: ' + droppedFrames + ' Total Frames: ' + totalFrames);
                        break;
                    }
                }
            }
            // 创建新的SwitchRequest实例，带有切换请求的质量等级和丢帧信息
            return SwitchRequest(context).create(maxIndex, { droppedFrames: droppedFrames });
        }

        return switchRequest;
    }

    instance = {
        getMaxIndex
    };

    setup();

    return instance;
}

DroppedFramesRule.__dashjs_factory_name = 'DroppedFramesRule';
export default FactoryMaker.getClassFactory(DroppedFramesRule);
