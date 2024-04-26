# 一些记录

**官方现有的类图见\docs目录**


## 官方视频资源

https://dash.akamaized.net/


[可参考博客1](https://soo-q6.github.io/blog/2019-12-27-dashjs/)

## Core 目录

包含对象管理、日志管理、异常信息、事件信息、基础配置等功能

```bash
├── Debug.js             // 日志级别设置
├── EventBus.js   
├── FactoryMaker.js      // 工厂类，管理单例对象
├── Logger.js            
├── Settings.js          // 基础配置信息
├── Utils.js             /** 包含了各种常用函数的实用工具类，
│                         提供了一系列静态方法来处理常见的任务，
│                         包括对象混合、对象克隆、URL 处理、HTTP 头解析、
│                         UUID 生成、字符串哈希码生成、相对 URL 计算、
│                         用户代理解析等  **/
├── Version.js
├── errors               // 异常信息枚举
│   ├── Errors.js
│   └── ErrorsBase.js
└── events               // 动作类型枚举(比如打开/关闭播放器等动作)
    ├── CoreEvents.js
    ├── Events.js
    └── EventsBase.js
```


## dash目录

MPEG-DASH规范的实现

包含dash相关的实体类、解析器

```bash

├── DashAdapter.js
├── DashHandler.js                  // 重要：Dash处理器，用于处理DASH流的请求和段
├── DashMetrics.js                  // 重要：获取/修改一些播放过程中的影响因素
|                                   // (具体见549行列出的方法)
├── SegmentBaseLoader.js
├── WebmSegmentBaseLoader.js
|
├── constants   //一些常量
│   └── DashConstants.js
|
├── controllers
│   ├── ContentSteeringController.js
│   ├── RepresentationController.js
│   ├── SegmentBaseController.js
│   ├── SegmentsController.js
│   └── ServiceDescriptionController.js
|
├── models
│   ├── DashManifestModel.js
│   └── PatchManifestModel.js
|
├── parser
│   ├── DashParser.js
│   ├── maps
│   │   ├── CommonProperty.js
│   │   ├── MapNode.js
│   │   ├── RepresentationBaseValuesMap.js
│   │   └── SegmentValuesMap.js
│   ├── matchers
│   │   ├── BaseMatcher.js
│   │   ├── DateTimeMatcher.js
│   │   ├── DurationMatcher.js
│   │   ├── LangMatcher.js
│   │   ├── NumericMatcher.js
│   │   └── StringMatcher.js
│   └── objectiron.js
|
├── utils   // 工具类
│   ├── ListSegmentsGetter.js
│   ├── Round10.js    // 四舍五入相关
│   ├── SegmentBaseGetter.js
│   ├── SegmentsUtils.js
│   ├── TemplateSegmentsGetter.js
│   ├── TimelineConverter.js
│   └── TimelineSegmentsGetter.js
|
└── vo   //实体类
    ├── AdaptationSet.js
    ├── BaseURL.js
    ├── ContentSteering.js
    ├── ContentSteeringRequest.js
    ├── ContentSteeringResponse.js
    ├── DescriptorType.js
    ├── Event.js
    ├── EventStream.js
    ├── ManifestInfo.js
    ├── MediaInfo.js
    ├── Mpd.js       // MPD 文件
    ├── MpdLocation.js
    ├── PatchLocation.js
    ├── PatchOperation.js
    ├── Period.js
    ├── ProducerReferenceTime.js
    ├── Representation.js
    ├── RepresentationInfo.js
    ├── Segment.js
    ├── SimpleXPath.js
    ├── StreamInfo.js
    └── UTCTiming.js

```


## offline目录

包含


```bash


├── OfflineDownload.js
├── OfflineStream.js
├── OfflineStreamProcessor.js
├── constants
│   └── OfflineConstants.js
├── controllers
│   ├── OfflineController.js
│   └── OfflineStoreController.js
├── errors
│   └── OfflineErrors.js
├── events
│   └── OfflineEvents.js
├── index.js
├── net
│   └── IndexDBOfflineLoader.js
├── storage
│   └── IndexDBStore.js
├── utils
│   ├── OfflineIndexDBManifestParser.js
│   └── OfflineUrlUtils.js
└── vo
    └── OfflineDownloadVo.js

```


## streaming目录

流传输相关的内容，包括调度逻辑、ABR规则、系统运行逻辑、网络请求、播放器状态等


``` bash

├── FragmentLoader.js
├── FragmentSink.js
├── ManifestLoader.js
├── ManifestUpdater.js
├── MediaPlayer.js
├── MediaPlayerEvents.js
├── MediaPlayerFactory.js
├── PreBufferSink.js
├── SourceBufferSink.js
├── Stream.js
├── StreamProcessor.js
├── XlinkLoader.js
│ 
├── constants
│   ├── ConformanceViolationConstants.js
│   ├── Constants.js
│   ├── MetricsConstants.js         // 播放器相关的各个指标信息枚举
│   └── ProtectionConstants.js
│ 
├── controllers
│   ├── AbrController.js
│   ├── BaseURLController.js
│   ├── BlacklistController.js
│   ├── BufferController.js         // 缓冲区管理
│   ├── CatchupController.js
│   ├── EventController.js
│   ├── FragmentController.js
│   ├── GapController.js
│   ├── MediaController.js
│   ├── MediaSourceController.js
│   ├── PlaybackController.js
│   ├── ScheduleController.js       // 播放器调度
│   ├── StreamController.js
│   ├── TimeSyncController.js
│   └── XlinkController.js
├── metrics
│   ├── MetricsReporting.js
│   ├── MetricsReportingEvents.js
│   ├── controllers
│   │   ├── MetricsCollectionController.js
│   │   ├── MetricsController.js
│   │   ├── MetricsHandlersController.js
│   │   ├── RangeController.js
│   │   └── ReportingController.js
│   ├── metrics
│   │   ├── MetricsHandlerFactory.js
│   │   └── handlers
│   │       ├── BufferLevelHandler.js
│   │       ├── DVBErrorsHandler.js
│   │       ├── GenericMetricHandler.js
│   │       └── HttpListHandler.js
│   ├── reporting
│   │   ├── ReportingFactory.js
│   │   └── reporters
│   │       └── DVBReporting.js
│   ├── utils
│   │   ├── DVBErrorsTranslator.js
│   │   ├── HandlerHelpers.js
│   │   ├── ManifestParsing.js
│   │   ├── MetricSerialiser.js
│   │   └── RNG.js
│   └── vo
│       ├── DVBErrors.js
│       ├── Metrics.js
│       ├── Range.js
│       └── Reporting.js
├── models
│   ├── BaseURLTreeModel.js
│   ├── CmcdModel.js
│   ├── CmsdModel.js
│   ├── CustomParametersModel.js
│   ├── FragmentModel.js                // 涉及HTTP请求发送
│   ├── LowLatencyThroughputModel.js
│   ├── ManifestModel.js
│   ├── MediaPlayerModel.js             // 获取播放速率、重试间隔、缓冲时长/水平等信息
│   ├── MetricsModel.js
│   ├── URIFragmentModel.js
│   └── VideoModel.js
├── net
│   ├── FetchLoader.js
│   ├── HTTPLoader.js                   // 处理下载等请求
│   ├── SchemeLoaderFactory.js
│   ├── URLLoader.js
│   └── XHRLoader.js
├── protection
│   ├── CommonEncryption.js
│   ├── Protection.js
│   ├── ProtectionEvents.js
│   ├── controllers
│   │   ├── ProtectionController.js
│   │   └── ProtectionKeyController.js
│   ├── drm
│   │   ├── KeySystem.js
│   │   ├── KeySystemClearKey.js
│   │   ├── KeySystemPlayReady.js
│   │   ├── KeySystemW3CClearKey.js
│   │   └── KeySystemWidevine.js
│   ├── errors
│   │   └── ProtectionErrors.js
│   ├── models
│   │   ├── ProtectionModel.js
│   │   ├── ProtectionModel_01b.js
│   │   ├── ProtectionModel_21Jan2015.js
│   │   └── ProtectionModel_3Feb2014.js
│   ├── servers
│   │   ├── ClearKey.js
│   │   ├── DRMToday.js
│   │   ├── LicenseServer.js
│   │   ├── PlayReady.js
│   │   └── Widevine.js
│   └── vo
│       ├── ClearKeyKeySet.js
│       ├── KeyMessage.js
│       ├── KeyPair.js
│       ├── KeySystemAccess.js
│       ├── KeySystemConfiguration.js
│       ├── LicenseRequest.js
│       ├── LicenseRequestComplete.js
│       ├── LicenseResponse.js
│       ├── MediaCapability.js
│       ├── NeedKey.js
│       ├── ProtectionData.js
│       └── SessionToken.js
├── rules
│   ├── DroppedFramesHistory.js
│   ├── RulesContext.js
│   ├── SwitchRequest.js                //存储ABR决策结果
│   ├── SwitchRequestHistory.js         //决策结果历史记录
│   ├── ThroughputHistory.js
│   └── abr                             //已有的ABR算法
│       ├── ABRRulesCollection.js       // 管理各个ABRrules，包括确定哪些rules是生效的，
|                                       // 以及从已经生效的rule中选择“合适”的码率作为结果
│       ├── AbandonRequestsRule.js
│       ├── BolaRule.js
│       ├── DroppedFramesRule.js
│       ├── InsufficientBufferRule.js
│       ├── L2ARule.js
│       ├── SwitchHistoryRule.js
│       ├── ThroughputRule.js
│       └── lolp
│           ├── LearningAbrController.js
│           ├── LoLpQoEEvaluator.js
│           ├── LoLpRule.js
│           ├── LoLpWeightSelector.js
│           └── QoeInfo.js                  // 重要：收集、管理在播放过程中的QoE相关数据
├── text
│   ├── EmbeddedTextHtmlRender.js
│   ├── NotFragmentedTextBufferController.js
│   ├── TextController.js
│   ├── TextSourceBuffer.js
│   └── TextTracks.js
├── thumbnail
│   ├── ThumbnailController.js
│   └── ThumbnailTracks.js
├── utils
│   ├── BaseURLSelector.js
│   ├── BoxParser.js
│   ├── Capabilities.js
│   ├── CapabilitiesFilter.js
│   ├── CustomTimeRanges.js
│   ├── DOMStorage.js
│   ├── DefaultURLUtils.js
│   ├── EBMLParser.js
│   ├── ErrorHandler.js
│   ├── InitCache.js
│   ├── IsoFile.js
│   ├── LocationSelector.js
│   ├── ObjectUtils.js
│   ├── RequestModifier.js
│   ├── SegmentResponseModifier.js
│   ├── SupervisorTools.js
│   ├── TTMLParser.js
│   ├── TimeUtils.js
│   ├── URLUtils.js
│   ├── VTTParser.js
│   ├── VttCustomRenderingParser.js
│   └── baseUrlResolution
│       ├── BasicSelector.js
│       ├── ContentSteeringSelector.js
│       └── DVBSelector.js
└── vo
    ├── BitrateInfo.js
    ├── DashJSError.js
    ├── DataChunk.js
    ├── FragmentRequest.js
    ├── HeadRequest.js
    ├── IsoBox.js
    ├── IsoBoxSearchInfo.js
    ├── MetricsList.js
    ├── TextRequest.js
    ├── TextTrackInfo.js
    ├── Thumbnail.js
    ├── ThumbnailTrackInfo.js
    ├── URIFragmentData.js
    └── metrics
        ├── BufferLevel.js
        ├── BufferState.js
        ├── DVRInfo.js
        ├── DroppedFrames.js
        ├── HTTPRequest.js
        ├── ManifestUpdate.js
        ├── PlayList.js
        ├── RepresentationSwitch.js
        ├── RequestsQueue.js
        ├── SchedulingInfo.js
        └── TCPConnection.js


```




## mss目录(不重要)

包含音视频处理功能。
MicroSoft Smooth Streaming相关的代码。

```bash

├── MssFragmentInfoController.js
├── MssFragmentMoofProcessor.js
├── MssFragmentMoovProcessor.js
├── MssFragmentProcessor.js
├── MssHandler.js
├── errors
│   └── MssErrors.js
├── index.js
└── parser
    └── MssParser.js

```