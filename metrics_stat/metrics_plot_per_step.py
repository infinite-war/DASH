import unicodedata
import matplotlib.pyplot as plt
import pandas as pd
import os
import re
import glob

def getMetricsAndPlot(fileName, filePath, step):

    plt.rcParams['font.sans-serif'] = ['SimSun']  # 指定使用宋体
    plt.rcParams['axes.unicode_minus'] = False  # 用来正常显示负号

    # 读取 CSV 文件，假设第一行是列名
    df = pd.read_csv(filePath, encoding='utf-8')

    curPath = os.path.dirname(os.path.abspath(__file__))
    plotDir = os.path.join(current_directory, 'figs\\' + fileName.rsplit('.', 1)[0] + 'per_' + str(step))
    if os.path.exists(plotDir):
        clearDir(plotDir)
    else:
        os.mkdir(plotDir)


    # # 获取指定列的数据，假设指定字段名为 '指定字段名'
    # specified_column = df['MaxIndex']

    # print(df)
    # # 打印指定列的数据
    # print(specified_column)


    # 获取指定列的数据，假设指定字段名为 'TimeStamp' 和 'MaxIndex'
    # timestamp = df['Timestamp']
    # max_index = df['MaxIndex']
    df["Timestamp"] = pd.to_datetime(df["Timestamp"])
    df["Time"] = (df["Timestamp"] - df["Timestamp"].iloc[0]).dt.total_seconds()


    if 'Download(min|avg|max)' in df.columns:
        download_cols = df["Download(min|avg|max)"].str.split("|", expand=True)
        download_cols.columns = ["Download_min", "Download_avg", "Download_max"]
        df = pd.concat([df, download_cols], axis=1)

    # 将时间戳转换为从 00:00 开始计数的分钟数
    # start_time = pd.to_datetime(timestamp).min().replace(hour=0, minute=0, second=0, microsecond=0)
    # minutes_since_start = (pd.to_datetime(timestamp) - start_time).dt.total_seconds() / 60

    # 将所有时间转换为秒数，以第一个时间点为起点
    df["Timestamp"] = pd.to_datetime(df["Timestamp"])
    df["Time"] = (df["Timestamp"] - df["Timestamp"].iloc[0]).dt.total_seconds()


    replaceChPattern = r"[/:|() ]"
    bandwidth_value = 6

    # 遍历每一列，绘制折线图并保存为单独的图像文件
    for column in df.columns:
        if column not in ["Timestamp", "Time"]:
            df[column] = pd.to_numeric(df[column], errors='coerce').fillna(0)

            safe_column_name = unicodedata.normalize('NFKD', column).encode('ascii', 'ignore').decode('ascii')
            # 替换文件名中的非法字符
            safe_column_name = re.sub(replaceChPattern, '_', column)

            # plt.figure(figsize=(10, 6))
            # # plt.plot(df["Time"], df[column])
            # plt.plot(df["Time"][::step], df[column][::step], linestyle='-', label=column)
            # plt.xlabel('时间/s')
            # plt.ylabel(column)
            # plt.title(f'{column} 变化情况')
            # plt.grid(True)

            fig, ax1 = plt.subplots(figsize=(10, 6))
            ax1.plot(df["Time"][::step], df[column][::step], linestyle='-', label=column)
            ax1.set_xlabel('时间/s')
            ax1.set_ylabel(column)
            ax1.set_title(f'{column} 变化情况（每隔 {step} 个数据点）')
            ax1.legend(loc=f'upper left')
            ax1.grid(True)

            # Create a second y-axis to the right
            ax2 = ax1.twinx()
            ax2.axhline(y=bandwidth_value, color='orange', linestyle='--', label='带宽 (6 Mbps)')
            ax2.set_ylabel('带宽/Mbps')
            ax2.legend(loc='upper right')

            # plt.savefig(plotDir + f'/{safe_column_name}_plot.png')
            # plt.close()
            save_path = os.path.join(plotDir, f'{safe_column_name}_plot.png')
            fig.savefig(save_path)
            plt.close(fig)


def clearDir(dirPath):
    files = glob.glob(os.path.join(dirPath, "*"))
    for file in files:
        try:
            os.remove(file)
        except Exception as e:
            print(f"Error removing file: {file}. Error: {e}")


fileList = ['MultiMetricsRule_metrics.csv', 
            'BolaRule_metrics.csv', 
            'ThroughputRule_metrics.csv']

if __name__ == "__main__":
    step = 5

    current_directory = os.path.dirname(os.path.abspath(__file__))
    for file in fileList:
        filePath = os.path.join(current_directory, 'datas\\' + file)
        if os.path.exists(filePath):
            getMetricsAndPlot(file, filePath, step)

