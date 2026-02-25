# ============================================================
# Flow / CyTOF 多样本分析完整 pipeline
#
# 分析流程：
# 1. 读取多个 CSV 文件（每个文件 = 一个样本）
# 2. 每个样本随机下采样固定数量细胞
# 3. 合并所有样本
# 4. 去除不参与分析的通道
# 5. UMAP 降维
# 6. Phenograph 聚类
# 7. UMAP 可视化（按样本 / 按 cluster / 按 marker）
# 8. cluster 组成比例统计
# 9. cluster 平均表达 heatmap
# ============================================================

import os
import numpy as np
import pandas as pd

import umap                     # UMAP 降维
import phenograph               # Phenograph 聚类

import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.colors import LinearSegmentedColormap

# =========================
# CONFIG：所有可调参数集中在这里
# =========================

# CSV 文件所在目录
DATA_DIR = r"/home/zsn/data/数据"

# 输出结果目录
OUT_DIR = "output"

# 每个样本最多保留的细胞数（随机下采样）
MAX_CELLS_PER_SAMPLE = 1000

# 不参与聚类和 UMAP 的通道
# 对应流式中的散射光、时间、或你明确不想用的 marker
DROP_CHANNELS = [
    "FSC.H", "FSC.W", "SSC.A", "Time", "FSC.A",
    "CD8", "CD3", "CD4", "BV480.A"
]

# UMAP 参数（与 R 中 uwot::umap 对应）
UMAP_PARAMS = dict(
    n_neighbors=15,
    min_dist=0.001,
    target_weight=0.5,
    random_state=0      # 固定随机种子，保证可复现
)

# Phenograph 的 k 值（近邻数）
PHENOGRAPH_K = 50

# =========================
# UTILS：通用小工具
# =========================

def ensure_dir(path):
    """
    如果目录不存在，则创建目录
    """
    if not os.path.exists(path):
        os.makedirs(path)

def five_color_cmap():
    """
    构建一个五色渐变 colormap
    对应你 R 中 scale_color_gradientn 的五色方案
    """
    return LinearSegmentedColormap.from_list(
        "five_color",
        ["#cccccc", "#2727CC", "#21B088", "#D1C000", "#FF3F01"]
    )

# =========================
# LOAD & SAMPLE：读取并下采样
# =========================

def load_and_sample(data_dir, max_cells):
    """
    读取目录下所有 CSV 文件，并对每个文件进行随机下采样

    返回：
    - data : 合并后的 DataFrame（所有细胞）
    - sam  : 每个细胞对应的样本标签
    """
    files = [f for f in os.listdir(data_dir) if f.endswith(".csv")]

    data_list = []   # 存放每个样本的数据
    sam = []         # 存放每个细胞的样本名

    for f in files:
        # 读取单个样本
        df = pd.read_csv(os.path.join(data_dir, f))

        # 下采样
        n = min(max_cells, df.shape[0])
        df = df.sample(n=n, random_state=0)

        # 从文件名中解析样本名（与你 R 代码一致）
        group = f.split("_")[2]

        data_list.append(df)
        sam.extend([group] * n)

    # 合并所有样本
    data = pd.concat(data_list, ignore_index=True)
    sam = np.array(sam)

    return data, sam

# =========================
# PREPROCESS：通道筛选
# =========================

def select_channels(df, drop_channels):
    """
    删除不参与分析的通道
    """
    drop = [c for c in drop_channels if c in df.columns]
    return df.drop(columns=drop)

# =========================
# UMAP：降维
# =========================

def run_umap(data, params):
    """
    对表达矩阵进行 UMAP 降维
    """
    reducer = umap.UMAP(**params)
    emb = reducer.fit_transform(data.values)
    return pd.DataFrame(emb, columns=["x", "y"])

# =========================
# PHENOGRAPH：无监督聚类
# =========================

def run_phenograph(data, k):
    """
    Phenograph 聚类

    返回：
    - communities : 每个细胞的 cluster 编号
    - Q           : modularity，用于评估聚类质量
    """
    communities, graph, Q = phenograph.cluster(data.values, k=k)
    return communities.astype(str), Q

# =========================
# PLOTTING：各种 UMAP 可视化
# =========================

def plot_umap_category(df, color, out, size=5):
    """
    UMAP 按分类变量着色（样本 / cluster）
    """
    plt.figure(figsize=(6, 6))
    sns.scatterplot(
        data=df,
        x="x", y="y",
        hue=color,
        s=size,
        linewidth=0
    )
    plt.tight_layout()
    plt.savefig(out, dpi=150)
    plt.close()

def plot_umap_feature(df, feature, out):
    """
    UMAP 按 marker 连续表达量着色
    """
    cmap = five_color_cmap()
    plt.figure(figsize=(6, 6))
    plt.scatter(
        df["x"], df["y"],
        c=df[feature],
        cmap=cmap,
        s=5
    )
    plt.title(feature)
    plt.colorbar()
    plt.tight_layout()
    plt.savefig(out, dpi=150)
    plt.close()

def plot_cluster_heatmap(data, group, out):
    """
    计算每个 cluster 的平均表达，并绘制 heatmap
    """
    df = data.copy()
    df["group"] = group
    mean_df = df.groupby("group").mean()

    sns.clustermap(
        mean_df,
        z_score=1,     # 按列标准化
        cmap="vlag",
        figsize=(10, 8)
    )
    plt.savefig(out, dpi=150)
    plt.close()

# =========================
# STATISTICS：统计分析
# =========================

def cluster_proportion(sam, group):
    """
    计算每个样本中各 cluster 的比例（百分比）
    """
    tab = pd.crosstab(sam, group, normalize="index") * 100
    return tab.round(3)

# =========================
# MAIN PIPELINE：主流程
# =========================

def main():
    # 创建输出目录
    ensure_dir(OUT_DIR)
    fig_dir = os.path.join(OUT_DIR, "figures")
    ensure_dir(fig_dir)

    print("Loading data...")
    raw_data, sam = load_and_sample(DATA_DIR, MAX_CELLS_PER_SAMPLE)

    print("Selecting channels...")
    data = select_channels(raw_data, DROP_CHANNELS)

    print("Running UMAP...")
    umap_df = run_umap(data, UMAP_PARAMS)
    umap_df["sam"] = sam

    # 按样本上色的 UMAP
    plot_umap_category(
        umap_df,
        "sam",
        os.path.join(fig_dir, "umap_by_sample.tiff")
    )

    print("Running Phenograph...")
    group, Q = run_phenograph(data, PHENOGRAPH_K)
    print("Phenograph modularity Q =", Q)

    umap_df["group"] = group

    # 按 cluster 上色的 UMAP
    plot_umap_category(
        umap_df,
        "group",
        os.path.join(fig_dir, "umap_by_cluster.tiff")
    )

    print("Plotting feature UMAPs...")
    # 每个 marker 画一张连续色 UMAP
    for col in data.columns:
        umap_df[col] = data[col].values
        plot_umap_feature(
            umap_df,
            col,
            os.path.join(fig_dir, f"{col}_umap.tiff")
        )

    print("Calculating cluster proportions...")
    prop = cluster_proportion(sam, group)
    prop.to_csv(os.path.join(OUT_DIR, "cluster_proportion.csv"))

    print("Plotting cluster heatmap...")
    plot_cluster_heatmap(
        data,
        group,
        os.path.join(fig_dir, "cluster_heatmap.tiff")
    )

    print("Pipeline finished.")

# =========================
# ENTRY：程序入口
# =========================

if __name__ == "__main__":
    main()
