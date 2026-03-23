from contextlib import asynccontextmanager
import os
import shutil
import tempfile
from datetime import datetime
from urllib.parse import unquote
import numpy as np

import umap      # UMAP 降维
import time
from fastapi import FastAPI, File, Form, HTTPException
from typing import List
from fastapi import UploadFile
from fastapi import Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi import Body
from model.RequestModel import SelectionRequest
from model.ResponseModel import ResponseModel
import service.reduction as reduction
import pandas
import flowkit as fk
from sklearn.preprocessing import StandardScaler
from fastapi.middleware.cors import CORSMiddleware
try:
    from scipy.cluster.hierarchy import linkage, dendrogram
    SCIPY_AVAILABLE = True
except Exception:
    linkage = None
    dendrogram = None
    SCIPY_AVAILABLE = False


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源进行跨域请求
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有 HTTP 方法
    allow_headers=["*"],  # 允许所有请求头
)
# UMAP 参数（与 R 中 uwot::umap 对应）
UMAP_PARAMS = dict(
    n_neighbors=15,
    min_dist=0.001,
    target_weight=0.5,
    verbose=True,
    n_jobs=-1,
    low_memory=False  # 内存受限时开启

    # random_state=0  # 固定随机种子，保证可复现
)

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "storage")
os.makedirs(STORAGE_DIR, exist_ok=True)
ALLOWED_EXTENSIONS = {".csv", ".txt", ".fcs"}


def _safe_basename(name: str) -> str:
    safe_name = os.path.basename((name or "").strip())
    if not safe_name:
        raise HTTPException(status_code=400, detail="文件名无效")
    return safe_name


def _resolve_storage_path(name: str) -> str:
    safe_name = _safe_basename(name)
    path = os.path.join(STORAGE_DIR, safe_name)
    normalized = os.path.normpath(path)
    if not normalized.startswith(os.path.normpath(STORAGE_DIR)):
        raise HTTPException(status_code=400, detail="非法文件路径")
    return normalized


def _unique_path(path: str) -> str:
    if not os.path.exists(path):
        return path
    base, ext = os.path.splitext(path)
    index = 1
    while True:
        candidate = f"{base}_{index}{ext}"
        if not os.path.exists(candidate):
            return candidate
        index += 1


def _file_info(path: str) -> dict:
    stat = os.stat(path)
    return {
        "name": os.path.basename(path),
        "size": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
    }


def _list_storage_files() -> list[dict]:
    files = []
    for entry in os.scandir(STORAGE_DIR):
        if entry.is_file():
            files.append(_file_info(entry.path))
    files.sort(key=lambda item: item["modified"], reverse=True)
    return files

def _scale_matrix(df: pandas.DataFrame, scale: str) -> pandas.DataFrame:
    scale = (scale or "none").lower()
    if scale == "column":
        mean = df.mean(axis=0)
        std = df.std(axis=0, ddof=0).replace(0, 1.0)
        return (df - mean) / std
    if scale == "row":
        mean = df.mean(axis=1)
        std = df.std(axis=1, ddof=0).replace(0, 1.0)
        return df.sub(mean, axis=0).div(std, axis=0)
    if scale in ("none", "no", "false"):
        return df
    raise ValueError(f"Unsupported scale: {scale}")


def _compute_roe_matrix(count_df: pandas.DataFrame) -> tuple[pandas.DataFrame, pandas.DataFrame]:
    total_cells = float(count_df.to_numpy().sum())
    if total_cells <= 0:
        raise ValueError("ROE 计算失败：计数矩阵为空")

    expected_prop = count_df.sum(axis=0) / total_cells
    row_totals = count_df.sum(axis=1).replace(0, np.nan)
    observed_prop = count_df.div(row_totals, axis=0)

    safe_expected = expected_prop.replace(0, np.nan)
    roe_df = observed_prop.div(safe_expected, axis=1)
    roe_df = roe_df.replace([np.inf, -np.inf], np.nan)

    # 与 R 版 log2(roe_matrix) 一致：无效值记为 0 便于前端绘图
    log2_roe_df = np.log2(roe_df.where(roe_df > 0))
    log2_roe_df = log2_roe_df.replace([np.inf, -np.inf], np.nan).fillna(0.0)

    return roe_df.fillna(0.0), log2_roe_df


