# API 接口文档

## 基础信息

- 基础地址: `http://127.0.0.1:8000`
- 交互文档: `http://127.0.0.1:8000/docs`
- 统一响应模型:
  ```json
  {
    "code": 200,
    "msg": "",
    "data": {}
  }
  ```
- 异常处理: 服务发生异常时依然返回 HTTP 200, `code=500`, `msg` 为错误信息

## 接口列表

### 1) GET `/`

健康检查.

响应示例:
```json
{"message":"Hello World"}
```

### 2) POST `/upload/file`

上传多个 CSV 文件, 随机采样并执行 UMAP 降维.

请求:
- Content-Type: `multipart/form-data`
- 表单字段:
  - `files`: 多个 CSV 文件 (必填)
  - `lineNum`: 每个文件随机采样的行数 (int, 必填)
  - `columns`: 要删除的变量列表 (必填, 可重复传多个同名字段)

处理流程:
- 读取多个 CSV 文件
- 删除 `columns` 中指定列 (列不存在时忽略)
- 每个文件随机采样 `lineNum` 行
- UMAP 降维得到 `xColumn`, `yColumn`, 并附加 `sample`

响应 `data` 结构:
```json
{
  "xColumn": [0.12, -1.34],
  "yColumn": [2.34, 0.56],
  "sample": ["fileA.csv", "fileB.csv"]
}
```

示例:
```bash
curl -X POST "http://127.0.0.1:8000/upload/file" \
  -F "files=@/path/a.csv" \
  -F "files=@/path/b.csv" \
  -F "lineNum=1000" \
  -F "columns=FSC.H" \
  -F "columns=SSC.A"
```

### 3) POST `/select`

对输入矩阵执行 UMAP 降维, 每行前两列作为特征, 最后一列作为 `sample` 标签.

请求:
- Content-Type: `application/json`
- 请求体:
  ```json
  {
    "data": [
      ["1.0", "2.0", "S1"],
      ["3.0", "4.0", "S2"]
    ]
  }
  ```

响应 `data` 结构:
```json
{
  "xColumn": [0.12, -1.34],
  "yColumn": [2.34, 0.56],
  "sample": ["S1", "S2"]
}
```

### 4) POST `/cluster`

使用 Phenograph 聚类.

请求:
- Content-Type: `application/json`
- 请求体: 同 `/select`

响应:
- 当前实现中 `run_phenograph` 返回 `(communities, Q)` 元组, 而接口返回时调用了 `to_dict("list")`,
  可能导致异常. 建议先确认返回结构后再固化响应格式.
