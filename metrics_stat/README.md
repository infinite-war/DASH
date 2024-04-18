# README

统计、处理dash-if-reference-player中产生的各种数据，包括但不限于
- Timestamp
- BufferLength/缓冲区长度
- MaxIndex
- DroppedFrames/删除的帧
- LiveLatency/延迟
- PlaybackRate/媒体播放速率
- Download(min|avg|max)
- Latency(min|avg|max)
- Ratio(min|avg|max)
- Etp/估计吞吐量(kpbs)
- Mtp/实际吞吐量(kpbs)

通过播放器页面的'export'页面导出相关的`csv`文件并放入`datas`目录

结构
```bash
├── README.md
├── datas                   数据目录
│   └── metrics.csv
├── figs
│   └── metrics             因素值统计图
├── metrics_plot.py         读取因素值并作图
├── requirements.txt
└── utils.py




```