import os

def clearMetricsFigs():
    # 指定目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    dir = os.path.join(current_dir, 'figs/metrics')

    # 遍历目录下的所有文件
    for filename in os.listdir(dir):
        # 检查文件是否以.png为后缀
        if filename.endswith(".png"):
            # 构建文件的完整路径
            filepath = os.path.join(dir, filename)
            # 删除文件
            os.remove(filepath)

    print("All .png files in the directory have been deleted.")


if __name__ == "__main__":
    clearMetricsFigs()