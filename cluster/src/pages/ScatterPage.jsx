import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Plotly from 'plotly.js-dist-min';
import ScatterPlot, { SCATTER_COLOR_SCALE, getScatterColor } from '../components/ScatterPlot';
import PageLayout from '../components/PageLayout';
import { useDataContext } from '../context/data-context';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Checkbox } from '../components/ui/checkbox';
import { Slider } from '../components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Switch } from '../components/ui/switch';
import { requestApi } from '../utils/apiClient';

const PREVIEW_IMAGE_SIZE = { width: 360, height: 240 };
const MIN_SCATTER_WIDTH = 520;
const MIN_SCATTER_HEIGHT = 420;
const SCATTER_RESIZE_EDGE = 16;

const ScatterPage = () => {
  const navigate = useNavigate();
  const {
    numericColumns,
    datasets,
    scatterData,
    selectedPoints,
    isLoading,
    isClusterLoading,
    error,
    warning,
    clusterData,
    clusterResults,
    showCluster,
    handleScatterSelection,
    confirmScatterSelection,
    saveScatterResult,
    rowLimit,
    setRowLimit,
    fetchScatterByFilters,
    fetchScatter2D,
    fetchScatterFromPoints,
    applyScatterPoints,
    uploadedFiles,
    applyAnalysisMetadata,
    analysisResetToken,
    handleClusterFromPoints,
    scatterMode,
    setScatterMode,
    scatterAxisX,
    scatterAxisY,
    handleScatterAxisChange,
    scatterSelectedColumns,
    setScatterSelectedColumns,
    scatterSelectedSources,
    setScatterSelectedSources,
    scatterRowLimitInput,
    setScatterRowLimitInput,
    scatterColorField,
    setScatterColorField,
    scatterHistory,
    scatterFuture,
    restoreScatterPrevious,
    restoreScatterNext,
    analysisFlow,
    setAnalysisFlow,
    setAnalysisFlowFuture,
  } = useDataContext();
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isInitialConfigOpen, setIsInitialConfigOpen] = useState(false);
  const [isClusterConfigOpen, setIsClusterConfigOpen] = useState(false);
  const [isClustering, setIsClustering] = useState(false); // 聚类分析加载状态
  const [isScatterUpdating, setIsScatterUpdating] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [clusterKInput, setClusterKInput] = useState('20');
  const [clusterResolutionInput, setClusterResolutionInput] = useState('1.0');
  const [clusterIterationsInput, setClusterIterationsInput] = useState('20');
  const [clusterSeedInput, setClusterSeedInput] = useState('123');
  const [clusterDropColumns, setClusterDropColumns] = useState([]);
  const [isReductionOpen, setIsReductionOpen] = useState(false);
  const [reductionColumns, setReductionColumns] = useState([]);
  const [lastReductionColumns, setLastReductionColumns] = useState([]);
  const [isSourceLegendOpen, setIsSourceLegendOpen] = useState(true);
  const [isClusterLegendOpen, setIsClusterLegendOpen] = useState(true);
  const [isFlowOpen, setIsFlowOpen] = useState(true);
  const [colorMode, setColorMode] = useState('source');
  const [selectedClusters, setSelectedClusters] = useState([]);
  const [clearSelectionSignal, setClearSelectionSignal] = useState(0);
  const [initialConfigFiles, setInitialConfigFiles] = useState([]);
  const [initialConfigSelectedFiles, setInitialConfigSelectedFiles] = useState([]);
  const [isInitialConfigFilesLoading, setIsInitialConfigFilesLoading] = useState(false);
  const [initialConfigMetadata, setInitialConfigMetadata] = useState([]);
  const [isInitialConfigMetadataLoading, setIsInitialConfigMetadataLoading] = useState(false);
  const [initialConfigMode, setInitialConfigMode] = useState('reduction');
  const [initialConfigRowLimit, setInitialConfigRowLimit] = useState('');
  const [initialConfigColumns, setInitialConfigColumns] = useState([]);
  const [initialConfigAxisX, setInitialConfigAxisX] = useState('');
  const [initialConfigAxisY, setInitialConfigAxisY] = useState('');
  const initialConfigInitRef = useRef(false);
  const initialConfigSelectionRef = useRef(false);
  const [previewItems, setPreviewItems] = useState([]);
  const [previewError, setPreviewError] = useState('');
  const [isPreviewGenerating, setIsPreviewGenerating] = useState(false);
  const [activePreview, setActivePreview] = useState(null);
  const mainPlotRef = useRef(null);
  const [axisViewX, setAxisViewX] = useState('');
  const [axisViewY, setAxisViewY] = useState('');
  const [analysisAreaHeight, setAnalysisAreaHeight] = useState(() => {
    if (typeof window === 'undefined') return 720;
    return Math.max(520, Math.floor(window.innerHeight * 0.75));
  });
  const [analysisAreaNode, setAnalysisAreaNode] = useState(null);
  const [scatterPanelWidth, setScatterPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return 960;
    return Math.max(MIN_SCATTER_WIDTH, Math.floor(window.innerWidth * 0.6));
  });
  const [scatterPanelHeight, setScatterPanelHeight] = useState(() => {
    if (typeof window === 'undefined') return 560;
    return Math.max(MIN_SCATTER_HEIGHT, Math.floor(window.innerHeight * 0.6));
  });
  const [scatterPanelNode, setScatterPanelNode] = useState(null);
  const [analysisAreaReady, setAnalysisAreaReady] = useState(false);
  const [scatterPanelReady, setScatterPanelReady] = useState(false);
  const [scatterPointSize, setScatterPointSize] = useState(4.5);
  const [scatterSizeMode, setScatterSizeMode] = useState('auto');
  const [scatterCustomWidth, setScatterCustomWidth] = useState(960);
  const [scatterCustomHeight, setScatterCustomHeight] = useState(560);
  const [scatterWidthInput, setScatterWidthInput] = useState('960');
  const [scatterHeightInput, setScatterHeightInput] = useState('560');
  const [isWidthEditing, setIsWidthEditing] = useState(false);
  const [isHeightEditing, setIsHeightEditing] = useState(false);
  const [isResizeHover, setIsResizeHover] = useState(false);
  const [analysisSource, setAnalysisSource] = useState('files');
  const [analysisSourceResultId, setAnalysisSourceResultId] = useState('');
  const layoutReady = analysisAreaReady && scatterPanelReady;
  const selectedSources = scatterSelectedSources;
  const setSelectedSources = setScatterSelectedSources;
  const selectedColumns = scatterSelectedColumns;
  const setSelectedColumns = setScatterSelectedColumns;
  const colorField = scatterColorField;
  const setColorField = setScatterColorField;
  const rowLimitInput = scatterRowLimitInput;
  const setRowLimitInput = setScatterRowLimitInput;
  const normalizeSourceValue = (value) =>
    value === null || value === undefined || value === '' ? '未知' : String(value);
  const normalizeGroupValue = (value) =>
    value === null || value === undefined || value === '' ? '未分组' : String(value);
  const clampValue = useCallback((value, min, max) => {
    if (!Number.isFinite(value)) return min;
    if (!Number.isFinite(max)) return Math.max(min, value);
    return Math.max(min, Math.min(max, value));
  }, []);
  const isCustomSize = scatterSizeMode === 'custom';
  const resolvedScatterHeight = isCustomSize ? scatterCustomHeight : scatterPanelHeight;
  const resolvedScatterWidth = isCustomSize ? scatterCustomWidth : scatterPanelWidth;
  const hasCurrentCluster = showCluster && clusterData.length > 0;
  const savedClusterResults = useMemo(
    () =>
      (clusterResults || []).filter(
        (result) =>
          result?.resultType === 'cluster' &&
          (result?.clusterData?.length || result?.scatterData?.length)
      ),
    [clusterResults]
  );
  const analysisSourcePoints = useMemo(() => {
    if (analysisSource === 'cluster-current') {
      if (clusterData && clusterData.length > 0) return clusterData;
      if (scatterData && scatterData.length > 0) return scatterData;
      return [];
    }
    if (analysisSource === 'cluster-saved') {
      const result = savedClusterResults.find((item) => item.id === analysisSourceResultId);
      if (result?.clusterData?.length) return result.clusterData;
      if (result?.scatterData?.length) return result.scatterData;
      return [];
    }
    return [];
  }, [analysisSource, analysisSourceResultId, clusterData, scatterData, savedClusterResults]);
  const analysisSourceLabel = useMemo(() => {
    if (analysisSource === 'files') return '原始文件';
    if (analysisSource === 'cluster-current') return '当前聚类结果';
    if (analysisSource === 'cluster-saved') {
      const result = savedClusterResults.find((item) => item.id === analysisSourceResultId);
      return result ? `历史结果：${result.name}` : '已保存聚类结果';
    }
    return '原始文件';
  }, [analysisSource, analysisSourceResultId, savedClusterResults]);
  const analysisNumericColumns = useMemo(() => {
    if (analysisSource === 'files') return numericColumns;
    if (!analysisSourcePoints || analysisSourcePoints.length === 0) return [];
    const excluded = new Set([
      'id',
      'x',
      'y',
      'source',
      'sourceId',
      'group',
      'cluster',
      'originalData',
      '__index',
    ]);
    const keys = new Set();
    analysisSourcePoints.forEach((point) => {
      Object.keys(point || {}).forEach((key) => {
        if (!excluded.has(key)) {
          keys.add(key);
        }
      });
    });
    return Array.from(keys).filter((key) =>
      analysisSourcePoints.some((point) => Number.isFinite(Number(point?.[key])))
    );
  }, [analysisSource, analysisSourcePoints, numericColumns]);
  const analysisAxisColumns = useMemo(() => {
    if (analysisSource === 'files') return analysisNumericColumns;
    const columns = new Set(analysisNumericColumns);
    const hasX = analysisSourcePoints.some((point) => Number.isFinite(Number(point?.x)));
    const hasY = analysisSourcePoints.some((point) => Number.isFinite(Number(point?.y)));
    if (hasX) columns.add('x');
    if (hasY) columns.add('y');
    return Array.from(columns);
  }, [analysisSource, analysisNumericColumns, analysisSourcePoints]);

  const initialConfigNumericColumns = useMemo(() => {
    const columnSet = new Set();
    initialConfigMetadata.forEach((item) => {
      (item.numericColumns || []).forEach((column) => columnSet.add(column));
    });
    return Array.from(columnSet);
  }, [initialConfigMetadata]);

  const initialConfigAxisColumns = useMemo(
    () => initialConfigNumericColumns,
    [initialConfigNumericColumns]
  );

  useEffect(() => {
    if (isInitialConfigOpen) return;
    initialConfigInitRef.current = false;
    initialConfigSelectionRef.current = false;
    setInitialConfigSelectedFiles([]);
    setInitialConfigMetadata([]);
  }, [isInitialConfigOpen]);

  useEffect(() => {
    if (!isInitialConfigOpen) return;
    if (initialConfigInitRef.current) return;
    initialConfigInitRef.current = true;
    setInitialConfigMode(scatterMode);
    setInitialConfigRowLimit(rowLimitInput === '' ? String(rowLimit) : rowLimitInput);
    setInitialConfigColumns(scatterSelectedColumns || []);
    setInitialConfigAxisX(scatterAxisX || '');
    setInitialConfigAxisY(scatterAxisY || '');
  }, [
    isInitialConfigOpen,
    rowLimit,
    rowLimitInput,
    scatterAxisX,
    scatterAxisY,
    scatterMode,
    scatterSelectedColumns,
  ]);

  useEffect(() => {
    if (!isInitialConfigOpen) return;
    const loadFiles = async () => {
      setIsInitialConfigFilesLoading(true);
      try {
        const response = await requestApi('/files');
        const files = Array.isArray(response) ? response : response?.files || [];
        const filtered = files.filter((file) => {
          const ext = file?.name?.split('.').pop()?.toLowerCase() || '';
          return ['csv', 'txt'].includes(ext);
        });
        setInitialConfigFiles(filtered);
      } catch (err) {
        toast.error(err.message || '加载文件列表失败');
      } finally {
        setIsInitialConfigFilesLoading(false);
      }
    };
    loadFiles();
  }, [isInitialConfigOpen]);

  useEffect(() => {
    if (!isInitialConfigOpen) return;
    if (initialConfigSelectionRef.current) return;
    const names = (uploadedFiles || []).map((file) => file.name).filter(Boolean);
    if (names.length > 0) {
      setInitialConfigSelectedFiles(names);
      initialConfigSelectionRef.current = true;
      return;
    }
    if (initialConfigFiles.length > 0) {
      setInitialConfigSelectedFiles(initialConfigFiles.map((file) => file.name));
      initialConfigSelectionRef.current = true;
    }
  }, [isInitialConfigOpen, initialConfigFiles, uploadedFiles]);

  useEffect(() => {
    if (!isInitialConfigOpen) return;
    if (initialConfigSelectedFiles.length === 0) {
      setInitialConfigMetadata([]);
      return;
    }
    let isActive = true;
    const loadMetadata = async () => {
      setIsInitialConfigMetadataLoading(true);
      try {
        const response = await requestApi('/files/metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names: initialConfigSelectedFiles }),
        });
        const files = Array.isArray(response) ? response : response?.files || [];
        if (isActive) {
          setInitialConfigMetadata(files);
        }
      } catch (err) {
        if (isActive) {
          setInitialConfigMetadata([]);
        }
        toast.error(err.message || '加载列信息失败');
      } finally {
        if (isActive) {
          setIsInitialConfigMetadataLoading(false);
        }
      }
    };
    loadMetadata();
    return () => {
      isActive = false;
    };
  }, [isInitialConfigOpen, initialConfigSelectedFiles]);

  useEffect(() => {
    if (!isInitialConfigOpen) return;
    setInitialConfigColumns((prev) =>
      initialConfigNumericColumns.length === 0
        ? []
        : prev.filter((item) => initialConfigNumericColumns.includes(item))
    );
  }, [initialConfigNumericColumns, isInitialConfigOpen]);

  useEffect(() => {
    if (!isInitialConfigOpen) return;
    setInitialConfigAxisX((prev) =>
      initialConfigAxisColumns.includes(prev) ? prev : ''
    );
    setInitialConfigAxisY((prev) =>
      initialConfigAxisColumns.includes(prev) ? prev : ''
    );
  }, [initialConfigAxisColumns, isInitialConfigOpen]);
  const isSaveDisabled = saveName.trim().length === 0;
  const hasClusterData = showCluster && clusterData.length > 0;
  const activeScatterData = hasClusterData ? clusterData : scatterData;
  const hasScatterData = activeScatterData.length > 0;
  const showPlotMask = isScatterUpdating && !isClusterLoading;
  const plotMaskMessage = '正在加载散点图...';
  const canRestorePrevious = scatterHistory.length > 0 && !isLoading;
  const canRestoreNext = scatterFuture.length > 0 && !isLoading;
  const placeholderData = useMemo(
    () => [
      {
        id: 0,
        x: 0,
        y: 0,
        source: '默认',
        sourceId: 'default',
      },
    ],
    []
  );
  const displayData = hasScatterData ? activeScatterData : placeholderData;
  const isClusterDisabled = !hasScatterData || isLoading;
  const reductionColumnOptions = useMemo(() => {
    const sourceData = activeScatterData.length > 0 ? activeScatterData : analysisSourcePoints;
    const excluded = new Set([
      'id',
      'x',
      'y',
      'source',
      'sourceId',
      'group',
      'cluster',
      'originalData',
      '__index',
    ]);
    const keys = new Set();
    (sourceData || []).forEach((point) => {
      Object.keys(point || {}).forEach((key) => {
        if (!excluded.has(key)) {
          keys.add(key);
        }
      });
    });
    const available = Array.from(keys).filter((key) =>
      (sourceData || []).some((point) => Number.isFinite(Number(point?.[key])))
    );
    return available.length > 0 ? available : analysisNumericColumns;
  }, [activeScatterData, analysisSourcePoints, analysisNumericColumns]);

  useEffect(() => {
    if (rowLimitInput === '') {
      setRowLimitInput(String(rowLimit));
    }
  }, [rowLimit, rowLimitInput, setRowLimitInput]);

  const sourceOptions = useMemo(() => {
    if (analysisSource === 'files') {
      const names = uploadedFiles.map((file) => file.name);
      return Array.from(new Set(names));
    }
    const names = (analysisSourcePoints || []).map((point) =>
      normalizeSourceValue(point?.source ?? point?.sourceId)
    );
    return Array.from(new Set(names));
  }, [analysisSource, analysisSourcePoints, uploadedFiles]);

  useEffect(() => {
    setSelectedSources(sourceOptions);
  }, [sourceOptions]);

  const toggleInitialConfigFile = useCallback((name, checked) => {
    setInitialConfigSelectedFiles((prev) => {
      const isChecked = checked ?? !prev.includes(name);
      if (isChecked) {
        return prev.includes(name) ? prev : [...prev, name];
      }
      return prev.filter((item) => item !== name);
    });
  }, []);

  useEffect(() => {
    if (analysisSource === 'cluster-saved' && savedClusterResults.length > 0) {
      if (!analysisSourceResultId) {
        setAnalysisSourceResultId(savedClusterResults[0].id);
      }
      return;
    }
    if (analysisSource === 'cluster-saved' && savedClusterResults.length === 0) {
      setAnalysisSource('files');
      setAnalysisSourceResultId('');
    }
    if (analysisSource === 'cluster-current' && !hasCurrentCluster) {
      setAnalysisSource('files');
    }
  }, [analysisSource, analysisSourceResultId, hasCurrentCluster, savedClusterResults]);

  useEffect(() => {
    setSelectedColumns((prev) =>
      analysisNumericColumns.length === 0
        ? []
        : prev.filter((item) => analysisNumericColumns.includes(item))
    );
    const nextX = analysisAxisColumns.includes(scatterAxisX) ? scatterAxisX : '';
    const nextY = analysisAxisColumns.includes(scatterAxisY) ? scatterAxisY : '';
    if (nextX !== scatterAxisX || nextY !== scatterAxisY) {
      handleScatterAxisChange(nextX, nextY);
    }
  }, [
    analysisNumericColumns,
    analysisAxisColumns,
    scatterAxisX,
    scatterAxisY,
    handleScatterAxisChange,
    setSelectedColumns,
  ]);

  useEffect(() => {
    if (analysisResetToken === 0) return;
    setSelectedSources([]);
    setSelectedColumns([]);
    setRowLimitInput('');
    setSaveName('');
    setIsSaveOpen(false);
    setIsClusterConfigOpen(false);
    setClusterKInput('20');
    setClusterResolutionInput('1.0');
    setClusterIterationsInput('20');
    setClusterSeedInput('123');
    setClusterDropColumns([]);
    setIsReductionOpen(false);
    setReductionColumns([]);
    setLastReductionColumns([]);
    setAnalysisFlow([]);
    setAnalysisFlowFuture([]);
    setIsFlowOpen(true);
    setColorMode('source');
    setSelectedClusters([]);
    setClearSelectionSignal(0);
    setColorField('');
    setAnalysisSource('files');
    setAnalysisSourceResultId('');
    handleScatterAxisChange('', '');
  }, [
    analysisResetToken,
    handleScatterAxisChange,
    setSelectedColumns,
    setSelectedSources,
    setColorField,
    setAnalysisSource,
    setAnalysisSourceResultId,
  ]);

  useLayoutEffect(() => {
    if (!analysisAreaNode) return undefined;
    const updateHeight = () => {
      const rect = analysisAreaNode.getBoundingClientRect();
      const nextHeight = Math.max(520, Math.floor(window.innerHeight - rect.top - 20));
      setAnalysisAreaHeight(nextHeight);
    };
    const handleResize = () => updateHeight();
    updateHeight();
    setAnalysisAreaReady(true);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [analysisAreaNode]);

  useLayoutEffect(() => {
    if (!scatterPanelNode) return undefined;
    const updateHeight = () => {
      const styles = window.getComputedStyle(scatterPanelNode);
      const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;
      const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
      const innerHeight = (scatterPanelNode.clientHeight || 0) - paddingTop - paddingBottom;
      const innerWidth = (scatterPanelNode.clientWidth || 0) - paddingLeft - paddingRight;
      const nextHeight = Math.max(MIN_SCATTER_HEIGHT, Math.floor(innerHeight));
      const nextWidth = Math.max(MIN_SCATTER_WIDTH, Math.floor(innerWidth));
      setScatterPanelHeight(nextHeight);
      setScatterPanelWidth(nextWidth);
    };
    updateHeight();
    setScatterPanelReady(true);
    const observer = new ResizeObserver(updateHeight);
    observer.observe(scatterPanelNode);
    return () => observer.disconnect();
  }, [scatterPanelNode]);

  useEffect(() => {
    if (!isCustomSize) return;
    setScatterCustomWidth((prev) =>
      clampValue(prev, MIN_SCATTER_WIDTH, scatterPanelWidth || prev)
    );
    setScatterCustomHeight((prev) =>
      clampValue(prev, MIN_SCATTER_HEIGHT, scatterPanelHeight || prev)
    );
  }, [clampValue, isCustomSize, scatterPanelHeight, scatterPanelWidth]);

  useEffect(() => {
    if (!isCustomSize) return;
    if (!isWidthEditing) {
      setScatterWidthInput(String(scatterCustomWidth));
    }
  }, [isCustomSize, isWidthEditing, scatterCustomWidth]);

  useEffect(() => {
    if (!isCustomSize) return;
    if (!isHeightEditing) {
      setScatterHeightInput(String(scatterCustomHeight));
    }
  }, [isCustomSize, isHeightEditing, scatterCustomHeight]);

  const handleScatterSizeToggle = useCallback(
    (checked) => {
      if (checked) {
        const nextWidth = clampValue(
          scatterCustomWidth || scatterPanelWidth,
          MIN_SCATTER_WIDTH,
          scatterPanelWidth || scatterCustomWidth
        );
        const nextHeight = clampValue(
          scatterCustomHeight || scatterPanelHeight,
          MIN_SCATTER_HEIGHT,
          scatterPanelHeight || scatterCustomHeight
        );
        setScatterCustomWidth(nextWidth);
        setScatterCustomHeight(nextHeight);
        setScatterWidthInput(String(nextWidth));
        setScatterHeightInput(String(nextHeight));
        setScatterSizeMode('custom');
        return;
      }
      setScatterSizeMode('auto');
    },
    [
      clampValue,
      scatterCustomHeight,
      scatterCustomWidth,
      scatterPanelHeight,
      scatterPanelWidth,
    ]
  );

  const applyScatterWidthInput = useCallback(() => {
    const parsed = Number.parseInt(scatterWidthInput, 10);
    if (!Number.isFinite(parsed)) {
      setScatterWidthInput(String(scatterCustomWidth));
      return;
    }
    const next = clampValue(parsed, MIN_SCATTER_WIDTH, scatterPanelWidth || parsed);
    setScatterCustomWidth(next);
    setScatterWidthInput(String(next));
  }, [clampValue, scatterCustomWidth, scatterPanelWidth, scatterWidthInput]);

  const applyScatterHeightInput = useCallback(() => {
    const parsed = Number.parseInt(scatterHeightInput, 10);
    if (!Number.isFinite(parsed)) {
      setScatterHeightInput(String(scatterCustomHeight));
      return;
    }
    const next = clampValue(parsed, MIN_SCATTER_HEIGHT, scatterPanelHeight || parsed);
    setScatterCustomHeight(next);
    setScatterHeightInput(String(next));
  }, [clampValue, scatterCustomHeight, scatterHeightInput, scatterPanelHeight]);

  const handleScatterWidthChange = useCallback((event) => {
    setScatterWidthInput(event.target.value);
  }, []);

  const handleScatterHeightChange = useCallback((event) => {
    setScatterHeightInput(event.target.value);
  }, []);

  const handleScatterResizeStart = useCallback(
    (event) => {
      if (!isCustomSize) return;
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startY = event.clientY;
      const startWidth = scatterCustomWidth;
      const startHeight = scatterCustomHeight;
      const maxWidth = scatterPanelWidth || startWidth;
      const maxHeight = scatterPanelHeight || startHeight;
      const prevCursor = document.body.style.cursor;
      const prevSelect = document.body.style.userSelect;
      document.body.style.cursor = 'nwse-resize';
      document.body.style.userSelect = 'none';

      const handleMove = (moveEvent) => {
        const nextWidth = clampValue(
          startWidth + (moveEvent.clientX - startX),
          MIN_SCATTER_WIDTH,
          maxWidth
        );
        const nextHeight = clampValue(
          startHeight + (moveEvent.clientY - startY),
          MIN_SCATTER_HEIGHT,
          maxHeight
        );
        setScatterCustomWidth(nextWidth);
        setScatterCustomHeight(nextHeight);
      };

      const handleUp = () => {
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevSelect;
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [
      clampValue,
      isCustomSize,
      scatterCustomHeight,
      scatterCustomWidth,
      scatterPanelHeight,
      scatterPanelWidth,
    ]
  );

  const handleScatterEdgePointerMove = useCallback(
    (event) => {
      if (!isCustomSize) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const nearRight = rect.right - event.clientX <= SCATTER_RESIZE_EDGE;
      const nearBottom = rect.bottom - event.clientY <= SCATTER_RESIZE_EDGE;
      const nextHover = nearRight && nearBottom;
      if (nextHover !== isResizeHover) {
        setIsResizeHover(nextHover);
      }
    },
    [isCustomSize, isResizeHover]
  );

  const handleScatterEdgePointerLeave = useCallback(() => {
    if (!isCustomSize) return;
    setIsResizeHover(false);
  }, [isCustomSize]);

  const handleScatterEdgePointerDown = useCallback(
    (event) => {
      if (!isCustomSize) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const nearRight = rect.right - event.clientX <= SCATTER_RESIZE_EDGE;
      const nearBottom = rect.bottom - event.clientY <= SCATTER_RESIZE_EDGE;
      if (!nearRight || !nearBottom) return;
      handleScatterResizeStart(event);
    },
    [handleScatterResizeStart, isCustomSize]
  );

  const sourceLegendItems = useMemo(() => {
    const groups = new Map();
    activeScatterData.forEach((point) => {
      const label = point.source ?? '未知';
      if (!groups.has(label)) {
        groups.set(label, 0);
      }
      groups.set(label, groups.get(label) + 1);
    });
    const entries = Array.from(groups.entries());
    const total = entries.length || 1;
    return entries.map(([label, count], index) => ({
      label,
      count,
      color: getScatterColor(index, total),
    }));
  }, [activeScatterData]);

  const clusterLegendItems = useMemo(() => {
    if (!hasClusterData) return [];
    const groups = new Map();
    activeScatterData.forEach((point) => {
      const rawValue = point.group ?? point.cluster ?? '未分组';
      const label = rawValue === '' ? '未分组' : String(rawValue);
      if (!groups.has(label)) {
        groups.set(label, 0);
      }
      groups.set(label, groups.get(label) + 1);
    });
    const entries = Array.from(groups.entries()).sort(([a], [b]) => {
      const numA = Number(a);
      const numB = Number(b);
      if (Number.isFinite(numA) && Number.isFinite(numB)) {
        return numA - numB;
      }
      return String(a).localeCompare(String(b));
    });
    const total = entries.length || 1;
    return entries.map(([label, count], index) => ({
      label,
      count,
      color: getScatterColor(index, total),
    }));
  }, [activeScatterData, hasClusterData]);

  const colorFieldOptions = useMemo(() => {
    if (!hasScatterData || activeScatterData.length === 0) return [];
    const excluded = new Set(['id', 'x', 'y', 'source', 'sourceId', 'group', 'cluster', '__index']);
    const keys = Object.keys(activeScatterData[0] || {}).filter((key) => !excluded.has(key));
    return keys.filter((key) =>
      activeScatterData.some((point) => Number.isFinite(Number(point[key])))
    );
  }, [hasScatterData, activeScatterData]);

  const axisFieldOptions = useMemo(() => {
    if (!hasScatterData || activeScatterData.length === 0) {
      return [
        { label: 'UMAP1', value: 'UMAP1' },
        { label: 'UMAP2', value: 'UMAP2' },
      ];
    }
    const excluded = new Set(['id', 'x', 'y', 'source', 'sourceId', 'group', 'cluster', '__index']);
    const keys = Object.keys(activeScatterData[0] || {}).filter((key) => !excluded.has(key));
    const numericKeys = keys.filter((key) =>
      activeScatterData.some((point) => Number.isFinite(Number(point[key])))
    );
    return [
      { label: 'UMAP1', value: 'UMAP1' },
      { label: 'UMAP2', value: 'UMAP2' },
      ...numericKeys.map((key) => ({ label: key, value: key })),
    ];
  }, [activeScatterData, hasScatterData]);

  const clusterColumnOptions = useMemo(() => {
    if (!hasScatterData || activeScatterData.length === 0) return [];
    const excluded = new Set([
      'id',
      'x',
      'y',
      'source',
      'sourceId',
      'cluster',
      'group',
      '__index',
    ]);
    return Object.keys(activeScatterData[0] || {}).filter((key) => !excluded.has(key));
  }, [hasScatterData, activeScatterData]);

  useEffect(() => {
    if (colorFieldOptions.length === 0) {
      setColorField('');
      return;
    }
    if (!colorFieldOptions.includes(colorField)) {
      setColorField(colorFieldOptions[0]);
    }
  }, [colorField, colorFieldOptions]);

  useEffect(() => {
    if (!hasClusterData && colorMode === 'cluster') {
      setColorMode('source');
    }
  }, [hasClusterData, colorMode]);

  useEffect(() => {
    if (!hasClusterData) {
      setSelectedClusters([]);
      return;
    }
    setSelectedClusters(clusterLegendItems.map((item) => item.label));
  }, [hasClusterData, clusterLegendItems]);

  useEffect(() => {
    if (!hasScatterData) {
      setAxisViewX('');
      setAxisViewY('');
      return;
    }
    const defaultX = scatterMode === '2d' ? scatterAxisX : 'UMAP1';
    const defaultY = scatterMode === '2d' ? scatterAxisY : 'UMAP2';
    setAxisViewX((prev) => (prev ? prev : defaultX || 'UMAP1'));
    setAxisViewY((prev) => (prev ? prev : defaultY || 'UMAP2'));
  }, [hasScatterData, scatterAxisX, scatterAxisY, scatterMode]);


  const colorRange = useMemo(() => {
    if (!colorField || colorMode !== 'column') return null;
    const values = activeScatterData
      .map((point) => Number(point[colorField]))
      .filter((value) => Number.isFinite(value));
    if (values.length === 0) return null;
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [colorField, activeScatterData, colorMode]);

  const colorGradient = useMemo(() => {
    const total = SCATTER_COLOR_SCALE.length - 1;
    return `linear-gradient(90deg, ${SCATTER_COLOR_SCALE.map(
      (color, index) => `${color} ${(index / total) * 100}%`
    ).join(', ')})`;
  }, []);
  const activeGroupBy = colorMode === 'cluster' ? 'group' : 'source';
  const activeGroupOrder =
    colorMode === 'cluster'
      ? clusterLegendItems.map((item) => item.label)
      : sourceLegendItems.map((item) => item.label);
  const activeFilterSources = selectedSources;
  const activeFilterGroups = hasClusterData ? selectedClusters : null;
  const legendCount =
    colorMode === 'column'
      ? colorFieldOptions.length
      : colorMode === 'cluster'
        ? clusterLegendItems.length
        : sourceLegendItems.length;
  const selectedCount = selectedPoints.length;
  const canReduce = hasScatterData && reductionColumnOptions.length > 0 && !isLoading;
  const reductionConfirmDisabled =
    reductionColumns.length === 0 || isLoading || !hasScatterData;
  const effectiveColorField = colorMode === 'column' ? colorField : '';

  const axisDisplayData = useMemo(() => {
    if (!hasScatterData) return displayData;
    const resolveAxisValue = (point, axis) => {
      if (axis === 'UMAP1') return point?.x;
      if (axis === 'UMAP2') return point?.y;
      return point?.[axis];
    };
    return activeScatterData.map((point) => ({
      ...point,
      x: resolveAxisValue(point, axisViewX),
      y: resolveAxisValue(point, axisViewY),
    }));
  }, [activeScatterData, axisViewX, axisViewY, displayData, hasScatterData]);

  const filteredScatterData = useMemo(() => {
    if (!hasScatterData) return [];
    const sourceSet = Array.isArray(selectedSources) ? new Set(selectedSources) : null;
    const groupSet =
      hasClusterData && Array.isArray(selectedClusters) ? new Set(selectedClusters) : null;
    return axisDisplayData.filter((point) => {
      const sourceLabel = normalizeSourceValue(point?.source ?? point?.sourceId);
      if (sourceSet && sourceSet.size > 0 && !sourceSet.has(sourceLabel)) {
        return false;
      }
      if (groupSet) {
        const groupLabel = normalizeGroupValue(point?.group ?? point?.cluster);
        if (!groupSet.has(groupLabel)) {
          return false;
        }
      }
      return true;
    });
  }, [axisDisplayData, hasClusterData, hasScatterData, selectedClusters, selectedSources]);

  const computedPreviewAxisRange = useMemo(() => {
    if (!axisDisplayData || axisDisplayData.length === 0) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    axisDisplayData.forEach((point) => {
      const x = Number(point?.x);
      const y = Number(point?.y);
      if (Number.isFinite(x)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
      if (Number.isFinite(y)) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    });
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
    const padX = (maxX - minX) * 0.05 || 1;
    const padY = (maxY - minY) * 0.05 || 1;
    return {
      x: [minX - padX, maxX + padX],
      y: [minY - padY, maxY + padY],
    };
  }, [axisDisplayData]);
  const handlePlotReady = useCallback((graphDiv) => {
    if (graphDiv) {
      mainPlotRef.current = graphDiv;
    }
  }, []);

  const previewLabelItems = useMemo(() => {
    if (colorMode === 'column') {
      return colorFieldOptions.map((label) => ({ label }));
    }
    if (colorMode === 'cluster') {
      return clusterLegendItems;
    }
    return sourceLegendItems;
  }, [colorMode, colorFieldOptions, clusterLegendItems, sourceLegendItems]);

  const sanitizeFileName = (value) =>
    String(value || 'preview').replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '');

  const handleDownloadPreview = (preview) => {
    if (!preview?.url) return;
    const link = document.createElement('a');
    link.href = preview.url;
    link.download = `scatter-preview-${sanitizeFileName(preview.label)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGeneratePreviews = async () => {
    if (!Plotly) {
      setPreviewError('预览初始化失败，请刷新页面重试');
      return;
    }
    if (!filteredScatterData || filteredScatterData.length === 0) {
      setPreviewError('暂无可用于预览的数据');
      return;
    }
    if (colorMode === 'column' && colorFieldOptions.length === 0) {
      setPreviewError('暂无可用变量');
      return;
    }
    setPreviewError('');
    setIsPreviewGenerating(true);
    const previews = [];
    const fontFamily = 'Noto Sans SC, sans-serif';
    const previewColorscale = SCATTER_COLOR_SCALE.map((color, index) => [
      index / (SCATTER_COLOR_SCALE.length - 1),
      color,
    ]);
    const mainLayout = mainPlotRef.current?._fullLayout || mainPlotRef.current?.layout;
    const mainXRange = mainLayout?.xaxis?.range;
    const mainYRange = mainLayout?.yaxis?.range;
    const axisRange =
      Array.isArray(mainXRange) && Array.isArray(mainYRange)
        ? { x: [...mainXRange], y: [...mainYRange] }
        : computedPreviewAxisRange;
    const hasAxisRange = Boolean(axisRange?.x && axisRange?.y);
    try {
      for (const item of previewLabelItems) {
        let points = filteredScatterData;
        let marker = {};
        let label = item.label;
        let count = filteredScatterData.length;
        if (colorMode === 'cluster') {
          points = filteredScatterData.filter(
            (point) => normalizeGroupValue(point?.group ?? point?.cluster) === item.label
          );
          count = points.length;
          marker = {
            size: scatterPointSize,
            color: item.color || '#2563eb',
            opacity: 0.85,
          };
        } else if (colorMode === 'source') {
          points = filteredScatterData.filter(
            (point) => normalizeSourceValue(point?.source ?? point?.sourceId) === item.label
          );
          count = points.length;
          marker = {
            size: scatterPointSize,
            color: item.color || '#2563eb',
            opacity: 0.85,
          };
        } else {
          const values = filteredScatterData.map((point) => {
            const value = Number(point?.[label]);
            return Number.isFinite(value) ? value : null;
          });
          const numeric = values.filter((value) => Number.isFinite(value));
          if (numeric.length === 0) {
            continue;
          }
          const cmin = Math.min(...numeric);
          const cmax = Math.max(...numeric);
          marker = {
            size: scatterPointSize,
            color: values,
            colorscale: previewColorscale,
            cmin,
            cmax,
            opacity: 0.85,
            showscale: false,
          };
        }

        if (!points || points.length === 0) {
          continue;
        }

        const trace = {
          type: 'scatter',
          mode: 'markers',
          x: points.map((point) => point.x),
          y: points.map((point) => point.y),
          marker,
        };

        const layout = {
          width: PREVIEW_IMAGE_SIZE.width,
          height: PREVIEW_IMAGE_SIZE.height,
          margin: { l: 40, r: 10, t: 10, b: 40 },
          xaxis: {
            title: {
              text: scatterMode === '2d' ? scatterAxisX || 'X' : 'UMAP1',
              font: { family: fontFamily, size: 12 },
            },
            tickfont: { family: fontFamily, size: 10 },
            range: hasAxisRange ? axisRange.x : undefined,
            fixedrange: true,
            autorange: hasAxisRange ? false : true,
            showline: true,
            linecolor: '#111827',
            linewidth: 1,
            ticks: 'outside',
            ticklen: 4,
            tickwidth: 1,
            zeroline: false,
          },
          yaxis: {
            title: {
              text: scatterMode === '2d' ? scatterAxisY || 'Y' : 'UMAP2',
              font: { family: fontFamily, size: 12 },
            },
            tickfont: { family: fontFamily, size: 10 },
            range: hasAxisRange ? axisRange.y : undefined,
            fixedrange: true,
            autorange: hasAxisRange ? false : true,
            scaleanchor: 'x',
            scaleratio: 1,
            constrain: 'domain',
            showline: true,
            linecolor: '#111827',
            linewidth: 1,
            ticks: 'outside',
            ticklen: 4,
            tickwidth: 1,
            zeroline: false,
          },
          showlegend: false,
          paper_bgcolor: '#ffffff',
          plot_bgcolor: '#ffffff',
          font: { family: fontFamily },
        };

        const plotNode = document.createElement('div');
        plotNode.style.position = 'fixed';
        plotNode.style.left = '-9999px';
        plotNode.style.top = '0';
        plotNode.style.width = `${PREVIEW_IMAGE_SIZE.width}px`;
        plotNode.style.height = `${PREVIEW_IMAGE_SIZE.height}px`;
        document.body.appendChild(plotNode);
        let url = '';
        try {
          await Plotly.newPlot(plotNode, [trace], layout, {
            displayModeBar: false,
            staticPlot: true,
          });
          url = await Plotly.toImage(plotNode, {
            format: 'png',
            width: PREVIEW_IMAGE_SIZE.width,
            height: PREVIEW_IMAGE_SIZE.height,
            scale: 2,
          });
        } finally {
          Plotly.purge(plotNode);
          document.body.removeChild(plotNode);
        }
        previews.push({
          id: `${colorMode}-${label}`,
          label,
          url,
          count,
          color: item.color,
        });
      }
      if (previews.length === 0) {
        setPreviewError('暂无可生成预览');
      }
      setPreviewItems(previews);
    } catch (err) {
      setPreviewError('预览生成失败，请稍后重试');
    } finally {
      setIsPreviewGenerating(false);
    }
  };

  const handleToggleSource = (label, checked) => {
    setSelectedSources((prev) => {
      if (checked) {
        return prev.includes(label) ? prev : [...prev, label];
      }
      return prev.filter((item) => item !== label);
    });
  };

  const handleToggleInitialConfigColumn = (label, checked) => {
    setInitialConfigColumns((prev) => {
      if (checked) {
        return prev.includes(label) ? prev : [...prev, label];
      }
      return prev.filter((item) => item !== label);
    });
  };

  const handleToggleCluster = (label, checked) => {
    setSelectedClusters((prev) => {
      if (checked) {
        return prev.includes(label) ? prev : [...prev, label];
      }
      return prev.filter((item) => item !== label);
    });
  };

  const handleToggleReductionColumn = (label, checked) => {
    setReductionColumns((prev) => {
      if (checked) {
        return prev.includes(label) ? prev : [...prev, label];
      }
      return prev.filter((item) => item !== label);
    });
  };

  const addFlowStep = (type, detail, reset = false) => {
    const timestamp = new Date();
    setAnalysisFlow((prev) => {
      const entry = {
        id: `${timestamp.getTime()}-${reset ? 0 : prev.length}`,
        type,
        detail,
        time: timestamp.toISOString(),
      };
      return reset ? [entry] : [...prev, entry];
    });
    setAnalysisFlowFuture([]);
  };

  const handleOpenReduction = () => {
    const defaults =
      lastReductionColumns.length > 0
        ? lastReductionColumns
        : scatterMode === 'reduction'
          ? selectedColumns
          : [];
    const nextDefaults = defaults.filter((label) => reductionColumnOptions.includes(label));
    setReductionColumns(nextDefaults);
    setIsReductionOpen(true);
  };

  const handleClearSelection = () => {
    setClearSelectionSignal((prev) => prev + 1);
    handleScatterSelection([]);
  };

  const handleRestorePrevious = () => {
    if (!canRestorePrevious) return;
    setAnalysisFlow((prev) => {
      if (prev.length === 0) return prev;
      const lastEntry = prev[prev.length - 1];
      setAnalysisFlowFuture((future) => [...future, lastEntry]);
      return prev.slice(0, -1);
    });
    restoreScatterPrevious();
  };

  const handleRestoreNext = () => {
    if (!canRestoreNext) return;
    setAnalysisFlowFuture((prev) => {
      if (prev.length === 0) return prev;
      const lastEntry = prev[prev.length - 1];
      setAnalysisFlow((flow) => [...flow, lastEntry]);
      return prev.slice(0, -1);
    });
    restoreScatterNext();
  };

  const handleToggleClusterDropColumn = (label, checked) => {
    setClusterDropColumns((prev) => {
      if (checked) {
        return prev.includes(label) ? prev : [...prev, label];
      }
      return prev.filter((item) => item !== label);
    });
  };

  const handleSave = () => {
    if (isSaveDisabled) return;
    saveScatterResult(saveName);
    setSaveName('');
    setIsSaveOpen(false);
  };

  const handleGenerate = async (override = {}) => {
    const mode = override.mode ?? scatterMode;
    const columns = override.columns ?? selectedColumns;
    const axisX = override.axisX ?? scatterAxisX;
    const axisY = override.axisY ?? scatterAxisY;
    const sources = override.sources ?? selectedSources;
    const rowLimitValue = override.rowLimitInput ?? rowLimitInput;
    const sourceType = override.sourceType ?? analysisSource;
    const sourcePoints = override.sourcePoints ?? analysisSourcePoints;
    const sourceLabel = override.sourceLabel ?? analysisSourceLabel;
    const fileNames = override.fileNames;
    if (mode === 'reduction' && columns.length === 0) return false;
    if (mode === '2d' && (!axisX || !axisY)) return false;
    if (!sources || sources.length === 0) return false;
    const parsed = Number.parseInt(rowLimitValue, 10);
    const nextLimit = Number.isNaN(parsed) ? rowLimit : Math.max(1, parsed);
    setRowLimit(nextLimit);
    setRowLimitInput(String(nextLimit));
    setIsScatterUpdating(true);
    let success = false;
    let flowDetail = '';
    try {
      if (sourceType === 'files') {
        if (mode === '2d') {
          success = await fetchScatter2D({
            xColumn: axisX,
            yColumn: axisY,
            sources,
            limitOverride: nextLimit,
            fileNames,
          });
        } else {
          success = await fetchScatterByFilters({
            columns,
            sources,
            limitOverride: nextLimit,
            fileNames,
          });
        }
      } else {
        const filteredPoints = (sourcePoints || []).filter((point) =>
          sources.includes(normalizeSourceValue(point?.source ?? point?.sourceId))
        );
        const limitedPoints =
          Number.isFinite(nextLimit) && nextLimit > 0
            ? filteredPoints.slice(0, nextLimit)
            : filteredPoints;
        if (mode === '2d') {
          const mappedPoints = limitedPoints
            .map((point, index) => {
              const x = Number(point?.[axisX]);
              const y = Number(point?.[axisY]);
              if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
              return {
                ...point,
                id: point?.id ?? index,
                x,
                y,
                source: normalizeSourceValue(point?.source ?? point?.sourceId),
                sourceId: normalizeSourceValue(point?.sourceId ?? point?.source),
              };
            })
            .filter(Boolean);
          applyScatterPoints(mappedPoints, { message: '散点图生成成功' });
          success = mappedPoints.length > 0;
        } else {
          success = await fetchScatterFromPoints({
            points: limitedPoints,
            columns,
            limitOverride: nextLimit,
          });
        }
      }
    } finally {
      setIsScatterUpdating(false);
    }
    if (success) {
      const modeLabel = mode === '2d' ? '二维' : '降维';
      flowDetail = `${modeLabel} · ${sourceLabel} · ${sources.length} 源 · ${nextLimit} 行`;
      addFlowStep('生成散点图', flowDetail, true);
      if (mode === 'reduction') {
        setLastReductionColumns(columns);
      }
    }
    return success;
  };

  const handleInitialConfigConfirm = async () => {
    if (isInitialConfigGenerateDisabled) return;
    setIsInitialConfigOpen(false);
    setAnalysisFlow([]);
    setAnalysisFlowFuture([]);
    setAnalysisSource('files');
    setAnalysisSourceResultId('');
    applyAnalysisMetadata(initialConfigMetadata, initialConfigSelectedFiles);
    setScatterMode(initialConfigMode);
    if (initialConfigMode === '2d') {
      handleScatterAxisChange(initialConfigAxisX, initialConfigAxisY);
    } else {
      setSelectedColumns(initialConfigColumns);
    }
    setSelectedSources(initialConfigSelectedFiles);
    await handleGenerate({
      mode: initialConfigMode,
      columns: initialConfigColumns,
      axisX: initialConfigAxisX,
      axisY: initialConfigAxisY,
      sources: initialConfigSelectedFiles,
      rowLimitInput: initialConfigRowLimit,
      sourceType: 'files',
      sourceLabel: '原始文件',
      fileNames: initialConfigSelectedFiles,
    });
  };

  const hasInitialConfigColumns = initialConfigNumericColumns.length > 0;
  const isInitialConfigGenerateDisabled =
    (initialConfigMode === 'reduction'
      ? initialConfigColumns.length === 0 || !hasInitialConfigColumns
      : !initialConfigAxisX || !initialConfigAxisY || !hasInitialConfigColumns) ||
    initialConfigSelectedFiles.length === 0 ||
    isLoading ||
    isInitialConfigFilesLoading ||
    isInitialConfigMetadataLoading;
  const isConfirmDisabled = selectedPoints.length === 0 || isLoading || !hasScatterData;

  const handleClusterAnalysis = () => {
    if (isClusterDisabled) return;
    setIsClusterConfigOpen(true);
  };

  const handleClusterConfirm = async () => {
    setIsClusterConfigOpen(false);
    setIsClustering(true); // 开始加载
    const parsedK = Number.parseInt(clusterKInput, 10);
    const parsedIterations = Number.parseInt(clusterIterationsInput, 10);
    const parsedSeed = Number.parseInt(clusterSeedInput, 10);
    const parsedResolution = Number.parseFloat(clusterResolutionInput);
    const options = {
      k: Number.isFinite(parsedK) ? parsedK : 20,
      resolution: Number.isFinite(parsedResolution) ? parsedResolution : 1.0,
      n_iterations: Number.isFinite(parsedIterations) ? parsedIterations : 20,
      seed: Number.isFinite(parsedSeed) ? parsedSeed : 123,
      dropColumns: clusterDropColumns,
    };
    const clusterPoints = selectedPoints.length > 0 ? selectedPoints : activeScatterData;
    const success = await handleClusterFromPoints(clusterPoints, options);
    setIsClustering(false); // 结束加载
    if (success) {
      setIsClusterConfigOpen(false);
      setColorMode('cluster');
      addFlowStep(
        '聚类分析',
        `点数 ${clusterPoints.length} · k=${options.k} · resolution=${options.resolution}`
      );
      navigate('/cluster');
    }
  };

  const handleConfirmSelection = async () => {
    if (isConfirmDisabled) return;
    const count = selectedPoints.length;
    setIsScatterUpdating(true);
    try {
      const success = await confirmScatterSelection();
      if (success) {
        setClearSelectionSignal((prev) => prev + 1);
        addFlowStep('确定筛选', `保留 ${count} 个点`);
      }
    } finally {
      setIsScatterUpdating(false);
    }
  };

  const handleReductionConfirm = async () => {
    if (reductionConfirmDisabled) return;
    setIsReductionOpen(false);
    const points = selectedPoints.length > 0 ? selectedPoints : activeScatterData;
    if (scatterMode !== 'reduction') {
      setScatterMode('reduction');
    }
    setIsScatterUpdating(true);
    try {
      const success = await fetchScatterFromPoints({
        points,
        columns: reductionColumns,
        limitOverride: points.length,
      });
      if (success) {
        setSelectedColumns(reductionColumns);
        setLastReductionColumns(reductionColumns);
        addFlowStep(
          '降维分析',
          `变量 ${reductionColumns.length} 项 · 点数 ${points.length}`
        );
      }
    } finally {
      setIsScatterUpdating(false);
    }
  };

  return (
    <PageLayout
      title="数据分析"
      subtitle="选择维度与文件范围后生成散点图"
      error={error}
      warning={warning}
      containerClassName="max-w-none px-0 sm:px-0 lg:px-0 py-4"
      cardClassName="border-0 shadow-none bg-transparent"
      contentClassName="p-0"
      stackClassName="gap-4"
    >
      <div
        className="relative h-full"
        style={{
          opacity: layoutReady ? 1 : 0,
          pointerEvents: layoutReady ? 'auto' : 'none',
        }}
      >
        {isClusterLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl bg-slate-900/50 backdrop-blur-sm">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/60 border-t-white" />
            <p className="mt-3 text-sm font-medium text-white">正在进行聚类分析...</p>
          </div>
        )}
        <div className="flex h-full min-h-0 flex-col gap-4">
          <Collapsible open={isFlowOpen} onOpenChange={setIsFlowOpen}>
            <div className="rounded-xl border border-slate-200 bg-white/85">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">分析流程记录</span>
                  <span className="text-xs text-slate-500">{analysisFlow.length} 条</span>
                </div>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 transition hover:bg-slate-50"
                  >
                    {isFlowOpen ? '收起' : '展开'}
                    {isFlowOpen ? (
                      <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    {analysisFlow.length === 0 && (
                      <div className="text-xs text-slate-500">暂无流程记录</div>
                    )}
                    {analysisFlow.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-3">
                        {index > 0 && <div className="h-px w-6 bg-slate-200" />}
                        <div className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                          <div className="text-xs font-semibold text-slate-700">{item.type}</div>
                          <div className="mt-1 text-sm text-slate-600">{item.detail}</div>
                          <div className="mt-1 text-xs text-slate-400">
                            {new Date(item.time).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
          <div
            ref={setAnalysisAreaNode}
            className={`grid h-full min-h-0 gap-4 md:gap-6 md:grid-cols-[minmax(0,2.5fr)_minmax(0,6.5fr)_minmax(0,2fr)] md:items-stretch ${layoutReady ? 'visible' : 'invisible'}`}
            style={{ height: analysisAreaHeight }}
          >
            <aside className="h-full min-h-0 overflow-y-auto space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white/90 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">分析配置</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsInitialConfigOpen(true)}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    新建分析
                  </button>
                </div>
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">坐标轴选择</p>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-600">X轴字段</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:border-slate-300"
                            >
                              <span>{axisViewX || '请选择X轴'}</span>
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72" align="start">
                            <div className="space-y-2">
                              {axisFieldOptions.map((option) => {
                                const checked = axisViewX === option.value;
                                return (
                                  <label
                                    key={`axis-view-x-${option.value}`}
                                    className="flex items-center gap-2 text-sm text-slate-700"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) => {
                                        if (value === true) {
                                          setAxisViewX(option.value);
                                          setClearSelectionSignal((prev) => prev + 1);
                                        }
                                      }}
                                    />
                                    <span className="truncate">{option.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-600">Y轴字段</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:border-slate-300"
                            >
                              <span>{axisViewY || '请选择Y轴'}</span>
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72" align="start">
                            <div className="space-y-2">
                              {axisFieldOptions.map((option) => {
                                const checked = axisViewY === option.value;
                                return (
                                  <label
                                    key={`axis-view-y-${option.value}`}
                                    className="flex items-center gap-2 text-sm text-slate-700"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) => {
                                        if (value === true) {
                                          setAxisViewY(option.value);
                                          setClearSelectionSignal((prev) => prev + 1);
                                        }
                                      }}
                                    />
                                    <span className="truncate">{option.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white/90 p-4">
                <h3 className="text-base font-semibold text-slate-800">数据操作</h3>
                <p className="mt-2 text-xs text-slate-500">
                  针对当前散点图进行聚类或保存结果。
                </p>
                <div className="mt-4 space-y-2">
                  <button
                    onClick={handleClusterAnalysis}
                    disabled={isClusterDisabled}
                    className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition ${
                      isClusterDisabled
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    聚类分析
                  </button>
                  <button
                    onClick={() => setIsSaveOpen(true)}
                    disabled={!hasScatterData}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                      !hasScatterData
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Save className="h-4 w-4" />
                    保存当前散点图
                  </button>
                </div>
              </div>
            </aside>

            <div className="flex h-full min-h-0 flex-col gap-3">
              <section className="min-w-0 flex-1 min-h-0 rounded-2xl border border-slate-200 bg-white/90 p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-2 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenReduction}
                      disabled={!canReduce}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        !canReduce
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-amber-600 text-white hover:bg-amber-500'
                      }`}
                    >
                      降维分析
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmSelection}
                      disabled={isConfirmDisabled}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        isConfirmDisabled
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      确定筛选
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      disabled={selectedCount === 0}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        selectedCount === 0
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      清除选择
                    </button>
                    <button
                      type="button"
                      onClick={handleRestorePrevious}
                      disabled={!canRestorePrevious}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        !canRestorePrevious
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      上一步
                    </button>
                    <button
                      type="button"
                      onClick={handleRestoreNext}
                      disabled={!canRestoreNext}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        !canRestoreNext
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      下一步
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          尺寸设置
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72" align="end">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-700">自定义尺寸</p>
                              <p className="text-xs text-slate-400">可拖动右下角调整</p>
                            </div>
                            <Switch
                              checked={isCustomSize}
                              onCheckedChange={handleScatterSizeToggle}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500">宽度 (px)</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                min={MIN_SCATTER_WIDTH}
                                max={scatterPanelWidth}
                                value={isCustomSize ? scatterWidthInput : String(resolvedScatterWidth)}
                                onChange={handleScatterWidthChange}
                                onFocus={() => setIsWidthEditing(true)}
                                onBlur={() => {
                                  setIsWidthEditing(false);
                                  applyScatterWidthInput();
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.currentTarget.blur();
                                  }
                                }}
                                disabled={!isCustomSize}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-500">高度 (px)</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                min={MIN_SCATTER_HEIGHT}
                                max={scatterPanelHeight}
                                value={isCustomSize ? scatterHeightInput : String(resolvedScatterHeight)}
                                onChange={handleScatterHeightChange}
                                onFocus={() => setIsHeightEditing(true)}
                                onBlur={() => {
                                  setIsHeightEditing(false);
                                  applyScatterHeightInput();
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.currentTarget.blur();
                                  }
                                }}
                                disabled={!isCustomSize}
                              />
                            </div>
                          </div>
                          <div className="text-xs text-slate-400">
                            范围：{MIN_SCATTER_WIDTH}-{scatterPanelWidth}px ·{' '}
                            {MIN_SCATTER_HEIGHT}-{scatterPanelHeight}px
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <span className="text-sm text-slate-600">
                      已选 <span className="font-semibold text-slate-900">{selectedCount}</span> 个点
                      <span className="text-slate-400"> / </span>
                      当前点数{' '}
                      <span className="font-semibold text-slate-900">
                        {hasScatterData ? activeScatterData.length : 0}
                      </span>
                    </span>
                  </div>
                </div>
                <div ref={setScatterPanelNode} className="relative flex-1 min-h-0">
                  <div
                    className={`relative ${isCustomSize ? 'mx-auto' : 'h-full w-full'}`}
                    style={{
                      width: isCustomSize ? `${resolvedScatterWidth}px` : '100%',
                      height: isCustomSize ? `${resolvedScatterHeight}px` : '100%',
                      cursor: isCustomSize && isResizeHover ? 'nwse-resize' : undefined,
                    }}
                    onPointerMove={handleScatterEdgePointerMove}
                    onPointerLeave={handleScatterEdgePointerLeave}
                    onPointerDown={handleScatterEdgePointerDown}
                  >
                    <ScatterPlot
                      data={axisDisplayData}
                      height={resolvedScatterHeight}
                      onSelection={hasScatterData ? handleScatterSelection : undefined}
                      showSelectionToolbar={false}
                      clearSelectionSignal={clearSelectionSignal}
                      xLabel={axisViewX || (scatterMode === '2d' ? scatterAxisX || 'X' : 'UMAP1')}
                      yLabel={axisViewY || (scatterMode === '2d' ? scatterAxisY || 'Y' : 'UMAP2')}
                      showLegend={false}
                      filterSources={hasScatterData ? activeFilterSources : null}
                      filterGroups={hasScatterData ? activeFilterGroups : null}
                      groupField="group"
                      groupBy={activeGroupBy}
                      groupOrder={activeGroupOrder}
                      colorField={effectiveColorField || null}
                      colorRange={colorRange}
                      pointSize={scatterPointSize}
                      onPlotReady={handlePlotReady}
                    />
                    {isCustomSize && (
                      <div className="pointer-events-none absolute inset-0 z-10 rounded-xl border border-slate-200/70" />
                    )}
                    {isCustomSize && (
                      <button
                        type="button"
                        aria-label="拖动调整散点图尺寸"
                        onPointerDown={handleScatterResizeStart}
                        onMouseDown={handleScatterResizeStart}
                        className="absolute bottom-1 right-1 z-20 h-6 w-6 cursor-nwse-resize rounded-md border border-slate-300 bg-white shadow"
                        style={{ touchAction: 'none' }}
                      >
                        <span className="block h-full w-full rounded-sm bg-[linear-gradient(135deg,transparent_40%,#cbd5e1_40%,#cbd5e1_50%,transparent_50%,transparent_60%,#cbd5e1_60%,#cbd5e1_70%,transparent_70%)]" />
                      </button>
                    )}
                    {showPlotMask && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/70">
                        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-amber-600" />
                        <p className="mt-3 text-sm text-slate-600">{plotMaskMessage}</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="min-w-0 shrink-0 rounded-2xl border border-slate-200 bg-white/90 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">散点预览</span>
                    {previewError && <span className="text-xs text-rose-500">{previewError}</span>}
                  </div>
                  <span className="text-xs text-slate-500">
                    {previewItems.length} 张
                  </span>
                </div>
                <div className="mt-3">
                  {previewItems.length === 0 ? (
                    <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">
                      点击右侧“颜色选择”的一键生成，生成预览图
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {previewItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActivePreview(item)}
                          className="group min-w-[180px] max-w-[200px] rounded-lg border border-slate-200 bg-white p-2 text-left transition hover:border-slate-300"
                        >
                          <div className="aspect-[3/2] overflow-hidden rounded-md bg-slate-50">
                            <img
                              src={item.url}
                              alt={item.label}
                              className="h-full w-full object-cover transition group-hover:scale-105"
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                            <span className="truncate">
                              {colorMode === 'cluster' ? `聚类 ${item.label}` : item.label}
                            </span>
                            {Number.isFinite(item.count) && <span>{item.count}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

            </div>

            <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/90 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-800">图例与筛选</h4>
                <span className="text-xs text-slate-500">{legendCount} 项</span>
              </div>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">颜色选择</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{legendCount} 项</span>
                    <button
                      type="button"
                      onClick={handleGeneratePreviews}
                      disabled={isPreviewGenerating || !hasScatterData}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        isPreviewGenerating || !hasScatterData
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {isPreviewGenerating ? '生成中...' : '一键生成'}
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm transition hover:border-slate-300"
                      >
                        <span>
                          {colorMode === 'cluster'
                            ? '聚类'
                            : colorMode === 'column'
                              ? '变量'
                              : '来源'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56" align="start">
                      <div className="space-y-2">
                        {hasClusterData && (
                          <button
                            type="button"
                            onClick={() => setColorMode('cluster')}
                            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                              colorMode === 'cluster'
                                ? 'border-slate-200 bg-slate-100 text-slate-700'
                                : 'border-transparent text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span>聚类</span>
                            {colorMode === 'cluster' && (
                              <span className="text-xs text-slate-500">当前</span>
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setColorMode('source')}
                          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                            colorMode === 'source'
                              ? 'border-slate-200 bg-slate-100 text-slate-700'
                              : 'border-transparent text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>来源</span>
                          {colorMode === 'source' && (
                            <span className="text-xs text-slate-500">当前</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setColorMode('column')}
                          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                            colorMode === 'column'
                              ? 'border-slate-200 bg-slate-100 text-slate-700'
                              : 'border-transparent text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>变量</span>
                          {colorMode === 'column' && (
                            <span className="text-xs text-slate-500">当前</span>
                          )}
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {colorMode === 'column' && (
                <div className="mt-3 space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">数值色阶</span>
                      {effectiveColorField && colorRange && (
                        <span className="text-xs text-slate-500">
                          {`${colorRange.min.toFixed(2)} ~ ${colorRange.max.toFixed(2)}`}
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm transition hover:border-slate-300"
                          >
                            <span>{effectiveColorField || '暂无可选列'}</span>
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72" align="start">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">变量</span>
                            {effectiveColorField && (
                              <button
                                type="button"
                                onClick={() => setColorField('')}
                                className="text-xs text-slate-500 transition hover:text-slate-700"
                              >
                                清空
                              </button>
                            )}
                          </div>
                          <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                            {colorFieldOptions.map((label) => {
                              const checked = effectiveColorField === label;
                              return (
                                <label
                                  key={label}
                                  className="flex items-center gap-2 text-sm text-slate-700"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(value) => {
                                      if (value === true) {
                                        setColorField(label);
                                      } else if (checked) {
                                        setColorField('');
                                      }
                                    }}
                                  />
                                  <span className="truncate">{label}</span>
                                </label>
                              );
                            })}
                            {colorFieldOptions.length === 0 && (
                              <div className="text-xs text-slate-500">暂无可选列</div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="mt-3 h-2.5 w-full rounded-full" style={{ background: colorGradient }} />
                    <p className="mt-2 text-xs text-slate-500">
                      选择数值列后，点颜色将随数值变化
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-3 flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
                <Collapsible open={isSourceLegendOpen} onOpenChange={setIsSourceLegendOpen}>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>来源筛选</span>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 px-2 py-1 text-[11px] text-slate-500 transition hover:bg-slate-50"
                      >
                        {isSourceLegendOpen ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-2">
                      {sourceLegendItems.map((item) => {
                        const isEnabled = selectedSources.includes(item.label);
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => handleToggleSource(item.label, !isEnabled)}
                            className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                              isEnabled
                                ? 'border-slate-100 bg-slate-50/70 text-slate-700 hover:border-slate-200'
                                : 'border-slate-200 bg-slate-100/80 text-slate-400'
                            }`}
                            aria-pressed={isEnabled}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-3 w-3 rounded-sm"
                                style={{ backgroundColor: item.color, opacity: isEnabled ? 1 : 0.4 }}
                              />
                              <span
                                className={`truncate ${isEnabled ? 'text-slate-700' : 'line-through'}`}
                              >
                                {item.label}
                              </span>
                            </div>
                            <span
                              className={`text-xs ${isEnabled ? 'text-slate-500' : 'text-slate-400'}`}
                            >
                              {item.count}
                            </span>
                          </button>
                        );
                      })}
                      {sourceLegendItems.length === 0 && (
                        <div className="text-xs text-slate-500">暂无来源图例</div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {hasClusterData && (
                  <Collapsible open={isClusterLegendOpen} onOpenChange={setIsClusterLegendOpen}>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>聚类筛选</span>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-2 py-1 text-[11px] text-slate-500 transition hover:bg-slate-50"
                        >
                          {isClusterLegendOpen ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="mt-2 space-y-2">
                        {clusterLegendItems.map((item) => {
                          const isEnabled = selectedClusters.includes(item.label);
                          return (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => handleToggleCluster(item.label, !isEnabled)}
                              className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                                isEnabled
                                  ? 'border-slate-100 bg-slate-50/70 text-slate-700 hover:border-slate-200'
                                  : 'border-slate-200 bg-slate-100/80 text-slate-400'
                              }`}
                              aria-pressed={isEnabled}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className="h-3 w-3 rounded-sm"
                                  style={{ backgroundColor: item.color, opacity: isEnabled ? 1 : 0.4 }}
                                />
                                <span
                                  className={`truncate ${isEnabled ? 'text-slate-700' : 'line-through'}`}
                                >
                                  聚类 {item.label}
                                </span>
                              </div>
                              <span
                                className={`text-xs ${isEnabled ? 'text-slate-500' : 'text-slate-400'}`}
                              >
                                {item.count}
                              </span>
                            </button>
                          );
                        })}
                        {clusterLegendItems.length === 0 && (
                          <div className="text-xs text-slate-500">暂无聚类图例</div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">点大小</span>
                  <span className="text-xs text-slate-500">{scatterPointSize.toFixed(1)} px</span>
                </div>
                <div className="mt-3">
                  <Slider
                    value={[scatterPointSize]}
                    min={2}
                    max={12}
                    step={0.5}
                    onValueChange={(value) => {
                      const next = Number(value?.[0]);
                      if (Number.isFinite(next)) {
                        setScatterPointSize(next);
                      }
                    }}
                  />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <Dialog open={isInitialConfigOpen} onOpenChange={setIsInitialConfigOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>初始配置</DialogTitle>
            <DialogDescription>选择分析模式、维度与文件范围后生成散点图。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">分析模式</p>
              <div className="flex rounded-lg border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setInitialConfigMode('reduction')}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    initialConfigMode === 'reduction'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  降维散点图
                </button>
                <button
                  type="button"
                  onClick={() => setInitialConfigMode('2d')}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    initialConfigMode === '2d'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  二维散点图
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">选择文件</p>
              {isInitialConfigFilesLoading ? (
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
                  正在加载文件列表...
                </div>
              ) : initialConfigFiles.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  暂无可用文件，请先上传。
                </div>
              ) : (
                <div className="space-y-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:border-slate-300"
                      >
                        <span>
                          {initialConfigSelectedFiles.length > 0
                            ? `已选 ${initialConfigSelectedFiles.length} 个文件`
                            : '请选择文件'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">文件列表</span>
                        {initialConfigFiles.length > 0 && (
                          <div className="flex items-center gap-3 text-xs">
                            <button
                              type="button"
                              onClick={() =>
                                setInitialConfigSelectedFiles(
                                  initialConfigFiles.map((file) => file.name)
                                )
                              }
                              className="text-slate-500 transition hover:text-slate-700"
                            >
                              全选
                            </button>
                            <button
                              type="button"
                              onClick={() => setInitialConfigSelectedFiles([])}
                              className="text-slate-500 transition hover:text-slate-700"
                            >
                              清空
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                        {initialConfigFiles.map((file) => {
                          const checked = initialConfigSelectedFiles.includes(file.name);
                          return (
                            <label
                              key={file.name}
                              className="flex items-center gap-2 text-sm text-slate-700"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) =>
                                  toggleInitialConfigFile(
                                    file.name,
                                    value === true
                                  )
                                }
                              />
                              <span className="truncate">{file.name}</span>
                            </label>
                          );
                        })}
                        {initialConfigFiles.length === 0 && (
                          <div className="text-xs text-slate-500">暂无可选文件</div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {initialConfigSelectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {initialConfigSelectedFiles.map((name) => (
                        <span
                          key={name}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                  {isInitialConfigMetadataLoading && (
                    <div className="text-xs text-slate-500">正在加载列信息...</div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {initialConfigMode === 'reduction' ? (
                <>
                  <p className="text-sm font-medium text-slate-700">维度选择</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:border-slate-300"
                      >
                        <span>
                          {initialConfigColumns.length > 0
                            ? `已选 ${initialConfigColumns.length} 项`
                            : '请选择列'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72" align="start">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">变量</span>
                        {initialConfigNumericColumns.length > 0 && (
                          <div className="flex items-center gap-3 text-xs">
                            <button
                              type="button"
                              onClick={() => setInitialConfigColumns(initialConfigNumericColumns)}
                              className="text-slate-500 transition hover:text-slate-700"
                            >
                              全选
                            </button>
                            <button
                              type="button"
                              onClick={() => setInitialConfigColumns([])}
                              className="text-slate-500 transition hover:text-slate-700"
                            >
                              清空
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                        {initialConfigNumericColumns.map((label) => (
                          <label
                            key={label}
                            className="flex items-center gap-2 text-sm text-slate-700"
                          >
                            <Checkbox
                              checked={initialConfigColumns.includes(label)}
                              onCheckedChange={(checked) =>
                                handleToggleInitialConfigColumn(label, checked === true)
                              }
                            />
                            <span className="truncate">{label}</span>
                          </label>
                        ))}
                        {initialConfigNumericColumns.length === 0 && (
                          <div className="text-xs text-slate-500">暂无可选列</div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {initialConfigColumns.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {initialConfigColumns.map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700">坐标轴选择</p>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">X轴变量</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:border-slate-300"
                            >
                              <span>{initialConfigAxisX || '请选择X轴变量'}</span>
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72" align="start">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-700">变量</span>
                              {initialConfigAxisX && (
                                <button
                                  type="button"
                                  onClick={() => setInitialConfigAxisX('')}
                                  className="text-xs text-slate-500 transition hover:text-slate-700"
                                >
                                  清空
                                </button>
                              )}
                            </div>
                            <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                              {initialConfigAxisColumns.map((label) => {
                                const checked = initialConfigAxisX === label;
                                return (
                                  <label
                                    key={label}
                                    className="flex items-center gap-2 text-sm text-slate-700"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) => {
                                        if (value === true) {
                                          setInitialConfigAxisX(label);
                                        } else if (checked) {
                                          setInitialConfigAxisX('');
                                        }
                                      }}
                                    />
                                    <span className="truncate">{label}</span>
                                  </label>
                                );
                              })}
                              {initialConfigAxisColumns.length === 0 && (
                                <div className="text-xs text-slate-500">暂无可选列</div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">Y轴变量</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:border-slate-300"
                            >
                              <span>{initialConfigAxisY || '请选择Y轴变量'}</span>
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72" align="start">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-700">变量</span>
                              {initialConfigAxisY && (
                                <button
                                  type="button"
                                  onClick={() => setInitialConfigAxisY('')}
                                  className="text-xs text-slate-500 transition hover:text-slate-700"
                                >
                                  清空
                                </button>
                              )}
                            </div>
                            <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                              {initialConfigAxisColumns.map((label) => {
                                const checked = initialConfigAxisY === label;
                                return (
                                  <label
                                    key={label}
                                    className="flex items-center gap-2 text-sm text-slate-700"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) => {
                                        if (value === true) {
                                          setInitialConfigAxisY(label);
                                        } else if (checked) {
                                          setInitialConfigAxisY('');
                                        }
                                      }}
                                    />
                                    <span className="truncate">{label}</span>
                                  </label>
                                );
                              })}
                              {initialConfigAxisColumns.length === 0 && (
                                <div className="text-xs text-slate-500">暂无可选列</div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">随机读取行数</p>
              <Input
                id="scatter-row-limit"
                type="number"
                min="1"
                value={initialConfigRowLimit}
                onChange={(event) => setInitialConfigRowLimit(event.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsInitialConfigOpen(false)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleInitialConfigConfirm}
              disabled={isInitialConfigGenerateDisabled}
              className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition ${
                isInitialConfigGenerateDisabled
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isLoading || isScatterUpdating ? '生成中...' : '确定'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(activePreview)}
        onOpenChange={(open) => {
          if (!open) setActivePreview(null);
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>图片预览</DialogTitle>
            <DialogDescription>
              {activePreview?.label ? `预览：${activePreview.label}` : '散点预览'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-slate-200 bg-white">
            {activePreview?.url ? (
              <img
                src={activePreview.url}
                alt={activePreview.label || 'preview'}
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />
            ) : null}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => handleDownloadPreview(activePreview)}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              下载图片
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReductionOpen} onOpenChange={setIsReductionOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>降维分析</DialogTitle>
            <DialogDescription>选择用于降维的变量。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <Label>变量</Label>
              {reductionColumnOptions.length > 0 && (
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => setReductionColumns(reductionColumnOptions)}
                    className="transition hover:text-slate-700"
                  >
                    全选
                  </button>
                  <button
                    type="button"
                    onClick={() => setReductionColumns([])}
                    className="transition hover:text-slate-700"
                  >
                    清空
                  </button>
                </div>
              )}
            </div>
            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {reductionColumnOptions.map((label) => (
                <label key={label} className="flex items-center gap-2 text-sm text-slate-700">
                  <Checkbox
                    checked={reductionColumns.includes(label)}
                    onCheckedChange={(checked) =>
                      handleToggleReductionColumn(label, checked === true)
                    }
                  />
                  <span className="truncate">{label}</span>
                </label>
              ))}
              {reductionColumnOptions.length === 0 && (
                <div className="text-xs text-slate-500">暂无可选列</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsReductionOpen(false)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleReductionConfirm}
              disabled={reductionConfirmDisabled}
              className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition ${
                reductionConfirmDisabled
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-600 text-white hover:bg-amber-500'
              }`}
            >
              确定
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isClusterConfigOpen} onOpenChange={setIsClusterConfigOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>聚类分析参数</DialogTitle>
            <DialogDescription>设置 Leiden 聚类参数与排除变量。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cluster-k">k (近邻数)</Label>
              <Input
                id="cluster-k"
                type="number"
                min="1"
                value={clusterKInput}
                onChange={(event) => setClusterKInput(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cluster-resolution">resolution</Label>
              <Input
                id="cluster-resolution"
                type="number"
                step="0.1"
                min="0"
                value={clusterResolutionInput}
                onChange={(event) => setClusterResolutionInput(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cluster-iterations">n_iterations</Label>
              <Input
                id="cluster-iterations"
                type="number"
                min="1"
                value={clusterIterationsInput}
                onChange={(event) => setClusterIterationsInput(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cluster-seed">seed</Label>
              <Input
                id="cluster-seed"
                type="number"
                value={clusterSeedInput}
                onChange={(event) => setClusterSeedInput(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>排除变量</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:border-slate-300"
                >
                  <span>
                    {clusterDropColumns.length > 0
                      ? `已排除 ${clusterDropColumns.length} 项`
                      : '请选择要排除的列'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="start">
                <div className="space-y-2">
                  {clusterColumnOptions.map((item) => {
                    const checked = clusterDropColumns.includes(item);
                    return (
                      <label key={item} className="flex items-center gap-2 text-sm text-slate-700">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => handleToggleClusterDropColumn(item, value === true)}
                        />
                        <span className="truncate">{item}</span>
                      </label>
                    );
                  })}
                  {clusterColumnOptions.length === 0 && (
                    <div className="text-xs text-slate-500">暂无可选列</div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsClusterConfigOpen(false)}
              disabled={isClustering}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleClusterConfirm}
              disabled={isClusterDisabled || isClustering}
              className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition ${
                isClusterDisabled || isClustering
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isClustering ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                  正在分析...
                </>
              ) : (
                '开始聚类'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>保存散点图结果</DialogTitle>
            <DialogDescription>为当前散点图结果设置一个名称，方便后续查找。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="scatter-save-name">保存名称</Label>
            <Input
              id="scatter-save-name"
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="例如：筛选A样本散点图"
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsSaveOpen(false)}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaveDisabled}
              className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${
                isSaveDisabled
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              保存
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default ScatterPage;
