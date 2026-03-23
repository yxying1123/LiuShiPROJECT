import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { parseCSVFile, extractNumericColumns } from '../utils/dataParser';
import { requestApi } from '../utils/apiClient';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [datasets, setDatasets] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [allColumns, setAllColumns] = useState([]);
  const [numericColumns, setNumericColumns] = useState([]);
  const [selectedX, setSelectedX] = useState('');
  const [selectedY, setSelectedY] = useState('');
  const [scatterMode, setScatterMode] = useState('reduction');
  const [scatterAxisX, setScatterAxisX] = useState('');
  const [scatterAxisY, setScatterAxisY] = useState('');
  const [scatterSelectedColumns, setScatterSelectedColumns] = useState([]);
  const [scatterSelectedSources, setScatterSelectedSources] = useState([]);
  const [scatterRowLimitInput, setScatterRowLimitInput] = useState('');
  const [scatterColorField, setScatterColorField] = useState('');
  const [scatterData, setScatterData] = useState([]);
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [scatterHistory, setScatterHistory] = useState([]);
  const [scatterFuture, setScatterFuture] = useState([]);
  const [analysisFlow, setAnalysisFlow] = useState([]);
  const [analysisFlowFuture, setAnalysisFlowFuture] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClusterLoading, setIsClusterLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [clusterData, setClusterData] = useState([]);
  const [showCluster, setShowCluster] = useState(false);
  const [clusterResults, setClusterResults] = useState([]);
  const [rowLimit, setRowLimit] = useState(1000);
  const [analysisResetToken, setAnalysisResetToken] = useState(0);
  const [heatmapPayload, setHeatmapPayload] = useState(null);

  // 使用 refs 跟踪最新状态，供异步回调使用
  const scatterDataRef = useRef(scatterData);
  const selectedPointsRef = useRef(selectedPoints);
  const showClusterRef = useRef(showCluster);
  const scatterHistoryRef = useRef(scatterHistory);
  const scatterFutureRef = useRef(scatterFuture);

  useEffect(() => { scatterDataRef.current = scatterData; }, [scatterData]);
  useEffect(() => { selectedPointsRef.current = selectedPoints; }, [selectedPoints]);
  useEffect(() => { showClusterRef.current = showCluster; }, [showCluster]);
  useEffect(() => { scatterHistoryRef.current = scatterHistory; }, [scatterHistory]);
  useEffect(() => { scatterFutureRef.current = scatterFuture; }, [scatterFuture]);

  const isLocalFileObject = useCallback((file) => {
    if (typeof File === 'undefined') return false;
    return file instanceof File;
  }, []);

  const hasClusterLabels = useCallback(
    (points) =>
      Array.isArray(points) &&
      points.some((point) => point?.group !== undefined || point?.cluster !== undefined),
    []
  );

  const mergeClusterLabels = useCallback(
    (points, sourcePoints) => {
      if (!Array.isArray(points) || points.length === 0) return [];
      if (!Array.isArray(sourcePoints) || sourcePoints.length === 0) return points;
      if (!hasClusterLabels(sourcePoints)) return points;
      return points.map((point, index) => {
        const sourcePoint = sourcePoints[index];
        if (!sourcePoint) return point;
        const groupValue = sourcePoint.group ?? sourcePoint.cluster;
        const clusterValue = sourcePoint.cluster;
        if (groupValue === undefined && clusterValue === undefined) return point;
        return {
          ...point,
          group: groupValue ?? point.group,
          cluster: clusterValue ?? point.cluster,
        };
      });
    },
    [hasClusterLabels]
  );

  const resetAnalysis = useCallback(() => {
    setSelectedX('');
    setSelectedY('');
    setScatterMode('reduction');
    setScatterAxisX('');
    setScatterAxisY('');
    setScatterSelectedColumns([]);
    setScatterSelectedSources([]);
    setScatterRowLimitInput('');
    setScatterColorField('');
    setScatterData([]);
    setSelectedPoints([]);
    setScatterHistory([]);
    setScatterFuture([]);
    setAnalysisFlow([]);
    setAnalysisFlowFuture([]);
    setClusterData([]);
    setShowCluster(false);
    setHeatmapPayload(null);
  }, [scatterData, selectedPoints]);

  const startNewAnalysis = useCallback(() => {
    resetAnalysis();
    setError('');
    setWarning('');
    setAnalysisResetToken((prev) => prev + 1);
  }, [resetAnalysis]);

  const parseFiles = useCallback(async (files, limit, shouldReset = true) => {
    setError('');
    setWarning('');

    try {
      if (!files || files.length === 0) {
        setDatasets([]);
        setAllColumns([]);
        setNumericColumns([]);
        resetAnalysis();
        return;
      }

      const parsed = await Promise.all(
        files.map(async (file, index) => {
          const data = await parseCSVFile(file);
          const rowCount = data.length;
          const limitedData = rowCount > limit ? data.slice(0, limit) : data;
          const numericCols = extractNumericColumns(limitedData);
          return {
            id: index,
            name: file.name,
            data: limitedData,
            numericColumns: numericCols,
            rowCount,
          };
        })
      );

      setDatasets(parsed);

      const columnsSet = new Set();
      const allColumnsSet = new Set();
      parsed.forEach((dataset) => {
        const firstRow = dataset.data?.[0] || {};
        Object.keys(firstRow).forEach((column) => allColumnsSet.add(column));
        dataset.numericColumns.forEach((column) => columnsSet.add(column));
      });
      setAllColumns(Array.from(allColumnsSet));
      const numericCols = Array.from(columnsSet);
      setNumericColumns(numericCols);

      if (numericCols.length < 2) {
        setError('文件需要至少包含两个数值列才能创建散点图');
      }

      if (shouldReset) {
        resetAnalysis();
      }
    } catch (err) {
      setError(err.message);
    }
  }, [resetAnalysis]);

  const applyAnalysisMetadata = useCallback(
    (metadata, selectedNames) => {
      const names = Array.isArray(selectedNames) ? selectedNames.filter(Boolean) : [];
      if (names.length === 0) {
        setUploadedFiles([]);
        setDatasets([]);
        setAllColumns([]);
        setNumericColumns([]);
        resetAnalysis();
        return;
      }
      const nameSet = new Set(names);
      const filtered = (metadata || []).filter((item) => nameSet.has(item.name));
      setUploadedFiles(filtered.map((item) => ({ name: item.name })));
      const nextDatasets = filtered.map((item, index) => ({
        id: index,
        name: item.name,
        data: [],
        numericColumns: item.numericColumns || [],
        columns: item.columns || [],
        rowCount: 0,
      }));
      setDatasets(nextDatasets);
      const allColumnsSet = new Set();
      const numericSet = new Set();
      nextDatasets.forEach((dataset) => {
        (dataset.columns || []).forEach((column) => allColumnsSet.add(column));
        (dataset.numericColumns || []).forEach((column) => numericSet.add(column));
      });
      setAllColumns(Array.from(allColumnsSet));
      setNumericColumns(Array.from(numericSet));
      resetAnalysis();
    },
    [resetAnalysis]
  );

  const loadAnalysisFiles = useCallback(
    async (fileNames, limitOverride) => {
      const names = Array.isArray(fileNames) ? fileNames.filter(Boolean) : [];
      setIsLoading(true);
      setError('');
      setWarning('');
      try {
        if (names.length === 0) {
          setUploadedFiles([]);
          setDatasets([]);
          setAllColumns([]);
          setNumericColumns([]);
          resetAnalysis();
          return;
        }
        const limit = typeof limitOverride === 'number' ? limitOverride : rowLimit;
        const response = await requestApi('/files/metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names, limit }),
        });
        const metadata = response?.files || [];
        setUploadedFiles(names.map((name) => ({ name })));
        const nextDatasets = metadata.map((item, index) => ({
          id: index,
          name: item.name,
          data: [],
          numericColumns: item.numericColumns || [],
          columns: item.columns || [],
          rowCount: 0,
        }));
        setDatasets(nextDatasets);

        const allColumnsSet = new Set();
        const numericSet = new Set();
        nextDatasets.forEach((dataset) => {
          (dataset.columns || []).forEach((column) => allColumnsSet.add(column));
          (dataset.numericColumns || []).forEach((column) => numericSet.add(column));
        });
        setAllColumns(Array.from(allColumnsSet));
        setNumericColumns(Array.from(numericSet));
        resetAnalysis();
      } catch (err) {
        setError(err.message || '获取文件列信息失败');
      } finally {
        setIsLoading(false);
      }
    },
    [resetAnalysis, rowLimit]
  );

  const handleFilesChange = useCallback(
    async (files) => {
      const incomingFiles = files || [];
      setUploadedFiles(incomingFiles);
      setIsLoading(true);
      setError('');
      setWarning('');
      try {
        if (!incomingFiles || incomingFiles.length === 0) {
          setDatasets([]);
          setAllColumns([]);
          setNumericColumns([]);
          resetAnalysis();
          return;
        }
        const formData = new FormData();
        incomingFiles.forEach((file) => formData.append('files', file));
        await requestApi('/files/upload', {
          method: 'POST',
          body: formData,
        });
        await parseFiles(incomingFiles, rowLimit, true);
      } catch (err) {
        setError(err.message || '文件上传失败');
      } finally {
        setIsLoading(false);
      }
    },
    [parseFiles, resetAnalysis, rowLimit]
  );

  useEffect(() => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    if (!uploadedFiles.some((file) => isLocalFileObject(file))) return;
    const refresh = async () => {
      setIsLoading(true);
      await parseFiles(uploadedFiles, rowLimit, false);
      setIsLoading(false);
    };
    refresh();
  }, [rowLimit, parseFiles, uploadedFiles, isLocalFileObject]);

  const handleColumnChange = (xColumn, yColumn) => {
    setSelectedX(xColumn);
    setSelectedY(yColumn);
    setScatterAxisX(xColumn);
    setScatterAxisY(yColumn);
    setError('');
    setWarning('');
    if (xColumn && yColumn) {
      const skippedFiles = datasets
        .filter(
          (dataset) =>
            !dataset.numericColumns.includes(xColumn) || !dataset.numericColumns.includes(yColumn)
        )
        .map((dataset) => dataset.name);
      if (skippedFiles.length > 0) {
        setWarning(`以下文件缺少所选列，可能影响结果: ${skippedFiles.join(', ')}`);
      }
    }
    setScatterData([]);
    setSelectedPoints([]);
    setClusterData([]);
    setHeatmapPayload(null);
    setShowCluster(false);
  };

  const handleScatterAxisChange = useCallback(
    (xColumn, yColumn) => {
      setScatterAxisX(xColumn);
      setScatterAxisY(yColumn);
      setError('');
      setWarning('');
      if (xColumn && yColumn) {
        const skippedFiles = datasets
          .filter(
            (dataset) =>
              !dataset.numericColumns.includes(xColumn) || !dataset.numericColumns.includes(yColumn)
          )
          .map((dataset) => dataset.name);
        if (skippedFiles.length > 0) {
          setWarning(`以下文件缺少所选列，可能影响结果: ${skippedFiles.join(', ')}`);
        }
      }
      setScatterData([]);
      setSelectedPoints([]);
      setClusterData([]);
      setHeatmapPayload(null);
      setShowCluster(false);
    },
    [datasets]
  );

  useEffect(() => {
    setScatterData([]);
    setSelectedPoints([]);
    setClusterData([]);
    setHeatmapPayload(null);
    setShowCluster(false);
    setScatterHistory([]);
    setScatterFuture([]);
    setError('');
    setWarning('');
  }, [scatterMode]);

  const snapshotScatterState = useCallback((snapshotData = null) => {
    // 使用传入的数据或 ref 中的当前数据
    const dataToSave = snapshotData || scatterDataRef.current;
    console.log('[snapshot] saving state, points count:', dataToSave?.length);
    if (!dataToSave || dataToSave.length === 0) return;
    setScatterHistory((prev) => {
      const newHistory = [
        ...prev,
        {
          scatterData: dataToSave.map((point) => ({ ...point })),
          selectedPoints: (selectedPointsRef.current || []).map((point) => ({ ...point })),
          showCluster: showClusterRef.current ?? false,
        },
      ];
      console.log('[snapshot] history length:', newHistory.length);
      return newHistory;
    });
    setScatterFuture([]);
  }, []);

  const restoreScatterPrevious = useCallback(() => {
    const history = scatterHistoryRef.current || [];
    if (history.length === 0) return;
    const lastSnapshot = history[history.length - 1];
    console.log('[restore] restoring from history, history length:', history.length);
    console.log('[restore] snapshot scatterData length:', lastSnapshot?.scatterData?.length);
    console.log('[restore] snapshot showCluster:', lastSnapshot?.showCluster);
    setScatterHistory(history.slice(0, -1));
    const future = scatterFutureRef.current || [];
    setScatterFuture([
      ...future,
      {
        scatterData: (scatterDataRef.current || []).map((point) => ({ ...point })),
        selectedPoints: (selectedPointsRef.current || []).map((point) => ({ ...point })),
        showCluster: showClusterRef.current ?? false,
      },
    ]);
    const restoredScatter = (lastSnapshot.scatterData || []).map((p, i) => ({...p, __restoreId: i}));
    const restoredHasCluster = hasClusterLabels(restoredScatter);
    console.log('[restore] restored scatterData length:', restoredScatter.length);
    console.log('[restore] restored hasCluster:', restoredHasCluster);
    console.log('[restore] restored sample point:', restoredScatter[0]);
    // 使用函数式更新确保 React 检测到变化
    setScatterData(() => restoredScatter);
    setSelectedPoints(() => (lastSnapshot.selectedPoints || []).map((p, i) => ({...p, __restoreId: i})));
    const newClusterData = restoredHasCluster ? restoredScatter : [];
    console.log('[restore] setting clusterData length:', newClusterData.length);
    setClusterData(() => newClusterData);
    setHeatmapPayload(null);
    // 使用快照中保存的 showCluster 状态（兼容旧数据）
    const restoredShowCluster = lastSnapshot.showCluster !== undefined 
      ? lastSnapshot.showCluster 
      : restoredHasCluster;
    console.log('[restore] setting showCluster to:', restoredShowCluster);
    setShowCluster(restoredShowCluster);
    setError('');
    setWarning('');
    toast.success('已返回上一步散点图');
  }, [hasClusterLabels]);

  const restoreScatterNext = useCallback(() => {
    const future = scatterFutureRef.current || [];
    if (future.length === 0) return;
    const nextSnapshot = future[future.length - 1];
    setScatterFuture(future.slice(0, -1));
    const history = scatterHistoryRef.current || [];
    setScatterHistory([
      ...history,
      {
        scatterData: (scatterDataRef.current || []).map((point) => ({ ...point })),
        selectedPoints: (selectedPointsRef.current || []).map((point) => ({ ...point })),
        showCluster: showClusterRef.current ?? false,
      },
    ]);
    const restoredScatter = (nextSnapshot.scatterData || []).map((p, i) => ({...p, __restoreId: i}));
    const restoredHasCluster = hasClusterLabels(restoredScatter);
    setScatterData(() => restoredScatter);
    setSelectedPoints(() => (nextSnapshot.selectedPoints || []).map((p, i) => ({...p, __restoreId: i})));
    setClusterData(() => restoredHasCluster ? restoredScatter : []);
    setHeatmapPayload(null);
    // 使用快照中保存的 showCluster 状态（兼容旧数据）
    const restoredShowCluster = nextSnapshot.showCluster !== undefined 
      ? nextSnapshot.showCluster 
      : restoredHasCluster;
    setShowCluster(restoredShowCluster);
    setError('');
    setWarning('');
    toast.success('已返回下一步散点图');
  }, [hasClusterLabels]);

  const mapResponseToScatter = useCallback((payload, options = {}) => {
    const { xKey, yKey, sampleKey } = options;
    const firstArray = (...values) => values.find((value) => Array.isArray(value)) || [];
    const xValues = firstArray(payload?.xColumn, payload?.x, xKey ? payload?.[xKey] : null);
    const yValues = firstArray(payload?.yColumn, payload?.y, yKey ? payload?.[yKey] : null);
    const samples = firstArray(
      payload?.sample,
      payload?.source,
      payload?.file,
      sampleKey ? payload?.[sampleKey] : null
    );
    const excluded = new Set([
      'xColumn',
      'yColumn',
      'x',
      'y',
      'sample',
      'source',
      'file',
      xKey,
      yKey,
      sampleKey,
    ]);
    const extraKeys = Object.keys(payload || {}).filter((key) => !excluded.has(key));
    const lengths = [xValues.length, yValues.length];
    if (samples.length > 0) {
      lengths.push(samples.length);
    }
    const count = lengths.length > 0 ? Math.min(...lengths) : 0;
    return Array.from({ length: count }, (_, index) => {
      const x = Number(xValues[index]);
      const y = Number(yValues[index]);
      const extraValues = extraKeys.reduce((acc, key) => {
        const rawValue = payload?.[key]?.[index];
        if (typeof rawValue === 'number') {
          acc[key] = rawValue;
          return acc;
        }
        const parsed = Number(rawValue);
        acc[key] = Number.isNaN(parsed) ? rawValue : parsed;
        return acc;
      }, {});
      return {
        id: index,
        x,
        y,
        source: samples[index] ?? '',
        sourceId: samples[index] ?? '',
        ...extraValues,
      };
    }).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  }, []);

  const buildSelectPayload = useCallback(
    (points, columnsOverride) => {
      const rows = points || [];
      const selectedColumns = Array.isArray(columnsOverride)
        ? columnsOverride
        : Array.isArray(scatterSelectedColumns)
          ? scatterSelectedColumns
          : [];
      const payload = {
        sample: [],
        selectedColumns,
      };
      const extraKeys = new Set();
      rows.forEach((point) => {
        Object.keys(point || {}).forEach((key) => {
          if (
            ['id', 'x', 'y', 'source', 'sourceId', 'group', 'cluster', '__index', '__restoreId'].includes(key)
          ) {
            return;
          }
          extraKeys.add(key);
        });
      });
      extraKeys.forEach((key) => {
        payload[key] = [];
      });

      rows.forEach((point) => {
        payload.sample.push(String(point?.source ?? point?.sourceId ?? ''));
        extraKeys.forEach((key) => {
          const value = point?.[key];
          payload[key].push(String(value ?? ''));
        });
      });

      return payload;
    },
    [scatterSelectedColumns]
  );

  const resolveFileNames = useCallback(
    (sources, overrideNames) => {
      const baseNames =
        Array.isArray(overrideNames) && overrideNames.length > 0
          ? overrideNames
          : (uploadedFiles || []).map((file) => file.name);
      const cleaned = baseNames.filter(Boolean);
      if (sources && sources.length > 0) {
        return cleaned.filter((name) => sources.includes(name));
      }
      return cleaned;
    },
    [uploadedFiles]
  );

  const fetchScatterData = useCallback(async (limitOverride) => {
    if (!uploadedFiles || uploadedFiles.length === 0) {
      setError('请先上传文件后再继续');
      return false;
    }
    if (!selectedX || !selectedY) {
      setError('请选择X/Y坐标轴后再继续');
      return false;
    }

    setIsLoading(true);
    setError('');
    setWarning('');
    try {
      const appendColumnsToForm = (formData, values) => {
        const list = Array.isArray(values) ? values : values ? [values] : [];
        list.forEach((value) => formData.append('columns', value));
      };
      const appendFileNamesToForm = (formData, names) => {
        (names || []).forEach((name) => formData.append('fileNames', name));
      };
      const formData = new FormData();
      const fileNames = uploadedFiles.map((file) => file.name).filter(Boolean);
      appendFileNamesToForm(formData, fileNames);
      const effectiveLimit = typeof limitOverride === 'number' ? limitOverride : rowLimit;
      formData.append('lineNum', String(effectiveLimit));
      appendColumnsToForm(formData, [selectedX, selectedY]);

      const responseData = await requestApi('/upload/file', {
        method: 'POST',
        body: formData,
      });
      const points = mapResponseToScatter(responseData);
      if (points.length === 0) {
        setWarning('后端未返回有效的散点图数据');
      }
      if (points.length > 0) {
        toast.success('散点图生成成功');
      }
      snapshotScatterState();
      setScatterData(points);
      setSelectedPoints([]);
      setClusterData([]);
      setHeatmapPayload(null);
      setShowCluster(false);
      return true;
    } catch (err) {
      setError(err.message || '获取获取散点图失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [mapResponseToScatter, rowLimit, selectedX, selectedY, snapshotScatterState, uploadedFiles]);

  const fetchScatterByFilters = useCallback(
    async ({ columns, sources, limitOverride, fileNames: fileNamesOverride, filters = [] } = {}) => {
      const hasFileOverride =
        Array.isArray(fileNamesOverride) && fileNamesOverride.length > 0;
      if ((!uploadedFiles || uploadedFiles.length === 0) && !hasFileOverride) {
        setError('请先上传文件后再继续');
        return false;
      }
      if (!columns || columns.length === 0) {
        setError('请先选择需要展示的列');
        return false;
      }

      setIsLoading(true);
      setError('');
      setWarning('');
      try {
        const appendColumnsToForm = (formData, values) => {
          const list = Array.isArray(values) ? values : values ? [values] : [];
          list.forEach((value) => formData.append('columns', value));
        };
        const fileNames = resolveFileNames(sources, fileNamesOverride);
        if (fileNames.length === 0) {
          setWarning('未匹配到所选文件，未发送请求');
          return false;
        }
        const formData = new FormData();
        fileNames.forEach((name) => formData.append('fileNames', name));
        const effectiveLimit = typeof limitOverride === 'number' ? limitOverride : rowLimit;
        formData.append('lineNum', String(effectiveLimit));
        appendColumnsToForm(formData, columns);

        // 添加筛选条件
        if (filters && filters.length > 0) {
          filters.forEach((filter, index) => {
            formData.append(`filterColumns[${index}]`, filter.column);
            formData.append(`filterOperators[${index}]`, filter.operator);
            formData.append(`filterValues[${index}]`, filter.value);
          });
        }

        const responseData = await requestApi('/upload/file', {
          method: 'POST',
          body: formData,
        });
        const points = mapResponseToScatter(responseData);
        if (points.length === 0) {
          setWarning('后端未返回有效的散点图数据');
        }
        if (points.length > 0) {
          toast.success('散点图生成成功');
        }
        snapshotScatterState();
        setScatterData(points);
        setSelectedPoints([]);
        setClusterData([]);
        setHeatmapPayload(null);
        setShowCluster(false);
        return true;
      } catch (err) {
        setError(err.message || '获取散点图失败');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [mapResponseToScatter, resolveFileNames, rowLimit, snapshotScatterState, uploadedFiles]
  );

  const fetchScatter2D = useCallback(
    async ({ xColumn, yColumn, sources, limitOverride, fileNames: fileNamesOverride, filters = [] } = {}) => {
      const hasFileOverride =
        Array.isArray(fileNamesOverride) && fileNamesOverride.length > 0;
      if ((!uploadedFiles || uploadedFiles.length === 0) && !hasFileOverride) {
        setError('请先上传文件后再继续');
        return false;
      }
      if (!xColumn || !yColumn) {
        setError('请先选择X/Y坐标轴');
        return false;
      }

      setIsLoading(true);
      setError('');
      setWarning('');
      try {
        const fileNames = resolveFileNames(sources, fileNamesOverride);
        if (fileNames.length === 0) {
          setWarning('未匹配到所选文件，未发送请求');
          return false;
        }
        const formData = new FormData();
        fileNames.forEach((name) => formData.append('fileNames', name));
        const effectiveLimit = typeof limitOverride === 'number' ? limitOverride : rowLimit;
        formData.append('lineNum', String(effectiveLimit));
        formData.append('xColumn', xColumn);
        formData.append('yColumn', yColumn);

        // 添加筛选条件
        if (filters && filters.length > 0) {
          filters.forEach((filter, index) => {
            formData.append(`filterColumns[${index}]`, filter.column);
            formData.append(`filterOperators[${index}]`, filter.operator);
            formData.append(`filterValues[${index}]`, filter.value);
          });
        }

        const responseData = await requestApi('/upload/xy', {
          method: 'POST',
          body: formData,
        });
        const points = mapResponseToScatter(responseData, {
          xKey: xColumn,
          yKey: yColumn,
        });
        if (points.length === 0) {
          setWarning('后端未返回有效的散点图数据');
        }
        if (points.length > 0) {
          toast.success('散点图生成成功');
        }
        snapshotScatterState();
        setScatterData(points);
        setSelectedPoints([]);
        setClusterData([]);
        setHeatmapPayload(null);
        setShowCluster(false);
        return true;
      } catch (err) {
        setError(err.message || '获取散点图失败');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [mapResponseToScatter, resolveFileNames, rowLimit, snapshotScatterState, uploadedFiles]
  );

  const applyScatterPoints = useCallback(
    (points, options = {}) => {
      const nextPoints = Array.isArray(points) ? points : [];
      const nextHasCluster = hasClusterLabels(nextPoints);
      setError('');
      setWarning('');
      snapshotScatterState();
      setScatterData(nextPoints);
      setSelectedPoints([]);
      setClusterData(nextHasCluster ? nextPoints : []);
      setHeatmapPayload(null);
      setShowCluster(nextHasCluster);
      if (options?.message && nextPoints.length > 0) {
        toast.success(options.message);
      }
    },
    [hasClusterLabels, snapshotScatterState]
  );

  const fetchScatterFromPoints = useCallback(
    async ({ points, columns, limitOverride } = {}) => {
      if (!points || points.length === 0) {
        setError('请选择有效的数据来源后再生成散点图');
        return false;
      }
      if (!columns || columns.length === 0) {
        setError('请先选择需要展示的列');
        return false;
      }

      const effectiveLimit = typeof limitOverride === 'number' ? limitOverride : rowLimit;
      const limitedPoints =
        Number.isFinite(effectiveLimit) && effectiveLimit > 0
          ? points.slice(0, effectiveLimit)
          : points;

      setIsLoading(true);
      setError('');
      setWarning('');
      try {
        const responseData = await requestApi('/select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildSelectPayload(limitedPoints, columns)),
        });
        const mapped = mapResponseToScatter(responseData);
        if (mapped.length === 0) {
          setWarning('后端未返回有效的散点图数据');
          return false;
        }
        const merged = mergeClusterLabels(mapped, limitedPoints);
        const nextHasCluster = hasClusterLabels(merged);
        snapshotScatterState();
        setScatterData(merged);
        setSelectedPoints([]);
        setClusterData(nextHasCluster ? merged : []);
        setHeatmapPayload(null);
        setShowCluster(nextHasCluster);
        toast.success('散点图生成成功');
        return true;
      } catch (err) {
        setError(err.message || '获取散点图失败');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [
      buildSelectPayload,
      hasClusterLabels,
      mapResponseToScatter,
      mergeClusterLabels,
      rowLimit,
      snapshotScatterState,
    ]
  );

  const handleScatterSelection = useCallback((selected) => {
    setSelectedPoints(selected || []);
  }, []);

  const confirmScatterSelection = useCallback(async () => {
    if (!selectedPoints || selectedPoints.length === 0) {
      setError('请先框选数据点后再确定');
      return false;
    }
    setError('');
    setWarning('');
    // 保存当前完整数据到历史记录
    // 使用函数式更新确保获取最新状态
    const currentData = scatterDataRef.current || [];
    const currentSelected = selectedPointsRef.current || [];
    const currentShowCluster = showClusterRef.current ?? false;
    console.log('[confirm] BEFORE save - current scatterData length:', currentData.length);
    console.log('[confirm] BEFORE save - selected points length:', selectedPoints.length);
    console.log('[confirm] BEFORE save - showCluster:', currentShowCluster);
    
    setScatterHistory((prev) => {
      const newHistory = [
        ...prev,
        {
          scatterData: currentData.map((point) => ({ ...point })),
          selectedPoints: currentSelected.map((point) => ({ ...point })),
          showCluster: currentShowCluster,
        },
      ];
      console.log('[confirm] history length after save:', newHistory.length);
      return newHistory;
    });
    setScatterFuture([]);
    const nextPoints = selectedPoints.map((p) => ({ ...p }));
    const nextHasCluster = hasClusterLabels(nextPoints);
    console.log('[confirm] AFTER save - setting scatterData to:', nextPoints.length);
    setScatterData(nextPoints);
    setSelectedPoints([]);
    setClusterData(nextHasCluster ? nextPoints : []);
    setHeatmapPayload(null);
    setShowCluster(nextHasCluster);
    toast.success('筛选完成');
    return true;
  }, [hasClusterLabels, selectedPoints]);

  const runHeatmapRequest = useCallback(
    async (points, emptyMessage, options = {}) => {
      if (!points || points.length === 0) {
        setError(emptyMessage);
        setShowCluster(false);
        setIsClusterLoading(false);
        return { success: false };
      }
      setIsLoading(true);
      setIsClusterLoading(true);
      setError('');
      setWarning('');
      try {
        const payloadPoints = points.map((point) => {
          if (!point || typeof point !== 'object') return {};
          const { originalData, x, y, group, cluster, __index, __restoreId, ...rest } = point;
          if (scatterMode === '2d' && scatterAxisX && scatterAxisY) {
            return {
              ...rest,
              [scatterAxisX]: x,
              [scatterAxisY]: y,
            };
          }
          return { ...rest, x, y };
        });
        const responseData = await requestApi('/heatmap/cluster-tree/points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points: payloadPoints, ...options }),
        });
        if (!responseData?.heatmap?.values?.length) {
          setWarning('后端未返回有效的热图数据');
          setShowCluster(false);
          return { success: false };
        }
        const pointGroups = Array.isArray(responseData?.pointGroups)
          ? responseData.pointGroups
          : [];
        const clusteredPoints = points.map((point, index) => ({
          ...point,
          id: point?.id ?? index,
          group: pointGroups[index] ?? point?.group ?? point?.cluster,
        }));
        setHeatmapPayload(responseData);
        setClusterData(clusteredPoints);
        setSelectedPoints(points);
        setShowCluster(true);
        toast.success('热图聚类完成');
        return {
          success: true,
          data: {
            scatterData: clusteredPoints,
            clusterData: clusteredPoints,
            heatmap: responseData?.heatmap ?? null,
            rowTree: responseData?.rowTree ?? null,
            colTree: responseData?.colTree ?? null,
          },
        };
      } catch (err) {
        setError(err.message || '热图聚类请求失败');
        setShowCluster(false);
        return { success: false };
      } finally {
        setIsLoading(false);
        setIsClusterLoading(false);
      }
    },
    [scatterAxisX, scatterAxisY, scatterMode]
  );

  const handleCluster = useCallback(
    (options) => runHeatmapRequest(selectedPoints, '请先框选数据点后再进行聚类', options),
    [runHeatmapRequest, selectedPoints]
  );

  const handleClusterFromScatter = useCallback(
    (options) => runHeatmapRequest(scatterData, '请先生成散点图后再进行聚类', options),
    [runHeatmapRequest, scatterData]
  );

  const handleClusterFromPoints = useCallback(
    (points, options) => runHeatmapRequest(points, '请先生成散点图后再进行聚类', options),
    [runHeatmapRequest]
  );

  const saveClusterResult = (name) => {
    if (!heatmapPayload?.heatmap?.values?.length) {
      setError('请先生成热图后再保存结果');
      return;
    }
    const trimmedName = name?.trim();
    if (!trimmedName) {
      setError('请输入有效的保存名称');
      return;
    }
    setError('');
    const timestamp = new Date();
    setClusterResults((prev) => [
      {
        id: `${timestamp.getTime()}-${prev.length}`,
        name: trimmedName,
        savedAt: timestamp.toISOString(),
        resultType: 'cluster',
        scatterData: clusterData.length > 0 ? clusterData : scatterData,
        clusterData,
        heatmap: heatmapPayload?.heatmap ?? null,
      },
      ...prev,
    ]);
  };

  const saveScatterResult = (name) => {
    if (!scatterData || scatterData.length === 0) {
      setError('请先生成散点图后再保存结果');
      return;
    }
    const trimmedName = name?.trim();
    if (!trimmedName) {
      setError('请输入有效的保存名称');
      return;
    }
    setError('');
    const timestamp = new Date();
    setClusterResults((prev) => [
      {
        id: `${timestamp.getTime()}-${prev.length}`,
        name: trimmedName,
        savedAt: timestamp.toISOString(),
        resultType: 'scatter',
        scatterData,
        clusterData: [],
      },
      ...prev,
    ]);
  };

  const value = useMemo(
    () => ({
      datasets,
      uploadedFiles,
      allColumns,
      numericColumns,
      selectedX,
      selectedY,
      scatterMode,
      scatterAxisX,
      scatterAxisY,
      scatterSelectedColumns,
      scatterSelectedSources,
      scatterRowLimitInput,
      scatterColorField,
      scatterData,
      selectedPoints,
      scatterHistory,
      scatterFuture,
      analysisFlow,
      analysisFlowFuture,
      isLoading,
      isClusterLoading,
      error,
      warning,
      clusterData,
      showCluster,
      clusterResults,
      rowLimit,
      analysisResetToken,
      heatmapPayload,
      fetchScatterData,
      fetchScatterByFilters,
      fetchScatter2D,
      fetchScatterFromPoints,
      handleFilesChange,
      loadAnalysisFiles,
      applyAnalysisMetadata,
      applyScatterPoints,
      setRowLimit,
      setScatterSelectedColumns,
      setScatterSelectedSources,
      setScatterRowLimitInput,
      setScatterColorField,
      setScatterMode,
      setAnalysisFlow,
      setAnalysisFlowFuture,
      restoreScatterPrevious,
      restoreScatterNext,
      handleColumnChange,
      handleScatterAxisChange,
      handleScatterSelection,
      confirmScatterSelection,
      handleCluster,
      handleClusterFromScatter,
      handleClusterFromPoints,
      startNewAnalysis,
      saveClusterResult,
      saveScatterResult,
      setClusterResults,
    }),
    [
      datasets,
      uploadedFiles,
      allColumns,
      numericColumns,
      selectedX,
      selectedY,
      scatterMode,
      scatterAxisX,
      scatterAxisY,
      scatterSelectedColumns,
      scatterSelectedSources,
      scatterRowLimitInput,
      scatterColorField,
      scatterData,
      selectedPoints,
      scatterHistory,
      scatterFuture,
      analysisFlow,
      analysisFlowFuture,
      isLoading,
      isClusterLoading,
      error,
      warning,
      clusterData,
      showCluster,
      clusterResults,
      rowLimit,
      analysisResetToken,
      heatmapPayload,
      fetchScatterData,
      fetchScatterByFilters,
      fetchScatter2D,
      fetchScatterFromPoints,
      handleFilesChange,
      loadAnalysisFiles,
      applyAnalysisMetadata,
      applyScatterPoints,
      saveClusterResult,
      saveScatterResult,
      setRowLimit,
      setScatterSelectedColumns,
      setScatterSelectedSources,
      setScatterRowLimitInput,
      setScatterColorField,
      setScatterMode,
      setAnalysisFlow,
      setAnalysisFlowFuture,
      restoreScatterPrevious,
      restoreScatterNext,
      handleColumnChange,
      handleScatterAxisChange,
      handleScatterSelection,
      confirmScatterSelection,
      handleCluster,
      handleClusterFromScatter,
      handleClusterFromPoints,
      startNewAnalysis,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within DataProvider');
  }
  return context;
};
