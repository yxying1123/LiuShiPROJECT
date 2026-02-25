# FastAPIProject

基于 FastAPI 的流式细胞术/CyTOF 单细胞数据分析服务，提供 UMAP 降维、Phenograph 聚类，以及热图聚类树数据输出，供前端（如 D3）可视化使用。

## 运行

```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

服务地址：`http://localhost:8000`

## 通用响应格式

所有接口返回 `ResponseModel`：

```json
{
  "code": 200,
  "msg": "",
  "data": {}
}
```

## 接口说明

### GET /

功能：健康检查，返回当前时间。

输出示例：
```json
{
  "message": "Hello World",
  "time": "Mon Jan 15 10:00:00 2024"
}
```

### POST /upload/file

功能：多 CSV 文件采样并进行 UMAP 降维，返回 UMAP 坐标 + 样本标签 + 原始特征列。

请求：`multipart/form-data`
- `files`: 多个 CSV 文件
- `lineNum`: 每个文件随机采样行数 (int)
- `columns`: 需要删除的变量列表 (可重复传参)

输出数据字段：
- `xColumn`, `yColumn`: UMAP 坐标
- `sample`: 样本名（来自文件名）
- 其余列：原始特征列

示例（curl）：
```bash
curl -X POST http://localhost:8000/upload/file \
  -F "files=@sample1.csv" \
  -F "files=@sample2.csv" \
  -F "lineNum=1000" \
  -F "columns=Time" \
  -F "columns=FSC.A"
```

### POST /select

功能：对前端传入的二维数组（x/y）执行 UMAP 降维，并拼接其余字段。

请求：`application/json`
- `xColumn`: 数组（长度 N）
- `yColumn`: 数组（长度 N）
- 其他字段：会原样返回

输入示例：
```json
{
  "xColumn": [1.2, 0.5, -0.3],
  "yColumn": [0.7, -1.1, 0.9],
  "sample": ["s1", "s2", "s3"]
}
```

输出说明：
- 返回的 `xColumn`, `yColumn` 是新的 UMAP 坐标
- 其他字段保留

### POST /cluster

功能：对嵌套数组前两列做 Phenograph 聚类。

请求：`application/json`
- payload: `List[List[str]]`
- 每行取前两列作为聚类输入

输入示例：
```json
[
  ["1.2", "0.5", "extra"],
  ["0.8", "-1.2", "extra"],
  ["-0.6", "0.3", "extra"]
]
```

输出数据字段：
- `xColumn`, `yColumn`: 原始前两列
- `cluster`: 聚类编号（字符串）

### POST /heatmap/cluster-tree

功能：对应 `flow1.R` + `flow2.R` 的后端化流程：采样 → Phenograph 聚类 → 按 cluster 求均值 → 按列标准化 → 行/列层次聚类树 → 输出 D3 可用结构。

请求：`multipart/form-data`
- `files`: 多个 CSV 文件（与 `flow1.R` 输入一致）
- `lineNum`: 每个文件随机采样行数 (int)
- `columns`: 聚类前剔除变量列表（如 `Time`、`FSC.A`）
- `phenographK`: Phenograph 的 k 值（默认 50）
- `dropAfterAgg`: 按 cluster 求均值后再剔除的变量（如 `Time`）
- `scale`: 标准化方式（`column`/`row`/`none`，默认 `column`）
- `rowMetric`: 行聚类距离度量（默认 `euclidean`）
- `colMetric`: 列聚类距离度量（默认 `euclidean`）
- `linkageMethod`: 连接方式（默认 `complete`）

输出数据结构示例：
```json
{
  "heatmap": {
    "rows": ["geneA", "geneB", "geneC"],
    "cols": ["sample1", "sample2", "sample3"],
    "values": [
      [1.2, 0.5, -0.3],
      [0.8, -1.2, 0.9],
      [-0.6, 0.3, 1.8]
    ]
  },
  "rowTree": {
    "name": "root",
    "children": [
      {
        "name": "cluster1",
        "distance": 0.3,
        "children": [
          { "name": "geneA" },
          { "name": "geneB" }
        ]
      },
      { "name": "geneC" }
    ]
  },
  "colTree": {
    "name": "root",
    "children": [
      { "name": "sample1" },
      {
        "name": "cluster2",
        "children": [
          { "name": "sample2" },
          { "name": "sample3" }
        ]
      }
    ]
  }
}
```

备注：该接口在服务端使用 SciPy 计算层次聚类树；若运行环境未安装 SciPy，将退化为“平铺树”结构（仅叶子节点）。
