import unicodedata
import matplotlib.pyplot as plt
import pandas as pd
import os
import numpy as np
import argparse
import re
import glob
import io
from openpyxl import Workbook

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

colorList = ['blue', 'green', 'red', 'black']
markerList = ['v', '.', 'x', '+']

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


    bandwidth_value = 0
    match env:
        case "env1":
            bandwidth_value = 6
        case "env2":
            bandwidth_value = 4


    replaceChPattern = r"[/:|() ]"

    timeLen = 1e9
    index = -1
    for i in range(len(dfList)):
        if len(dfList[i]) < timeLen:
            timeLen = len(dfList[i])
            index = i

    for i in range(len(dfList)):
        if len(dfList[i]) > timeLen:
            dfList[i].drop(index=dfList[i].tail(len(dfList[i]) - timeLen).index, inplace=True)

    wave_pattern = generate_wave_pattern(dfList[index], low_value=2, high_value=6, switch_interval=60)


    # 遍历每一列，绘制折线图并保存为单独的图像文件
    for column in dfList[0].columns:
        if column in [RATE_COLUMN, BUFFER_LEVEL]:
            columnName = column.split('/')[-1]
            
            for i in range(len(dfList)):
                dfList[i][column] = pd.to_numeric(dfList[i][column], errors='coerce').fillna(0)

            safe_column_name = unicodedata.normalize('NFKD', column).encode('ascii', 'ignore').decode('ascii')
            # 替换文件名中的非法字符
            safe_column_name = re.sub(replaceChPattern, '_', column)
        
            fig, ax1 = plt.subplots(figsize=(8, 4))

            if step == 0:
                for i in range(len(dfList)):
                    ax1.plot(dfList[index]["Time"], dfList[i][column], linestyle='-', 
                             marker = markerList[i], label=ruleName[i], color = colorList[i])
                # ax1.set_title(f'{columnName}变化情况')
            else:
                for i in range(len(dfList)):
                    ax1.plot(dfList[index]["Time"][::step], dfList[i][column][::step], linestyle='-', 
                            marker = markerList[i], label=ruleName[i], color = colorList[i])
                # ax1.set_title(f'{columnName}变化情况(每隔{step}个数据点)')

            ax1.set_xlabel('时间/s')
            ax1.set_ylabel(column_data_map[column])
            ax1.grid(True)

            if column == RATE_COLUMN:
                ax1.set_ylabel("视频码率|带宽(mbps)")
                if env == ENV3:
                    if step == 0:
                        ax1.plot(dfList[index]["Time"], wave_pattern, color='orange', linestyle='--', label=f'带宽(mbps)')
                    else:
                        ax1.plot(dfList[index]["Time"][::step], wave_pattern[::step], color='orange', linestyle='--', label=f'带宽(mbps)')
                else:
                    ax1.axhline(y=bandwidth_value, color='orange', linestyle='--', label=f'带宽(mbps)')
                
                handles1, labels1 = ax1.get_legend_handles_labels()
                plt.legend(handles1, labels1, bbox_to_anchor=(0.0, 1.02, 1.0, 0.102),
                           loc='upper left', ncol=len(labels1), frameon=True)
            
            else:
                # 右侧纵坐标
                ax2 = ax1.twinx()
                if env == ENV3:
                    if step == 0:
                        ax2.plot(dfList[index]["Time"], wave_pattern, color='orange', linestyle='--', label=f'带宽(mbps)')
                    else:
                        ax2.plot(dfList[index]["Time"][::step], wave_pattern[::step], color='orange', linestyle='--', label=f'带宽(mbps)')
                else:
                    ax2.axhline(y=bandwidth_value, color='orange', linestyle='--', label=f'带宽(mbps)')
                
                ax2.set_ylabel(BANDWIDTH_AIX)
                handles1, labels1 = ax1.get_legend_handles_labels()
                handles2, labels2 = ax2.get_legend_handles_labels()
                combined_handles = handles1 + handles2
                combined_labels = labels1 + labels2
                # plt.legend(combined_handles, combined_labels, loc=0)
                plt.legend(combined_handles, combined_labels, bbox_to_anchor=(0.0, 1.02, 1.0, 0.102),
                           loc='upper left', ncol=len(combined_labels), frameon=True)


            save_path = ""
            if step == 0:
                save_path = os.path.join(plotDir, f'{columnName}变化情况.png')
            else:
                save_path = os.path.join(plotDir, f'{columnName}变化情况(每隔{step}个数据点).png')
            fig.savefig(save_path)
            plt.close(fig)



def clearDir(dirPath):
    files = glob.glob(os.path.join(dirPath, "*"))
    for file in files:
        try:
            os.remove(file)
        except Exception as e:
            print(f"Error removing file: {file}. Error: {e}")

def generate_wave_pattern(df, low_value=2, high_value=6, switch_interval=60):
    time = df["Time"]
    wave_pattern = np.where((time // switch_interval) % 2 == 0, low_value, high_value)
    return wave_pattern


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--step','-s',type=int, default = 0 ,help="每条记录之间间隔step条记录(默认为0)")
    # parser.add_argument('--favorite','-f',type=str, nargs="+",required=False,help="favorite of the programmer")
    args = parser.parse_args()
    step = args.step

    current_directory = os.path.dirname(os.path.abspath(__file__))

    for env in envList:
        for file in fileList:
            flag = True
            filePath = os.path.join(current_directory, f'datas\\{file}_{env}.csv')
            if os.path.exists(filePath) == False:
                flag = False
                break
        if flag == True:
            compareAndPlot(step, env)

    
        


if __name__ == "__main__":
    main()

