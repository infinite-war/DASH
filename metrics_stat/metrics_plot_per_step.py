import unicodedata
import matplotlib.pyplot as plt
import pandas as pd
import os
import argparse
import re
import glob
import io
from openpyxl import Workbook

VIDEO = "video"
AUDIO = "audio"
RATE_COLUMN = "rate/视频码率(mbps)"

ENV1 = "env1"
ENV2 = "env2"
ENV3 = "env3"

fileList = ['MultiMetricsRule_metrics',
            'CustomBolaRule_metrics',
            'CustomThroughputRule_metrics',
            'DownloadRatioRule_metrics']

ruleName = ['MultiMetricsRule',
            'BolaRule',
            'ThroughputRule',
            'DownloadRatioRule']

envList = [ENV1, ENV2, ENV3]

def getMetricsAndPlot(fileName, filePath, step, env):

    plt.rcParams['font.sans-serif'] = ['SimSun']  # 指定使用宋体
    plt.rcParams['axes.unicode_minus'] = False  # 用来正常显示负号

    # 读取 CSV 文件，假设第一行是列名
    df = pd.read_csv(filePath, encoding='utf-8')

    curPath = os.path.dirname(os.path.abspath(__file__))
    plotDir = os.path.join(curPath, f'figs\\{fileName}_{env}_per_{str(step)}')
    if os.path.exists(plotDir):
        clearDir(plotDir)
    else:
        os.mkdir(plotDir)

    df = df[df['Type'] == 'video']

    # # 获取指定列的数据，假设指定字段名为 '指定字段名'
    # specified_column = df['MaxIndex']

    if 'Download(min|avg|max)' in df.columns:
        download_cols = df["Download(min|avg|max)"].str.split("|", expand=True)
        download_cols.columns = ["Download_min", "Download_avg", "Download_max"]
        df = pd.concat([df, download_cols], axis=1)

    # 将所有时间转换为秒数，以第一个时间点为起点
    df["Timestamp"] = pd.to_datetime(df["Timestamp"])
    df["Time"] = (df["Timestamp"] - df["Timestamp"].iloc[0]).dt.total_seconds()

    bandwidth_value = 0
    match env:
        case "env1":
            bandwidth_value = 6
        case "env2":
            bandwidth_value = 4


    replaceChPattern = r"[/:|() ]"

    # 遍历每一列，绘制折线图并保存为单独的图像文件
    for column in df.columns:
        if column not in ["Timestamp", "Time", "Type"]:
            df[column] = pd.to_numeric(df[column], errors='coerce').fillna(0)

            safe_column_name = unicodedata.normalize('NFKD', column).encode('ascii', 'ignore').decode('ascii')
            # 替换文件名中的非法字符
            safe_column_name = re.sub(replaceChPattern, '_', column)
        
            fig, ax1 = plt.subplots(figsize=(10, 6))

            if step == 0:
                ax1.plot(df["Time"], df[column], linestyle='-', label=column)
                ax1.set_title(f'{column} 变化情况')
            else:
                ax1.plot(df["Time"][::step], df[column][::step], linestyle='-', label=column)
                ax1.set_title(f'{column} 变化情况（每隔 {step} 个数据点）')

            ax1.set_xlabel('时间/s')
            ax1.set_ylabel(column)
            ax1.legend(loc=f'upper left')
            ax1.grid(True)


            if column == RATE_COLUMN:
                ax1.axhline(y=bandwidth_value, color='orange', linestyle='--', label=f'带宽 ({bandwidth_value} mbps)')
            else:
                # 右侧纵坐标
                ax2 = ax1.twinx()
                if env == ENV3:
                    ax2 = 1 ## 《================
                else:
                    ax2.axhline(y=bandwidth_value, color='orange', linestyle='--', label=f'带宽 ({bandwidth_value} mbps)')
                
                ax2.set_ylabel('带宽/mbps')
                ax2.legend(loc='upper right')

            save_path = os.path.join(plotDir, f'{safe_column_name}_plot.png')
            fig.savefig(save_path)
            plt.close(fig)


    # 统计报告
    wb = Workbook()
    ws = wb.active
    ws.title = '统计报告'
    ws.append(['统计对象', '值'])

    rate_mean = df[RATE_COLUMN].mean()
    rate_switches = (df['rateLevel'] != df['rateLevel'].shift()).sum() - 1
    summary_data = [
        ('平均码率(Mbps)', rate_mean),
        ('码率切换次数', rate_switches)
    ]
    for row in summary_data:
        ws.append(row)

    excel_buffer = io.BytesIO()
    wb.save(excel_buffer)
    excel_buffer.seek(0)
    reportPath = os.path.join(plotDir, f'report.csv')
    with open(reportPath, 'wb') as f:
        f.write(excel_buffer.getvalue())

    summary_df = pd.DataFrame(summary_data)
    summary_df.to_csv(reportPath, index=False)




def clearDir(dirPath):
    files = glob.glob(os.path.join(dirPath, "*"))
    for file in files:
        try:
            os.remove(file)
        except Exception as e:
            print(f"Error removing file: {file}. Error: {e}")




def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--step','-s',type=int, default = 0 ,help="每条记录之间间隔step条记录(默认为0)")
    # parser.add_argument('--favorite','-f',type=str, nargs="+",required=False,help="favorite of the programmer")
    args = parser.parse_args()
    step = args.step

    current_directory = os.path.dirname(os.path.abspath(__file__))
    for file in fileList:
        for env in envList:
            filePath = os.path.join(current_directory, f'datas\\{file}_{env}.csv')
            if os.path.exists(filePath):
                getMetricsAndPlot(file, filePath, step, env)


if __name__ == "__main__":
    main()

