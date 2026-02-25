# FastAPIProject 技术文档

本文档描述 FastAPIProject 的整体架构、依赖、数据流程与 API 细节，便于维护与扩展。

## 项目概述

FastAPIProject 是一个面向流式细胞术/CyTOF 单细胞数据分析的后端服务，提供：
- UMAP 降维
- Phenograph 聚类
- 热图数据与层次聚类树输出（D3 可视化友好）

## 目录结构

- `main.py`：FastAPI 应用入口与所有 API 路由
- `service/reduction.py`：采样、UMAP、Phenograph 核心算法封装
- `model/ResponseModel.py`：统一响应体定义
- `model/RequestModel.py`：请求模型（当前未被路由使用）
- `README.md`：简要使用说明
- `requirements.txt`：依赖列表
- `test.py`：离线分析管线样例（非 API）

## 运行与部署

```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

默认访问地址：`http://localhost:8000`

## 依赖说明

必须依赖：
- `fastapi`
- `uvicorn`
- `python-multipart`
- `pandas`
- `numpy`
- `umap-learn`
- `phenograph`

可选依赖：
- `scipy`：用于层次聚类树计算。未安装时退化为“平铺树”。

## 全局约定

### 通用响应格式

```json
{
  "code": 200,
  "msg": "",
  "data": {}
}
```

### 错误处理

所有异常都会被全局异常处理捕获并返回 HTTP 200，
但响应体 `code=500`，`msg` 为异常文本。

## 核心流程说明

### 1. 数据采样与合并

`service/reduction.py` 的 `load_and_sample`：
- 读取多 CSV 文件
- 对每个文件按 `lineNum` 随机采样（`random_state=42`）
- 删除指定列 `columns`
- 返回合并后的 DataFrame 与样本名数组

### 2. UMAP 降维

使用 `umap-learn`，参数定义在 `main.py`：
- `n_neighbors=15`
- `min_dist=0.001`
- `target_weight=0.5`
- `n_jobs=-1`
- `low_memory=False`

注意：默认未设置 `random_state`，结果不可重复。

### 3. Phenograph 聚类

使用 `phenograph.cluster`：
- `/cluster` 默认 `k=20`
- `/heatmap/cluster-tree` 和 `/heatmap/cluster-tree/points` 支持传入 `phenographK`

### 4. 热图与聚类树

流程：
1. 聚类得到 group
2. 按 group 求均值矩阵
3. 按行/列标准化（可选）
4. 行/列层次聚类（SciPy 或退化为平铺树）

树结构为 D3 可视化可用的嵌套对象。

## API 说明

### GET `/`

健康检查接口，返回时间。

响应示例：
```json
{
  "message": "Hello World",
  "time": "Mon Jan 15 10:00:00 2024"
}
```

### POST `/upload/file`

多文件采样 + UMAP 降维。

请求：`multipart/form-data`
- `files`: 多个 CSV 文件（必填）
- `lineNum`: 每文件采样行数（必填）
- `columns`: 需删除的列（必填，至少一次）

输出字段：
- `xColumn`, `yColumn`: UMAP 坐标
- `sample`: 样本名（来自文件名）
- 其余列：原始特征列

### POST `/select`

对前端传入二维点执行 UMAP，再拼回其他字段。

请求：`application/json`
- `xColumn`: 数组
- `yColumn`: 数组
- 其他字段原样返回

说明：
- `xColumn` 和 `yColumn` 必须同时存在且长度相同
- 会尝试转换为数值，无法转换则变为 NaN

### POST `/cluster`

对嵌套数组前两列做 Phenograph 聚类。

请求：`application/json`
```json
[
  ["1.2", "0.5", "extra"],
  ["0.8", "-1.2", "extra"]
]
```

输出字段：
- `xColumn`, `yColumn`: 原始前两列
- `cluster`: 聚类标签（字符串）

### POST `/heatmap/cluster-tree`

从 CSV 文件生成热图与行/列聚类树。

请求：`multipart/form-data`
- `files`（必填）
- `lineNum`（必填）
- `columns`：聚类前删除列（可选）
- `phenographK`：默认 50
- `dropAfterAgg`：聚类后删除列（可选）
- `scale`: `column` / `row` / `none`（默认 `column`）
- `rowMetric` / `colMetric`：默认 `euclidean`
- `linkageMethod`：默认 `complete`

输出结构：
- `heatmap`：`rows`, `cols`, `values`
- `rowTree`、`colTree`：层次聚类树

### POST `/heatmap/cluster-tree/points`

从前端点数据生成热图与聚类树。

请求：`application/json`
- `points`：数组对象（必填）
- `phenographK`, `dropColumns`, `dropAfterAgg`, `scale`, `rowMetric`,
  `colMetric`, `linkageMethod`

默认剔除字段：
`id`, `x`, `y`, `xColumn`, `yColumn`, `sample`, `source`,
`sourceId`, `cluster`

若可用数值列为空，则返回错误。

## 已知限制与注意事项

- 全局异常返回 HTTP 200，前端必须检查 `code` 字段。
- `columns` 在 `/upload/file` 中为必填字段，即便无需删除也需传参。
- 未引入 `scipy` 时聚类树会退化为平铺结构。

## 与 projectR 原型流程对照

下表给出 FastAPIProject 与 `projectR` 的核心流程对应关系，便于确认一致性与差异。

| FastAPIProject | projectR |
| --- | --- |
| `service/reduction.py` `load_and_sample()` 读取 CSV + 采样 | `flow1.R` 读取 `数据/*.csv` + `sample()` |
| `main.py` `UMAP_PARAMS` + `run_umap()` | `flow1.R` `uwot::umap(...)` |
| `/upload/file` 生成 UMAP 点 | `flow1.R` 初次 UMAP 绘图 |
| `/select` 在前端选择点后再 UMAP | `flow1.R` `CellSelector(p)` 手动选择子集 |
| `run_phenograph(k=50)` | `flow2.R` `Rphenograph(data3, k=50)` |
| `groupby("group").mean()` | `aggregate(dat2, by=list(dat2$group), mean)` |
| `_scale_matrix(..., "column")` | `pheatmap(..., scale="column")` |
| `_tree_and_order()`（需 SciPy） | `pheatmap` 默认行/列层次聚类 |
| `/heatmap/cluster-tree` / `/heatmap/cluster-tree/points` | `flow2.R` 生成热图聚类树 |

差异说明：
- `/heatmap/cluster-tree/points` 更接近 R 原型中“手动框选后再聚类”的路径；`/heatmap/cluster-tree` 则是直接基于采样数据聚类。
- 若未安装 `scipy`，FastAPI 返回平铺树，与 `pheatmap` 的层次树不完全一致。


### 