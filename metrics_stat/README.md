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


# TODO

[-] 编写判断相关数据文件是否存在的逻辑，比如想要画3中算法的数据结果图，那么主程序里依次判断对应的`csv`文件是否存在，如果存在就绘图否则跳过。图可能比较多，绘图时记得在`figs\metrics`目录下另起一个目录。

[-] 添加ABR切换方法


# TODO

[-] 编写判断相关数据文件是否存在的逻辑，比如想要画3中算法的数据结果图，那么主程序里依次判断对应的`csv`文件是否存在，如果存在就绘图否则跳过。图可能比较多，绘图时记得在`figs\metrics`目录下另起一个目录。

[-] 添加ABR切换方法

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




<<<<<<< HEAD
<<<<<<< HEAD

## MISC
## MISC

### 自动生成`requirements.txt`
### 自动生成`requirements.txt`

```bash
pip install pipreqs
pipreqs <项目根目录> --encoding=utf-8 --force
```


## 参考

[matplotlib](matplotlib库文档)

[几个python画图模板](https://www.cnblogs.com/dengfaheng/p/12670150.html)
=======
```
>>>>>>> parent of 4adce097 (补充注释)
=======
```
>>>>>>> parent of 4adce097 (补充注释)
