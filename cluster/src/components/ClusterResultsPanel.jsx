import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { ChevronDown, ChevronUp, Download, GitBranch, Save } from 'lucide-react';
import Plotly from 'plotly.js-dist-min';
import HeatmapDendrogram from './HeatmapDendrogram';
import { SCATTER_COLOR_SCALE, getScatterColor } from './ScatterPlot';
import { useDataContext } from '../context/data-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Slider } from './ui/slider';

const normalizeGroupValue = (value) =>
  value === null || value === undefined || value === '' ? '' : String(value);

const PREVIEW_IMAGE_SIZE = { width: 360, height: 240 };

const buildScatterTableColumns = (rows) => {
  if (!rows || rows.length === 0) return [];
  const excluded = new Set(['id', 'originalData', '__index']);
  const keys = new Set();
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!excluded.has(key)) {
        keys.add(key);
      }
    });
  });
  const preferred = ['group', 'source', 'sourceId', 'x', 'y'];
  const ordered = preferred.filter((key) => keys.has(key));
  const rest = Array.from(keys).filter((key) => !preferred.includes(key));
  return [...ordered, ...rest];
};

const formatTableValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : value.toFixed(4);
  }
  return String(value);
};

const escapeValue = (value) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const buildCsv = (rows) => {
  if (!rows || rows.length === 0) return '';
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => escapeValue(row?.[key])).join(',')),
  ];
  return lines.join('\n');
};

const buildHeatmapCsv = (heatmap) => {
  if (!heatmap || !Array.isArray(heatmap.values) || heatmap.values.length === 0) return '';
  const rows = heatmap.rows || [];
  const cols = heatmap.cols || [];
  const values = heatmap.values || [];
  const headers = ['row', ...cols];
  const lines = [headers.map(escapeValue).join(',')];
  values.forEach((rowValues, index) => {
    const label = rows[index] ?? `row${index + 1}`;
    const row = [label, ...(rowValues || [])];
    lines.push(row.map(escapeValue).join(','));
  });
  return lines.join('\n');
};

const remapScatterRowsForExport = (rows, axisMap) => {
  if (!rows || rows.length === 0) return [];
  if (!axisMap?.x && !axisMap?.y) return rows;
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const next = { ...row };
    if (axisMap.x && Object.prototype.hasOwnProperty.call(next, 'x')) {
      next[axisMap.x] = next.x;
      delete next.x;
    }
    if (axisMap.y && Object.prototype.hasOwnProperty.call(next, 'y')) {
      next[axisMap.y] = next.y;
      delete next.y;
    }
    return next;
  });
};