def _flat_tree(labels: List[str]) -> dict:
    return {"name": "root", "children": [{"name": str(label)} for label in labels]}


def _linkage_to_tree(linkage_matrix: np.ndarray, labels: List[str]) -> dict:
    node_map = {}
    leaf_count = len(labels)

    def _node_for(idx: int) -> dict:
        if idx < leaf_count:
            return {"name": str(labels[idx])}
        return node_map[idx]

    for i, row in enumerate(linkage_matrix):
        left = int(row[0])
        right = int(row[1])
        dist = float(row[2])
        node = {
            "name": f"cluster{leaf_count + i}",
            "distance": dist,
            "children": [_node_for(left), _node_for(right)],
        }
        node_map[leaf_count + i] = node

    root = node_map[leaf_count + len(linkage_matrix) - 1]
    root = dict(root)
    root["name"] = "root"
    return root


def _tree_and_order(values: np.ndarray, labels: List[str], metric: str, method: str) -> tuple[dict, List[int]]:
    if not SCIPY_AVAILABLE or len(labels) < 2:
        return _flat_tree(labels), list(range(len(labels)))
    linkage_matrix = linkage(values, method=method, metric=metric)
    order = dendrogram(linkage_matrix, no_plot=True)["leaves"]
    return _linkage_to_tree(linkage_matrix, labels), order


def _normalize_comp_matrix(df: pandas.DataFrame) -> pandas.DataFrame:
    df = df.copy()
    df.columns = [str(c).split(' :: ')[0].strip() for c in df.columns]
    df.index = [str(i).split(' :: ')[0].strip() for i in df.index]
    return df


def _flatten_flow_columns(columns: List[object]) -> List[str]:
    flattened = []
    for col in columns:
        if isinstance(col, tuple) and len(col) >= 2:
            pnn_name, pns_label = col[0], col[1]
        else:
            pnn_name, pns_label = col, ""
        clean_name = (
            pns_label
            if pandas.notna(pns_label) and str(pns_label).strip() != ""
            else pnn_name
        )
        flattened.append(str(clean_name))
    return flattened


def _load_comp_matrix(csv_path: str) -> tuple[fk.Matrix, set]:
    temp_df = pandas.read_csv(csv_path, index_col=0)
    temp_df = _normalize_comp_matrix(temp_df)
    comp_matrix = fk.Matrix(temp_df.values, list(temp_df.columns), "CompMatrix")
    detectors = set(temp_df.columns)
    return comp_matrix, detectors


def _process_flow_file(fcs_path: str, comp_matrix: fk.Matrix, detectors: set, cofactor: float) -> pandas.DataFrame:
    sample = fk.Sample(fcs_path)
    sample.apply_compensation(comp_matrix)
    df_comp = sample.as_dataframe(source="comp")
    df_transformed = df_comp.copy()
    for col in df_transformed.columns:
        pnn_name = col[0] if isinstance(col, tuple) else col
        if pnn_name in detectors:
            df_transformed[col] = np.arcsinh(df_transformed[col] / cofactor)

    df_transformed.columns = _flatten_flow_columns(list(df_transformed.columns))
    return df_transformed


def _save_text_to_storage(filename: str, content: str) -> dict:
    safe_name = _safe_basename(filename)
    path = _resolve_storage_path(safe_name)
    path = _unique_path(path)
    with open(path, "w", encoding="utf-8") as handler:
        handler.write(content)
    return _file_info(path)


def _load_file_metadata(name: str, limit: int) -> dict:
    path = _resolve_storage_path(name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"文件不存在: {name}")
    stat = os.stat(path)
    df = pandas.read_csv(path, nrows=limit if limit > 0 else None)
    columns = list(df.columns)
    numeric_columns = []
    for col in columns:
        series = pandas.to_numeric(df[col], errors="coerce")
        if series.notna().any():
            numeric_columns.append(col)
    return {
        "name": name,
        "size": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "columns": columns,
        "numericColumns": numeric_columns,
    }

