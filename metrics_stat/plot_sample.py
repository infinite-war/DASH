from matplotlib import pyplot as plt
import random
from pylab import mpl

# 设置中文显示
mpl.rcParams["font.sans-serif"] = ["SimHei"]
mpl.rcParams["axes.unicode_minus"] = False

x = range(60)
y_shanghai = [random.uniform(15, 18) for i in x]
y_beijing = [random.uniform(1, 3) for i in x]

# 设置图像大小及清晰度
plt.figure(figsize=(20, 8), dpi=80)

# 绘制图像
plt.plot(x, y_shanghai, label="上海")
plt.plot(x, y_beijing, color="r", linestyle="--", label="北京")

x_ticks_label = ["11点{}分".format(i) for i in x]
y_ticks = range(40)
x_ticks = x[::5]

# 设置坐标轴刻度
plt.xticks(x_ticks, x_ticks_label[::5])
plt.yticks(y_ticks[::5])

# 设置网格
plt.grid(True, linestyle="--", alpha=1)

# 设置坐标轴含义
plt.xlabel("时间")
plt.ylabel("温度")
plt.title("中午11点到12点某城市的温度变化图", fontsize=20)

# 添加图例
plt.legend(loc="best")

# 图像保存
plt.savefig("./test.png")

# 展示图像
plt.show()
