import glob
import os
import numpy as np
import pandas as pd

VIDEO = "video"
AUDIO = "audio"
RATE_COLUMN = "rate/视频码率(mbps)"
BUFFER_LEVEL = "BufferLength/缓冲区长度"
BANDWIDTH_AIX = "带宽(mbps)"

column_data_map = {BUFFER_LEVEL: "缓冲区视频内容时长(s)", RATE_COLUMN: "视频码率(mbps)"}

ENV1 = "env1"
ENV2 = "env2"
ENV3 = "env3"

fileList = ['MultiMetricsRule_metrics',
            'CustomBolaRule_metrics',
            'DownloadRatioRule_metrics']

ruleName = ['MultiMetricsRule',
            'BolaRule',
            'DownloadRatioRule']

envList = [ENV1, ENV2, ENV3]


# Weighting factors (These should be adjusted based on user preferences)

avg_quality_weight = 0.15
quality_variation_weight = 0.3
switch_times_weight = 0.3
rebuffering_weight = 0.3
startup_delay_weight = 0.01

# Calculate the QoE
# def calculate_qoe(video_bitrates, buffer_occupancy, bandwidth_capacity, download_times, startup_delay, lambda_weight, mu, mu_s):
def calculate_qoe(filePath):
    
    df = pd.read_csv(filePath, encoding='utf-8')
    df = df[df['Type'] == 'video']

    v = np.array(df[RATE_COLUMN])  # Average per-chunk quality (assuming bitrate directly relates to quality)
    buf = np.array(df[BUFFER_LEVEL])

    # 视频总偏移量
    quality_variation = np.abs(np.diff(v)).sum()

    # 切换次数
    switch_times = (df['rateLevel'] != df['rateLevel'].shift()).sum() - 1

    # 卡顿时长
    rebuffering = np.where(buf == 0, 1, 0).sum()

    startup_delay = 0

    # QoE calculation
    qoe = avg_quality_weight * sum(v)   \
        - quality_variation_weight * quality_variation  \
        - switch_times_weight *  \
        - rebuffering_weight * rebuffering  \
        - startup_delay_weight * startup_delay \

    return qoe



if __name__ == "__main__":
    current_directory = os.path.dirname(os.path.abspath(__file__))
       
    for file in fileList:
        for env in envList:
            flag = True
            filePath = os.path.join(current_directory, f'datas\\{file}_{env}.csv')
            if os.path.exists(filePath) == True:
                qoe = calculate_qoe(filePath)
                print(f"{file}_{env}_qoe = {qoe}")

    # qoe = calculate_qoe(video_bitrates, buffer_occupancy, bandwidth_capacity, download_times, startup_delay, lambda_weight, mu, mu_s)
    # print(f"Calculated QoE: {qoe}")




def compareAndPlot(step, env):

    plt.rcParams['font.sans-serif'] = ['SimSun']  # 指定使用宋体
    plt.rcParams['axes.unicode_minus'] = False  # 用来正常显示负号

    curPath = os.path.dirname(os.path.abspath(__file__))

    filePathList = []
    dfList = []
    for file in fileList:
        p = os.path.join(curPath, f'datas\\{file}_{env}.csv')
        filePathList.append(p)
        dfList.append(pd.read_csv(p, encoding='utf-8'))
        # df = df[df['Type'] == 'video']
        dfList[-1] = dfList[-1][dfList[-1]['Type'] == 'video']

    
    plotDir = os.path.join(curPath, f'figs\\compare_{env}_per_{str(step)}')
    if os.path.exists(plotDir):
        clearDir(plotDir)
    else:
        os.mkdir(plotDir)

    for i in range(len(dfList)):
        dfList[i]["Timestamp"] = pd.to_datetime(dfList[i]["Timestamp"])
        dfList[i]["Time"] = (dfList[i]["Timestamp"] - dfList[i]["Timestamp"].iloc[0]).dt.total_seconds()


    timeLen = 1e9
    index = -1
    for i in range(len(dfList)):
        if len(dfList[i]) < timeLen:
            timeLen = len(dfList[i])
            index = i

    for i in range(len(dfList)):
        if len(dfList[i]) > timeLen:
            dfList[i].drop(index=dfList[i].tail(len(dfList[i]) - timeLen).index, inplace=True)





def clearDir(dirPath):
    files = glob.glob(os.path.join(dirPath, "*"))
    for file in files:
        try:
            os.remove(file)
        except Exception as e:
            print(f"Error removing file: {file}. Error: {e}")