const downloadCsv = (filename, rows) => {
  const csv = buildCsv(rows);
  if (!csv) return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

const downloadHeatmapCsv = (filename, heatmap) => {
  const csv = buildHeatmapCsv(heatmap);
  if (!csv) return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

const sanitizeFileName = (value) =>
  String(value || 'preview').replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '');

const ClusterResultsPanel = forwardRef(({ onUseAsInput }, ref) => {
  const {
    scatterMode,
    scatterAxisX,
    scatterAxisY,
    scatterSelectedColumns,
    scatterColorField,
    setScatterColorField,
    clusterData,
    scatterData,
    showCluster,
    heatmapPayload,
    saveClusterResult,
  } = useDataContext();
  const [isSaveOpen, setIsSaveOpen] = useState(false);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    openSaveDialog: () => {
      setIsSaveOpen(true);
    },
  }));
  const [isSourceOpen, setIsSourceOpen] = useState(true);
  const [isGroupOpen, setIsGroupOpen] = useState(true);
  const [saveName, setSaveName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState(null);
  const [selectedSources, setSelectedSources] = useState(null);
  const [scatterPlotNode, setScatterPlotNode] = useState(null);
  const [scatterPlotHeight, setScatterPlotHeight] = useState(560);
  const [scatterAreaHeight, setScatterAreaHeight] = useState(560);
  const [scatterAreaNode, setScatterAreaNode] = useState(null);
  const [heatmapSize, setHeatmapSize] = useState({ width: 1200, height: 800 });
  const [rootFontSize, setRootFontSize] = useState(() => {
    if (typeof window === 'undefined') return 16;
    return Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
  });
  const heatmapContainerRef = useRef(null);
  const previewPlotRef = useRef(null);
  const scatterHeightLockedRef = useRef(false);
  const [scatterPointSize, setScatterPointSize] = useState(5);
  const [scatterColorMode, setScatterColorMode] = useState(() =>
    clusterData?.length > 0 ? 'cluster' : 'value'
  );
  const [previewItems, setPreviewItems] = useState([]);
  const [hasGeneratedPreview, setHasGeneratedPreview] = useState(false);
  const [lastPreviewKey, setLastPreviewKey] = useState('');
  const [isPreviewGenerating, setIsPreviewGenerating] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [activePreview, setActivePreview] = useState(null);
  const heatmapSvgRef = useRef(null);
  const isClusterReady = showCluster && heatmapPayload?.heatmap?.values?.length > 0;
  const isSaveDisabled = saveName.trim().length === 0;
  const hasClusterPoints = clusterData?.length > 0;
  const scatterPoints = hasClusterPoints ? clusterData : scatterData;

  const handleSave = () => {
    if (isSaveDisabled) return;
    saveClusterResult(saveName);
    setSaveName('');
    setIsSaveOpen(false);
    // 显示保存成功提示
    import('sonner').then(({ toast }) => {
      toast.success(`聚类结果「${saveName.trim()}」保存成功！`);
    });
  };

  const handleDownloadImage = () => {
    if (!heatmapSvgRef.current) return;

    const svgElement = heatmapSvgRef.current;
    const bbox = svgElement.getBoundingClientRect();
    const width =
      Number(svgElement.getAttribute('width')) ||
      svgElement.clientWidth ||
      Math.round(bbox.width) ||
      1200;
    const height =
      Number(svgElement.getAttribute('height')) ||
      svgElement.clientHeight ||
      Math.round(bbox.height) ||
      800;
    const fontScale = rootFontSize / 16;

    const clonedSvg = svgElement.cloneNode(true);
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    clonedSvg.setAttribute('width', width);
    clonedSvg.setAttribute('height', height);
    clonedSvg.setAttribute('style', 'background: #ffffff');

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const scale = Math.max(window.devicePixelRatio || 1, 2) * Math.max(1, fontScale);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(width * scale));
      canvas.height = Math.max(1, Math.floor(height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(svgUrl);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(svgUrl);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
        link.download = `heatmap-cluster-${timestamp}.png`;
        link.href = pngUrl;
        link.click();
        setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
      }, 'image/png');
    };

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
    };
    image.decoding = 'async';
    image.src = svgUrl;
  };

  const handleDownloadScatterImage = async () => {
    if (!scatterPlotNode || !Plotly) return;
    try {
      const url = await Plotly.toImage(scatterPlotNode, {
        format: 'png',
        width: scatterPlotNode.clientWidth || 1200,
        height: scatterPlotNode.clientHeight || 600,
      });
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
      link.download = `scatter-plot-${timestamp}.png`;
      link.href = url;
      link.click();
    } catch (error) {
      // ignore
    }
  };

  const handleDownloadScatterCsv = () => {
    if (!filteredScatterPoints || filteredScatterPoints.length === 0) return;
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const rows = remapScatterRowsForExport(filteredScatterPoints, scatterAxisLabelMap);
    downloadCsv(`scatter-table-${timestamp}.csv`, rows);
  };

  const handleDownloadClusterCsv = () => {
    if (!heatmapPayload?.heatmap?.values?.length) return;
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    downloadHeatmapCsv(`cluster-table-${timestamp}.csv`, heatmapPayload.heatmap);
  };

  const handleDownloadPreview = (preview) => {
    if (!preview?.url) return;
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const name = sanitizeFileName(preview.label || 'preview');
    const link = document.createElement('a');
    link.download = `scatter-preview-${name}-${timestamp}.png`;
    link.href = preview.url;
    link.click();
  };

  const handleGeneratePreviews = async () => {
    if (!previewPlotRef.current || !Plotly) return;
    if (!filteredScatterPoints || filteredScatterPoints.length === 0) {
      setPreviewItems([]);
      setHasGeneratedPreview(true);
      return;
    }

    const previewLabelItems = previewMode === 'value' ? previewValueItems : previewBaseItems;
    if (previewLabelItems.length === 0) {
      setPreviewItems([]);
      setHasGeneratedPreview(true);
      return;
    }

    setIsPreviewGenerating(true);
    setPreviewError('');
    const previews = [];
    const useValueColors = previewMode === 'value';
    const previewGroupKey = previewMode === 'source' ? 'source' : 'group';

    try {
      const layout = {
        width: PREVIEW_IMAGE_SIZE.width,
        height: PREVIEW_IMAGE_SIZE.height,
        margin: { l: 40, r: 15, t: 20, b: 35 },
        xaxis: {
          visible: false,
          range: previewAxisRange?.x,
        },
        yaxis: {
          visible: false,
          range: previewAxisRange?.y,
        },
        showlegend: false,
        paper_bgcolor: '#ffffff',
        plot_bgcolor: '#ffffff',
        font: { family: 'Noto Sans SC, sans-serif' },
      };

      for (const item of previewLabelItems) {
        const points = filteredScatterPoints.filter((point) => {
          if (previewMode === 'value') return true;
          const label = normalizeGroupValue(point?.[previewGroupKey]) ||
            (previewGroupKey === 'source' ? '未知' : '未分组');
          return label === item.label;
        });

        if (points.length === 0 && previewMode !== 'value') {
          continue;
        }

        const trace = {
          x: points.map((point) => point.x),
          y: points.map((point) => point.y),
          type: 'scattergl',
          mode: 'markers',
          marker: useValueColors
            ? {
                size: scatterPointSize,
                color: points.map((point) => Number(point?.[item.label])),
                colorscale: SCATTER_COLOR_SCALE.map((color, index) => [
                  index / (SCATTER_COLOR_SCALE.length - 1),
                  color,
                ]),
                cmin: item.range?.min,
                cmax: item.range?.max,
              }
            : {
                size: scatterPointSize,
                color: previewColorMap.get(item.label) || '#2563eb',
              },
        };

        await Plotly.react(previewPlotRef.current, [trace], layout, {
          responsive: false,
          displayModeBar: false,
        });

        const url = await Plotly.toImage(previewPlotRef.current, {
          format: 'png',
          width: PREVIEW_IMAGE_SIZE.width,
          height: PREVIEW_IMAGE_SIZE.height,
        });

        previews.push({
          label: item.label,
          url,
          color: previewColorMap.get(item.label) || '#2563eb',
          count: item.count,
        });
      }

      setPreviewItems(previews);
      setHasGeneratedPreview(true);
      setLastPreviewKey(previewResetKey);
    } catch (error) {
      setPreviewError('预览生成失败，请稍后重试。');
    } finally {
      setIsPreviewGenerating(false);
      Plotly.purge(previewPlotRef.current);
    }
  };

  const heatmapRows = heatmapPayload?.heatmap?.rows || [];
  const heatmapCols = heatmapPayload?.heatmap?.cols || [];
  const heatmapValues = heatmapPayload?.heatmap?.values || [];

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const updateRootFont = () => {
      const next =
        Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
      setRootFontSize(next);
    };
    updateRootFont();
    window.addEventListener('resize', updateRootFont);
    const observer = new MutationObserver(updateRootFont);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => {
      window.removeEventListener('resize', updateRootFont);
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const node = heatmapContainerRef.current;
    if (!node) return undefined;
    const updateSize = () => {
      const containerWidth = node.clientWidth || 1200;
      const scale = Math.max(1, rootFontSize / 16);
      const maxWidth = Math.max(480, window.innerWidth - 120);
      const maxHeight = Math.max(320, window.innerHeight - 320);
      const width = Math.min(Math.floor(containerWidth * 0.95), maxWidth);
      const height = Math.min(Math.floor(width * 0.65 * scale), maxHeight);
      setHeatmapSize({ width, height });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [rootFontSize]);

  const sourceOptions = useMemo(() => {
    if (!scatterPoints || scatterPoints.length === 0) return [];
    const names = scatterPoints
      .map((point) => normalizeGroupValue(point?.source ?? point?.sourceId) || '未知')
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [scatterPoints]);

  useEffect(() => {
    if (sourceOptions.length === 0) return;
    setSelectedSources(sourceOptions);
  }, [sourceOptions]);

  const groupOptions = useMemo(() => {
    if (!hasClusterPoints) return [];
    const groups = scatterPoints
      .map((point) => normalizeGroupValue(point?.group ?? point?.cluster) || '未分组')
      .filter(Boolean);
    return Array.from(new Set(groups));
  }, [hasClusterPoints, scatterPoints]);

  useEffect(() => {
    if (groupOptions.length === 0) return;
    setSelectedGroups(groupOptions);
  }, [groupOptions]);

  const filteredScatterPoints = useMemo(() => {
    const hasGroupFilter = Array.isArray(selectedGroups);
    const hasSourceFilter = Array.isArray(selectedSources);
    return (scatterPoints || []).filter((point) => {
      const groupValue = normalizeGroupValue(point?.group ?? point?.cluster) || '未分组';
      const sourceValue = normalizeGroupValue(point?.source ?? point?.sourceId) || '未知';
      if (hasGroupFilter && !selectedGroups.includes(groupValue)) return false;
      if (hasSourceFilter && !selectedSources.includes(sourceValue)) return false;
      return true;
    });
  }, [scatterPoints, selectedGroups, selectedSources]);

  const scatterTableColumns = useMemo(
    () => buildScatterTableColumns(scatterPoints),
    [scatterPoints]
  );

  const scatterAxisLabelMap = useMemo(() => {
    if (scatterMode !== '2d') return {};
    return {
      x: scatterAxisX || 'x',
      y: scatterAxisY || 'y',
    };
  }, [scatterAxisX, scatterAxisY, scatterMode]);

  const legendItems = useMemo(() => {
    const filteredCounts = new Map();
    const totalCounts = new Map();
    const getLabel = (point) =>
      hasClusterPoints
        ? point?.group === null ||
          point?.group === undefined ||
          String(point.group).trim() === ''
          ? '未分组'
          : String(point.group)
        : normalizeGroupValue(point?.source ?? point?.sourceId) || '未知';

    (scatterPoints || []).forEach((point) => {
      const label = getLabel(point);
      totalCounts.set(label, (totalCounts.get(label) || 0) + 1);
    });

    filteredScatterPoints.forEach((point) => {
      const label = getLabel(point);
      filteredCounts.set(label, (filteredCounts.get(label) || 0) + 1);
    });

    const order = groupOptions.slice();
    if (totalCounts.has('未分组') && !order.includes('未分组')) {
      order.push('未分组');
    }

    const total = order.length || 1;
    return order.map((label, index) => ({
      label,
      count: filteredCounts.get(label) || 0,
      total: totalCounts.get(label) || 0,
      color: getScatterColor(index, total),
    }));
  }, [filteredScatterPoints, scatterPoints, hasClusterPoints, groupOptions]);

  const sourceItems = useMemo(() => {
    const filteredCounts = new Map();
    const totalCounts = new Map();
    const getLabel = (point) => normalizeGroupValue(point?.source ?? point?.sourceId) || '未知';

    (scatterPoints || []).forEach((point) => {
      const label = getLabel(point);
      totalCounts.set(label, (totalCounts.get(label) || 0) + 1);
    });

    filteredScatterPoints.forEach((point) => {
      const label = getLabel(point);
      filteredCounts.set(label, (filteredCounts.get(label) || 0) + 1);
    });

    const order = sourceOptions.slice();
    if (totalCounts.has('未知') && !order.includes('未知')) {
      order.push('未知');
    }

    const total = order.length || 1;
    return order.map((label, index) => ({
      label,
      count: filteredCounts.get(label) || 0,
      total: totalCounts.get(label) || 0,
      color: getScatterColor(index, total),
    }));
  }, [filteredScatterPoints, scatterPoints, sourceOptions]);

  const colorFieldOptions = useMemo(() => {
    if (!scatterPoints || scatterPoints.length === 0) return [];
    const excluded = new Set(['id', 'x', 'y', 'source', 'sourceId', 'group', 'cluster']);
    const keys = Object.keys(scatterPoints[0] || {}).filter((key) => !excluded.has(key));
    return keys.filter((key) =>
      scatterPoints.some((point) => Number.isFinite(Number(point[key])))
    );
  }, [scatterPoints]);

  useEffect(() => {
    if (scatterColorMode === 'cluster' && !hasClusterPoints) {
      setScatterColorMode('value');
    }
  }, [hasClusterPoints, scatterColorMode]);

  useEffect(() => {
    if (!hasClusterPoints) return;
    if (colorFieldOptions.length === 0) {
      setScatterColorField('');
      return;
    }
    if (!scatterColorField) {
      setScatterColorField(colorFieldOptions[0]);
      return;
    }
    if (!colorFieldOptions.includes(scatterColorField)) {
      setScatterColorField(colorFieldOptions[0]);
    }
  }, [colorFieldOptions, hasClusterPoints, scatterColorField, setScatterColorField]);

  const colorRange = useMemo(() => {
    if (!scatterColorField) return null;
    const values = filteredScatterPoints
      .map((point) => Number(point?.[scatterColorField]))
      .filter((value) => Number.isFinite(value));
    if (values.length === 0) return null;
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [filteredScatterPoints, scatterColorField]);

  const colorGradient = useMemo(() => {
    const total = SCATTER_COLOR_SCALE.length - 1;
    return `linear-gradient(90deg, ${SCATTER_COLOR_SCALE.map(
      (color, index) => `${color} ${(index / total) * 100}%`
    ).join(', ')})`;
  }, [hasClusterPoints]);

  const colorModeOptions = useMemo(
    () => [
      { value: 'value', label: '数值色阶' },
      { value: 'source', label: '来源筛选' },
      { value: 'cluster', label: '聚类筛选' },
    ],
    []
  );

  const activeColorMode = scatterColorMode;
  const activeGroupBy = useMemo(
    () => (activeColorMode === 'source' || !hasClusterPoints ? 'source' : 'group'),
    [activeColorMode, hasClusterPoints]
  );
  const activeGroupOrder = useMemo(() => {
    if (activeColorMode === 'source' || !hasClusterPoints) return sourceOptions;
    return legendItems.map((item) => item.label);
  }, [activeColorMode, hasClusterPoints, legendItems, sourceOptions]);
  const activeColorField = activeColorMode === 'value' ? scatterColorField || null : null;
  const showValueScale = true;
  const legendCount =
    activeColorMode === 'source' ? sourceItems.length : legendItems.length;
  const previewMode = useMemo(() => {
    if (activeColorMode === 'value') return 'value';
    if (activeColorMode === 'source') return 'source';
    if (activeColorMode === 'cluster') return 'group';
    return hasClusterPoints ? 'group' : 'source';
  }, [activeColorMode, hasClusterPoints]);
  const previewValueItems = useMemo(() => {
    if (previewMode !== 'value') return [];
    return colorFieldOptions.map((label) => {
      let count = 0;
      let min = Infinity;
      let max = -Infinity;
      filteredScatterPoints.forEach((point) => {
        const value = Number(point?.[label]);
        if (!Number.isFinite(value)) return;
        count += 1;
        min = Math.min(min, value);
        max = Math.max(max, value);
      });
      return {
        label,
        count,
        total: filteredScatterPoints.length,
        range: Number.isFinite(min) ? { min, max } : null,
      };
    });
  }, [previewMode, colorFieldOptions, filteredScatterPoints]);
  const previewGroupBy = previewMode === 'source' ? 'source' : 'group';
  const previewBaseItems =
    previewMode === 'value' ? previewValueItems : previewGroupBy === 'source' ? sourceItems : legendItems;
  const previewTitle = previewMode === 'value' ? '数值列' : previewGroupBy === 'source' ? '来源' : '类别';
  const showPreviewColorChip = activeColorMode !== 'value';
  const previewColorMap = useMemo(() => {
    const map = new Map();
    if (previewMode === 'value') return map;
    previewBaseItems.forEach((item) => {
      map.set(item.label, item.color);
    });
    return map;
  }, [previewBaseItems, previewMode]);
  const previewAxisRange = useMemo(() => {
    if (!filteredScatterPoints || filteredScatterPoints.length === 0) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    filteredScatterPoints.forEach((point) => {
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
  }, [filteredScatterPoints]);
  const previewResetKey = useMemo(() => {
    const sourceKey = Array.isArray(selectedSources) ? selectedSources.join('|') : 'all';
    const groupKey = Array.isArray(selectedGroups) ? selectedGroups.join('|') : 'all';
    const columnKey = colorFieldOptions.join('|');
    return [
      activeColorMode,
      scatterColorField || '',
      scatterPointSize,
      sourceKey,
      groupKey,
      columnKey,
      filteredScatterPoints.length,
    ].join('::');
  }, [
    activeColorMode,
    scatterColorField,
    scatterPointSize,
    selectedSources,
    selectedGroups,
    colorFieldOptions,
    filteredScatterPoints.length,
  ]);
  const isPreviewStale = hasGeneratedPreview && lastPreviewKey !== '' && lastPreviewKey !== previewResetKey;

  useLayoutEffect(() => {
    if (!scatterAreaNode) return undefined;
    scatterHeightLockedRef.current = false;
    const updateHeight = () => {
      if (scatterHeightLockedRef.current) return;
      const rect = scatterAreaNode.getBoundingClientRect();
      const nextHeight = Math.max(420, Math.floor(window.innerHeight - rect.top - 20));
      if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
      setScatterAreaHeight(nextHeight);
      setScatterPlotHeight(nextHeight);
      scatterHeightLockedRef.current = true;
    };
    let frame1 = null;
    let frame2 = null;
    const scheduleUpdate = () => {
      if (frame1) cancelAnimationFrame(frame1);
      if (frame2) cancelAnimationFrame(frame2);
      frame1 = requestAnimationFrame(() => {
        updateHeight();
        frame2 = requestAnimationFrame(updateHeight);
      });
    };
    scheduleUpdate();
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(scatterAreaNode);
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      if (frame1) cancelAnimationFrame(frame1);
      if (frame2) cancelAnimationFrame(frame2);
      observer.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [scatterAreaNode]);

  useEffect(() => {
    if (!hasGeneratedPreview) return;
    setPreviewError('');
  }, [previewResetKey, hasGeneratedPreview]);

  if (!isClusterReady) {
    return (
      <div ref={ref} className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
        暂无聚类结果，请先返回数据分析页面执行聚类分析。
      </div>
    );
  }

  return (
    <section ref={ref} className="flex flex-col space-y-4">
      <Tabs defaultValue="heatmap" className="space-y-3 flex flex-col flex-1 min-h-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="flex flex-wrap gap-1 bg-slate-100/60 p-1.5">
            <TabsTrigger value="heatmap" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:via-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white">
              聚类热图树
            </TabsTrigger>
            <TabsTrigger value="cluster-table" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:via-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white">
              聚类表
            </TabsTrigger>
            <TabsTrigger value="scatter-table" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:via-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white">
              散点表
            </TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-2">
            {onUseAsInput ? (
              <button
                type="button"
                onClick={onUseAsInput}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                使用当前聚类作为输入
              </button>
            ) : null}
          </div>
        </div>

        <TabsContent value="heatmap">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/90 p-4 shadow-sm">
            <div className="text-sm text-slate-600">热图聚类树</div>
            <button
              type="button"
              onClick={handleDownloadImage}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              下载热图图片
            </button>
          </div>
          <div ref={heatmapContainerRef} className="mt-3 rounded-2xl bg-white/90 p-5 shadow-sm">
            <HeatmapDendrogram
              heatmap={heatmapPayload?.heatmap}
              rowTree={heatmapPayload?.rowTree}
              colTree={heatmapPayload?.colTree}
              width={heatmapSize.width}
              height={heatmapSize.height}
              svgRef={heatmapSvgRef}
              showTitle={false}
              fontScale={Math.max(1, rootFontSize / 16)}
            />
          </div>
        </TabsContent>

        

        <TabsContent value="cluster-table">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4">
            <div className="text-sm text-slate-600">聚类表</div>
            <button
              type="button"
              onClick={handleDownloadClusterCsv}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              下载聚类表
            </button>
          </div>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white/90 p-4">
            {heatmapRows.length === 0 ? (
              <div className="text-sm text-slate-600">暂无聚类表数据</div>
            ) : (
              <div className="max-h-[65vh] overflow-x-auto overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>聚类</TableHead>
                      {heatmapCols.map((col) => (
                        <TableHead key={col}>{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {heatmapRows.map((rowLabel, rowIndex) => (
                      <TableRow key={rowLabel}>
                        <TableCell className="font-medium text-slate-700">{rowLabel}</TableCell>
                        {(heatmapValues[rowIndex] || []).map((value, valueIndex) => (
                          <TableCell key={`${rowLabel}-${heatmapCols[valueIndex]}`}>
                            {formatTableValue(value)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="scatter-table">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4">
            <div className="text-sm text-slate-600">散点表</div>
            <button
              type="button"
              onClick={handleDownloadScatterCsv}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              下载散点表
            </button>
          </div>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white/90 p-4">
            {filteredScatterPoints.length === 0 ? (
              <div className="text-sm text-slate-600">暂无散点表数据</div>
            ) : (
              <div className="max-h-[65vh] overflow-x-auto overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {scatterTableColumns.map((column) => (
                        <TableHead key={column}>
                          {scatterAxisLabelMap[column] ?? column}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredScatterPoints.map((row, rowIndex) => (
                      <TableRow key={row.id ?? rowIndex}>
                        {scatterTableColumns.map((column) => (
                          <TableCell key={`${row.id ?? rowIndex}-${column}`}>
                            {formatTableValue(row?.[column])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div
        ref={previewPlotRef}
        style={{
          position: 'fixed',
          left: -9999,
          top: 0,
          width: PREVIEW_IMAGE_SIZE.width,
          height: PREVIEW_IMAGE_SIZE.height,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

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
              {activePreview?.label ? `${previewTitle}：${activePreview.label}` : '散点图预览'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-slate-200 bg-white">
            {activePreview?.url ? (
              <img
                src={activePreview.url}
                alt={activePreview.label || 'preview'}
                className="max-h-[60vh] w-auto max-w-full object-contain"
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

      <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>保存聚类结果</DialogTitle>
            <DialogDescription>为当前聚类结果设置一个名称，方便后续查找。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cluster-name">保存名称</Label>
            <Input
              id="cluster-name"
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="例如：筛选A样本聚类"
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
    </section>
  );
});

ClusterResultsPanel.displayName = 'ClusterResultsPanel';

export default ClusterResultsPanel;