# 2. 定义生命周期钩子：在服务器启动时预热 UMAP
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # --- 启动时预热 ---
#     print("正在预热 UMAP 引擎 (JIT 编译)...")
#     try:
#         # 使用 30x16 的随机数据进行模拟运行
#         dummy_data = np.random.rand(30, 16).astype(np.float32)
#         warmup_reducer = umap.UMAP(n_neighbors=5, n_epochs=5)
#         warmup_reducer.fit_transform(dummy_data)
#         print("UMAP 引擎预热完成，首次请求将无延迟。")
#     except Exception as e:
#         print(f"预热提醒: {e}")
#     yield
#     # --- 关闭时清理 ---
#     print("服务正在关闭...")


@app.get("/")
async def root():
    return {"message": "Hello World","time": str(time.ctime())}


@app.get("/files")
async def list_files():
    return ResponseModel(code=200, data={"files": _list_storage_files()})


@app.post("/files/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="请上传文件")
    saved = []
    invalid = []
    for upload in files:
        filename = upload.filename or ""
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            invalid.append(filename or "未知文件")
            continue
        safe_name = _safe_basename(filename)
        target_path = _resolve_storage_path(safe_name)
        with open(target_path, "wb") as handler:
            shutil.copyfileobj(upload.file, handler)
        saved.append(_file_info(target_path))

    if invalid:
        raise HTTPException(status_code=400, detail=f"不支持的文件类型: {', '.join(invalid)}")
    return ResponseModel(code=200, data={"files": saved})


@app.delete("/files/{filename}")
async def delete_file(filename: str):
    safe_name = unquote(filename or "")
    path = _resolve_storage_path(safe_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="文件不存在")
    os.remove(path)
    return ResponseModel(code=200, data={"name": os.path.basename(path)})


@app.get("/files/download/{filename}")
async def download_file(filename: str):
    safe_name = unquote(filename or "")
    path = _resolve_storage_path(safe_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="文件不存在")

    def file_iterator():
        with open(path, "rb") as file_handle:
            yield from file_handle

    response = StreamingResponse(file_iterator(), media_type="application/octet-stream")
    response.headers["Content-Disposition"] = f'attachment; filename="{os.path.basename(path)}"'
    return response


@app.post("/files/metadata")
async def files_metadata(payload: dict = Body(...)):
    names = payload.get("names") or payload.get("files") or []
    if isinstance(names, str):
        names = [names]
    limit = int(payload.get("limit", 500))
    if not names:
        raise HTTPException(status_code=400, detail="请提供文件名列表")
    metadata = [_load_file_metadata(name, limit) for name in names]
    return ResponseModel(code=200, data={"files": metadata})


@app.get("/files/metadata/all")
async def files_metadata_all(limit: int = 500):
    files = _list_storage_files()
    metadata = [_load_file_metadata(item["name"], limit) for item in files]
    return ResponseModel(code=200, data={"files": metadata})


@app.post("/upload/file")
async def upload_file(
    files: List[UploadFile] = File(None),  # 接收多个文件
    lineNum: int = Form(0),                # 接收数字类型的表单字段，默认为0表示读取所有行
    columns: List[str] = Form(...),        # 接收多个 columns 参数
    fileNames: List[str] = Form(None),
    filterColumns: List[str] = Form(None),      # 筛选列名列表
    filterOperators: List[str] = Form(None),    # 筛选操作符列表
    filterValues: List[str] = Form(None),       # 筛选值列表
):
    sources = []
    if fileNames:
        for name in fileNames:
            path = _resolve_storage_path(name)
            if not os.path.exists(path):
                raise HTTPException(status_code=404, detail=f"文件不存在: {name}")
            sources.append(path)
    elif files:
        sources = files
    else:
        raise HTTPException(status_code=400, detail="请提供文件或文件名")

    # 构建筛选条件
    filters = None
    if filterColumns and filterOperators and filterValues:
        filters = []
        for i in range(len(filterColumns)):
            if i < len(filterOperators) and i < len(filterValues):
                filters.append({
                    "column": filterColumns[i],
                    "operator": filterOperators[i],
                    "value": filterValues[i]
                })

    sample_data, sample_all, sam = reduction.load_and_sample(
        sources,
        lineNum,
        columns,
        return_all=True,
        filters=filters,
    )

    umap_df = reduction.run_umap(sample_data, UMAP_PARAMS)
    umap_df["sample"] = sam
    umap_df = pandas.concat([umap_df, sample_all.reset_index(drop=True)], axis=1)

    return ResponseModel(
        code=200,
        data=umap_df.to_dict("list"),
    )


@app.post("/upload/xy")
async def upload_xy(
    files: List[UploadFile] = File(None),
    lineNum: int = Form(0),  # 默认为0表示读取所有行
    xColumn: str = Form(...),
    yColumn: str = Form(...),
    fileNames: List[str] = Form(None),
    filterColumns: List[str] = Form(None),      # 筛选列名列表
    filterOperators: List[str] = Form(None),    # 筛选操作符列表
    filterValues: List[str] = Form(None),       # 筛选值列表
):
    sources = []
    if fileNames:
        for name in fileNames:
            path = _resolve_storage_path(name)
            if not os.path.exists(path):
                raise HTTPException(status_code=404, detail=f"文件不存在: {name}")
            sources.append(path)
    elif files:
        sources = files
    else:
        raise HTTPException(status_code=400, detail="请提供文件或文件名")

    # 构建筛选条件
    filters = None
    if filterColumns and filterOperators and filterValues:
        filters = []
        for i in range(len(filterColumns)):
            if i < len(filterOperators) and i < len(filterValues):
                filters.append({
                    "column": filterColumns[i],
                    "operator": filterOperators[i],
                    "value": filterValues[i]
                })

    sample_data, sam = reduction.load_and_sample_xy(sources, lineNum, xColumn, yColumn, filters=filters)
    sample_data = sample_data.reset_index(drop=True)
    x_values = pandas.to_numeric(sample_data[xColumn], errors="coerce")
    y_values = pandas.to_numeric(sample_data[yColumn], errors="coerce")
    extra_data = sample_data.drop(columns=[xColumn, yColumn], errors="ignore")

    result = pandas.concat(
        [
            pandas.DataFrame({"xColumn": x_values, "yColumn": y_values}),
            pandas.Series(sam, name="sample"),
            extra_data.reset_index(drop=True),
        ],
        axis=1,
    )

    return ResponseModel(
        code=200,
        data=result.to_dict("list"),
    )


@app.post("/upload/flow/merge")
async def upload_flow_merge(
    files: List[UploadFile] = File(...),
    cofactor: float = Form(...),
):
    if not files:
        raise HTTPException(status_code=400, detail="请上传 CSV 与 FCS 文件")

    csv_files = [f for f in files if f.filename and f.filename.lower().endswith(".csv")]
    fcs_files = [f for f in files if f.filename and f.filename.lower().endswith(".fcs")]
    invalid_files = [
        f for f in files if not (f.filename or "").lower().endswith((".csv", ".fcs"))
    ]

    if invalid_files:
        invalid_names = ", ".join([f.filename for f in invalid_files])
        raise HTTPException(status_code=400, detail=f"不支持的文件类型: {invalid_names}")
    if not csv_files:
        raise HTTPException(status_code=400, detail="未检测到 CSV 文件")
    if not fcs_files:
        raise HTTPException(status_code=400, detail="未检测到 FCS 文件")
    if len(csv_files) != 1:
        raise HTTPException(status_code=400, detail="请只上传 1 个 CSV 文件")

    if cofactor is None or cofactor <= 0:
        raise HTTPException(status_code=400, detail="COFACTOR 必须大于 0")

    csv_file = csv_files[0]
    csv_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp_csv:
            csv_path = tmp_csv.name
            tmp_csv.write(await csv_file.read())

        comp_matrix, detectors = _load_comp_matrix(csv_path)
        payload_files = []

        for fcs_file in fcs_files:
            if not fcs_file.filename:
                continue
            with tempfile.NamedTemporaryFile(delete=False, suffix=".fcs") as tmp_fcs:
                fcs_path = tmp_fcs.name
                tmp_fcs.write(await fcs_file.read())

            df_transformed = _process_flow_file(fcs_path, comp_matrix, detectors, cofactor)
            csv_text = df_transformed.to_csv(index=False)

            base_name = os.path.basename(fcs_file.filename)
            stem = os.path.splitext(base_name)[0]
            output_name = f"{stem}.csv"
            output_info = _save_text_to_storage(output_name, csv_text)
            payload_files.append(output_info)

            if fcs_path and os.path.exists(fcs_path):
                try:
                    os.remove(fcs_path)
                except Exception:
                    pass

        if not payload_files:
            raise HTTPException(status_code=400, detail="未生成任何结果文件")

        return ResponseModel(
            code=200,
            data={"files": payload_files},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"数据导入失败: {exc}")
    finally:
        if csv_path and os.path.exists(csv_path):
            try:
                os.remove(csv_path)
            except Exception:
                pass


@app.post("/select")
async def select(payload: dict = Body(...)):
    selected_columns = payload.get("selectedColumns") or payload.get("dimensions") or []
    if isinstance(selected_columns, str):
        selected_columns = [selected_columns]
    meta_list_keys = {"selectedColumns", "dimensions"}
    list_payload = {
        key: value
        for key, value in payload.items()
        if isinstance(value, list) and key not in meta_list_keys
    }

    df_all = pandas.DataFrame(list_payload)
    meta_columns = {"sample", "source", "file", "sourceId"}
    if selected_columns:
        include_columns = [
            col for col in selected_columns if col in df_all.columns and col not in meta_columns
        ]
        df_main = df_all[include_columns] if include_columns else pandas.DataFrame()
    else:
        df_main = df_all.drop(columns=list(meta_columns), errors="ignore")

    if df_main.empty or df_main.shape[1] == 0:
        raise ValueError("可用于降维的列为空，请检查所选维度")

    df_main = df_main.apply(lambda col: pandas.to_numeric(col, errors="coerce"))
    df_main = df_main.dropna(axis=1, how="all")
    if df_main.empty or df_main.shape[1] == 0:
        raise ValueError("降维列均为非数值或空值")

    # 【新增】对高维特征进行 Z-Score 标准化，消除量纲差异
    scaler = StandardScaler()
    scaled_values = scaler.fit_transform(df_main)
    df_scaled = pandas.DataFrame(scaled_values, columns=df_main.columns, index=df_main.index)

    # 用标准化后的数据跑 UMAP
    umap_data = reduction.run_umap(df_scaled, UMAP_PARAMS)
    df_all = df_all.drop(columns=["xColumn", "yColumn"], errors="ignore")
    result = pandas.concat([umap_data, df_all.reset_index(drop=True)], axis=1)

    return ResponseModel(
        code=200,
        data=result.to_dict("list"),
    )


@app.post("/cluster")
async def cluster(payload: List[List[str]] = Body(...)):
    # 1. 提取原始嵌套列表
    raw_data = payload or []
    if not raw_data:
        raise HTTPException(status_code=400, detail="payload 为空")

    main_parts = [row[:2] for row in raw_data]
    df_main = pandas.DataFrame(main_parts, columns=["xColumn", "yColumn"])
    df_main = df_main.apply(pandas.to_numeric, errors="coerce").dropna(how="any")
    if df_main.empty:
        raise ValueError("聚类输入为空或包含非数值数据")

    phenograph, Q = reduction.run_phenograph(df_main)
    phenograph = pandas.DataFrame(phenograph, columns=["cluster"])

    df_all = pandas.concat([df_main.reset_index(drop=True), phenograph], axis=1)
    return  ResponseModel(
        code=200,
        data=df_all.to_dict("list"),
    )


@app.post("/heatmap/cluster-tree/points")
async def heatmap_cluster_tree_points(payload: dict = Body(...)):
    points = payload.get("points") or []
    if not points:
        raise ValueError("points 为必填字段")

    phenograph_k = int(payload.get("phenographK", payload.get("k", 20)))
    resolution = float(payload.get("resolution", 1.0))
    n_iterations = int(payload.get("n_iterations", 20))
    seed = int(payload.get("seed", 123))
    drop_columns = payload.get("dropColumns") or []
    keep_xy = bool(payload.get("keepXY", False))
    drop_after_agg = payload.get("dropAfterAgg") or []
    scale = payload.get("scale", "column")
    row_metric = payload.get("rowMetric", "euclidean")
    col_metric = payload.get("colMetric", "euclidean")
    linkage_method = payload.get("linkageMethod", "complete")

    df = pandas.DataFrame(points)
    default_drop = {
        "id",
        "xColumn",
        "yColumn",
        "sample",
        "source",
        "sourceId",
        "cluster",
    }
    if not keep_xy:
        default_drop.update({"x", "y"})
    df = df.drop(columns=list(default_drop.union(set(drop_columns))), errors="ignore")

    data = df.apply(pandas.to_numeric, errors="coerce")
    data = data.dropna(axis=1, how="all").fillna(0.0)
    if data.shape[1] == 0:
        raise ValueError("可用于聚类的数值列为空")

    communities, _q = reduction.run_phenograph(
        data,
        k=phenograph_k,
        resolution=resolution,
        n_iterations=n_iterations,
        seed=seed,
    )
    data["group"] = communities
    point_groups = communities.tolist()
    mean_df = data.groupby("group").mean()

    if drop_after_agg:
        mean_df = mean_df.drop(columns=drop_after_agg, errors="ignore")

    mean_df = _scale_matrix(mean_df, scale)

    row_labels = [str(label) for label in mean_df.index]
    col_labels = [str(label) for label in mean_df.columns]

    row_tree, row_order = _tree_and_order(mean_df.values, row_labels, row_metric, linkage_method)
    col_tree, col_order = _tree_and_order(mean_df.values.T, col_labels, col_metric, linkage_method)

    if row_order:
        mean_df = mean_df.iloc[row_order]
    if col_order:
        mean_df = mean_df.iloc[:, col_order]

    heatmap = {
        "rows": [str(label) for label in mean_df.index],
        "cols": [str(label) for label in mean_df.columns],
        "values": mean_df.values.tolist(),
    }

    return ResponseModel(
        code=200,
        data={
            "heatmap": heatmap,
            "rowTree": row_tree,
            "colTree": col_tree,
            "pointGroups": point_groups,
        },
    )


@app.post("/heatmap/roe/points")
async def heatmap_roe_points(payload: dict = Body(...)):
    points = payload.get("points") or []
    if not points:
        raise ValueError("points 为必填字段")

    df = pandas.DataFrame(points)
    if df.empty:
        raise ValueError("points 为空，无法生成 ROE 热图")

    cluster_candidates = payload.get("clusterFields") or ["group", "cluster"]
    source_candidates = payload.get("sourceFields") or ["source", "sourceId", "sample"]

    cluster_field = next((field for field in cluster_candidates if field in df.columns), None)
    source_field = next((field for field in source_candidates if field in df.columns), None)
    if not cluster_field:
        raise ValueError("缺少聚类字段，需包含 group 或 cluster")
    if not source_field:
        raise ValueError("缺少来源字段，需包含 source/sourceId/sample")

    cluster_values = df[cluster_field].fillna("未分组").astype(str)
    source_values = df[source_field].fillna("未知来源").astype(str)
    count_df = pandas.crosstab(cluster_values, source_values)
    if count_df.empty:
        raise ValueError("无法从当前数据构建 ROE 计数矩阵")

    row_order = payload.get("rowOrder") or []
    col_order = payload.get("colOrder") or []
    if row_order:
        ordered_rows = [str(item) for item in row_order if str(item) in count_df.index]
        remaining_rows = [item for item in count_df.index if item not in ordered_rows]
        count_df = count_df.reindex(index=ordered_rows + remaining_rows)
    if col_order:
        ordered_cols = [str(item) for item in col_order if str(item) in count_df.columns]
        remaining_cols = [item for item in count_df.columns if item not in ordered_cols]
        count_df = count_df.reindex(columns=ordered_cols + remaining_cols)

    roe_df, log2_roe_df = _compute_roe_matrix(count_df)
    roe_df = roe_df.applymap(lambda x: float(f"{x:.4g}"))
    log2_roe_df = log2_roe_df.round(4)

    return ResponseModel(
        code=200,
        data={
            "heatmap": {
                "rows": [str(label) for label in log2_roe_df.index],
                "cols": [str(label) for label in log2_roe_df.columns],
                "values": log2_roe_df.values.tolist(),
            },
            "roeValues": roe_df.values.tolist(),
            "countMatrix": count_df.values.tolist(),
        },
    )




@app.exception_handler(Exception)
async def http_exception_handler(request: Request, exc: Exception):
    exc_message = str(exc) if exc.args else "有一个未知错误发生"
    payload = ResponseModel(
        code=500,
        msg=exc_message,
    )
    content = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    return JSONResponse(
        status_code=500,
        content=content
    )
