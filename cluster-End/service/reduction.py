import os
import pandas
import pandas as pd
import numpy as np
from typing import List, Dict, Union

import umap                     # UMAP 降维
import igraph as ig
import leidenalg
from sklearn.neighbors import NearestNeighbors
from scipy.sparse import lil_matrix
from fastapi import UploadFile


def _read_csv_from_source(source: Union[UploadFile, str]) -> tuple[pd.DataFrame, str]:
    if isinstance(source, UploadFile):
        df = pd.read_csv(source.file)
        name = source.filename or "unknown"
        return df, name
    df = pd.read_csv(source)
    name = os.path.basename(source)
    return df, name




def load_and_sample(
    files: List[Union[UploadFile, str]],
    lineNum: int,
    columns: List[str],
    return_all: bool = False,
):
    """
    从多个上传的文件中读取数据，随机采样指定行数，保留指定列并合并。

    参数：
    files (List[UploadFile]): 一个包含多个上传文件的列表。每个文件都是一个 UploadFile 对象。
    lineNum (int): 每个文件中需要随机采样的行数。如果 <= 0，则读取所有行。
    columns (List[str]): 一个包含变量的列表，指定需要参与降维的列。
    return_all (bool): 是否额外返回包含所有列的采样数据。

    返回：
    pandas.DataFrame: 一个合并后的 DataFrame，包含所有文件的采样数据（仅数值列）。
    """
    data_list = []  # 存放每个样本的降维数据
    full_list = []  # 存放每个样本的完整数据
    sam = []  # 存放每个细胞的样本名
    selected_columns = [col for col in (columns or []) if col]

    for file in files:
        df, group = _read_csv_from_source(file)

        if selected_columns:
            reduction_cols = [col for col in selected_columns if col in df.columns]
            if not reduction_cols:
                continue
            df_reduction = df[reduction_cols].copy()
        else:
            df_reduction = df.copy()

        df_reduction = df_reduction.apply(pd.to_numeric, errors="coerce")
        df_reduction = df_reduction.dropna(axis=1, how="all")
        if df_reduction.shape[1] == 0:
            continue

        # 当 lineNum <= 0 时，读取所有行
        if lineNum <= 0:
            n = df_reduction.shape[0]
            sampled_reduction = df_reduction.reset_index(drop=True)
            sampled_full = df.reset_index(drop=True)
        else:
            n = min(lineNum, df_reduction.shape[0])
            if n <= 0:
                continue
            sampled_idx = df_reduction.sample(n=n, random_state=42).index
            sampled_reduction = df_reduction.loc[sampled_idx].reset_index(drop=True)
            sampled_full = df.loc[sampled_idx].reset_index(drop=True)

        sam.extend([group] * n)
        data_list.append(sampled_reduction)
        full_list.append(sampled_full)

    if not data_list:
        raise ValueError("所选列在文件中不存在或均为非数值列")

    final_df = pd.concat(data_list, ignore_index=True)
    sam = np.array(sam)

    if return_all:
        full_df = pd.concat(full_list, ignore_index=True)
        return final_df, full_df, sam
    return final_df, sam


def load_and_sample_xy(files: List[Union[UploadFile, str]], lineNum: int, x_column: str, y_column: str):
    """
    从多个上传的文件中读取数据，随机采样指定行数，保留指定的 X/Y 列及其余字段并合并。
    当 lineNum <= 0 时，不进行采样，返回所有数据。
    """
    data_list = []
    sam = []

    for file in files:
        df, group = _read_csv_from_source(file)
        if x_column not in df.columns or y_column not in df.columns:
            continue

        # 当 lineNum <= 0 时，不进行采样，使用全部数据
        if lineNum <= 0:
            sampled_df = df
            n = df.shape[0]
        else:
            n = min(lineNum, df.shape[0])
            sampled_df = df.sample(n=n, random_state=42)

        sam.extend([group] * n)
        data_list.append(sampled_df)

    if not data_list:
        raise ValueError("所选列在文件中不存在或文件为空")

    final_df = pd.concat(data_list, ignore_index=True)
    sam = np.array(sam)
    return final_df, sam


def run_umap(data:pd.DataFrame, params:dict[str, int | float | bool]):
    """
    对表达矩阵进行 UMAP 降维
    """
    reducer = umap.UMAP(**params)
    emb = reducer.fit_transform(data.values)
    return pd.DataFrame(emb, columns=["xColumn", "yColumn"])



def run_phenograph(data, k=20, resolution=3.0, n_iterations=20, seed=123):
    """
    KNN 图 + Leiden 聚类

    返回：
    - communities : 每个细胞的 cluster 编号
    - Q           : partition 质量指标（Leiden）
    """
    n_samples = data.shape[0]
    if n_samples <= 2:
        communities = np.array([0] * n_samples, dtype=int)
        return communities, 0.0

    effective_k = min(int(k), n_samples - 1)
    n_neighbors = effective_k + 1  # 包含自身，后续剔除

    nbrs = NearestNeighbors(n_neighbors=n_neighbors, algorithm="ball_tree").fit(data.values)
    _, indices = nbrs.kneighbors(data.values)
    indices = indices[:, 1:]  # 排除自身

    adj_matrix = lil_matrix((n_samples, n_samples), dtype=int)
    for i in range(n_samples):
        adj_matrix[i, indices[i]] = 1
    adj_matrix = adj_matrix.tocsr()

    # 构建对称邻接矩阵：确保如果 i->j 存在，则 j->i 也存在
    adj_matrix_sym = adj_matrix.maximum(adj_matrix.T)
    adj_matrix_sym = adj_matrix_sym.tocoo()

    edges = np.column_stack([adj_matrix_sym.row, adj_matrix_sym.col])
    edges = np.unique(np.sort(edges, axis=1), axis=0)
    g = ig.Graph(n=n_samples, edges=edges.tolist(), directed=False)

    partition = leidenalg.find_partition(
        g,
        leidenalg.RBConfigurationVertexPartition,
        resolution_parameter=resolution,
        n_iterations=n_iterations,
        seed=seed,
    )

    communities = np.array(partition.membership, dtype=str)
    q_value = float(partition.quality())
    return communities, q_value
