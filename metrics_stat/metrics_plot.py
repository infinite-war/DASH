import unicodedata
import matplotlib.pyplot as plt
import pandas as pd
import os
import re


if __name__ == "__main__":
    plt.rcParams['font.sans-serif'] = ['SimSun']  # 指定使用宋体
    plt.rcParams['axes.unicode_minus'] = False  # 用来正常显示负号

    current_directory = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_directory, 'datas/metrics.csv')

    # 读取 CSV 文件，假设第一行是列名
    df = pd.read_csv(file_path, encoding='utf-8')

    # # 获取指定列的数据，假设指定字段名为 '指定字段名'
    # specified_column = df['MaxIndex']

    # print(df)
    # # 打印指定列的数据
    # print(specified_column)


    # 获取指定列的数据，假设指定字段名为 'TimeStamp' 和 'MaxIndex'
    timestamp = df['Timestamp']
    max_index = df['MaxIndex']

    if 'Download(min|avg|max)' in df.columns:
        download_cols = df["Download(min|avg|max)"].str.split("|", expand=True)
        download_cols.columns = ["Download_min", "Download_avg", "Download_max"]
        df = pd.concat([df, download_cols], axis=1)

    # 将时间戳转换为从 00:00 开始计数的分钟数
    start_time = pd.to_datetime(timestamp).min().replace(hour=0, minute=0, second=0, microsecond=0)
    minutes_since_start = (pd.to_datetime(timestamp) - start_time).dt.total_seconds() / 60

    # 将所有时间转换为秒数，以第一个时间点为起点
    df["Timestamp"] = pd.to_datetime(df["Timestamp"])
    df["Time"] = (df["Timestamp"] - df["Timestamp"].iloc[0]).dt.total_seconds()


    replaceChPattern = r"[/:|() ]"

    # 遍历每一列，绘制折线图并保存为单独的图像文件
    for column in df.columns:
        if column != "Timestamp":
            safe_column_name = unicodedata.normalize('NFKD', column).encode('ascii', 'ignore').decode('ascii')
            # 替换文件名中的非法字符
            safe_column_name = re.sub(replaceChPattern, '_', column)

            plt.figure(figsize=(10, 6))
            plt.plot(df["Timestamp"], df[column])
            plt.xlabel('Timestamp')
            plt.ylabel(column)
            plt.title(f'{column} over Time')
            plt.grid(True)
            plt.savefig(f'./figs/metrics/{safe_column_name}_plot.png')
            plt.close()