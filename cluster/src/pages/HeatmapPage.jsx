import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Download, GitBranch, Save } from 'lucide-react';
import { toast } from 'sonner';
import Plotly from 'plotly.js-dist-min';
import HeatmapDendrogram from '../components/HeatmapDendrogram';
import ScatterPlot, { SCATTER_COLOR_SCALE, getScatterColor } from '../components/ScatterPlot';
import PageLayout from '../components/PageLayout';
import { useDataContext } from '../context/data-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Slider } from '../components/ui/slider';

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

const HeatmapPage = () => {
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
    error,
    warning,
    heatmapPayload,
    saveClusterResult,
  } = useDataContext();
  const navigate = useNavigate();
  const [isSaveOpen, setIsSaveOpen] = useState(false);
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
  const handleBackToScatter = () => {
    navigate('/scatter');
  };

  const handleSave = () => {
    if (isSaveDisabled) return;
    saveClusterResult(saveName);
    setSaveName('');
    setIsSaveOpen(false);
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
      // ignore download failure
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

  const sanitizeFileName = (value) =>
    String(value || 'preview').replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '');

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
      return;
    }
    if (previewLabelItems.length === 0) {
      setPreviewItems([]);
      return;
    }
    setIsPreviewGenerating(true);
    setPreviewError('');
    const groupMap = new Map();
    if (previewMode !== 'value') {
      const getLabel =
        previewGroupBy === 'source'
          ? (point) => normalizeGroupValue(point?.source ?? point?.sourceId) || '未知'
          : (point) => normalizeGroupValue(point?.group ?? point?.cluster) || '未分组';
      filteredScatterPoints.forEach((point) => {
        const label = getLabel(point);
        if (!groupMap.has(label)) {
          groupMap.set(label, []);
        }
        groupMap.get(label).push(point);
      });
    }
    const useValueColors = previewMode === 'value';
    const colorscale = SCATTER_COLOR_SCALE.map((color, index) => [
      index / (SCATTER_COLOR_SCALE.length - 1),
      color,
    ]);
    const layout = {
      width: PREVIEW_IMAGE_SIZE.width,
      height: PREVIEW_IMAGE_SIZE.height,
      margin: { l: 20, r: 10, t: 20, b: 20 },
      paper_bgcolor: '#ffffff',
      plot_bgcolor: '#ffffff',
      xaxis: {
        visible: false,
        range: previewAxisRange?.x,
        fixedrange: true,
      },
      yaxis: {
        visible: false,
        range: previewAxisRange?.y,
        fixedrange: true,
      },
      showlegend: false,
    };
    const config = {
      displayModeBar: false,
      staticPlot: true,
      responsive: false,
      scrollZoom: false,
    };
    const results = [];
    let hasError = false;
    try {
      for (const item of previewLabelItems) {
        let points = filteredScatterPoints;
        let marker;
        let count = 0;
        if (previewMode === 'value') {
          const colorField = item.label;
          const colorValues = points.map((point) => {
            const value = Number(point?.[colorField]);
            if (Number.isFinite(value)) {
              count += 1;
              return value;
            }
            return null;
          });
          marker = {
            size: scatterPointSize,
            color: colorValues,
            colorscale,
            cmin: item.range?.min,
            cmax: item.range?.max,
            opacity: 0.85,
            line: { width: 0 },
          };
        } else {
          points = groupMap.get(item.label) || [];
          count = points.length;
          marker = {
            size: scatterPointSize,
            color: previewColorMap.get(item.label) || '#2563eb',
            opacity: 0.85,
            line: { width: 0 },
          };
        }
        if (points.length === 0 && previewMode !== 'value') {
          continue;
        }
        const trace = {
          type: 'scatter',
          mode: 'markers',
          x: points.map((point) => point.x),
          y: points.map((point) => point.y),
          marker,
          hoverinfo: 'skip',
        };
        await Plotly.react(previewPlotRef.current, [trace], layout, config);
        const url = await Plotly.toImage(previewPlotRef.current, {
          format: 'png',
          width: PREVIEW_IMAGE_SIZE.width,
          height: PREVIEW_IMAGE_SIZE.height,
          scale: 2,
        });
        results.push({
          label: item.label,
          url,
          count,
          color: previewColorMap.get(item.label) || '#2563eb',
        });
      }
    } catch (err) {
      hasError = true;
      setPreviewError('预览生成失败，请稍后重试。');
    } finally {
      Plotly.purge(previewPlotRef.current);
      setPreviewItems(results);
      setIsPreviewGenerating(false);
      setHasGeneratedPreview(true);
      setLastPreviewKey(previewResetKey);
      if (!hasError && results.length > 0) {
        toast.success('图片预览生成成功', { position: 'top-center' });
      }
    }
  };

  const groupOptions = useMemo(() => {
    const groups = new Set();
    let hasEmpty = false;
    (scatterPoints || []).forEach((point) => {
      const groupValue = normalizeGroupValue(point?.group ?? point?.cluster);
      if (groupValue === '') {
        hasEmpty = true;
      } else {
        groups.add(groupValue);
      }
    });
    const ordered = Array.from(groups).sort((a, b) => Number(a) - Number(b));
    if (hasEmpty) {
      ordered.push('未分组');
    }
    return ordered;
  }, [scatterPoints]);

  const sourceOptions = useMemo(() => {
    const sources = new Set();
    let hasEmpty = false;
    (scatterPoints || []).forEach((point) => {
      const sourceValue = normalizeGroupValue(point?.source ?? point?.sourceId);
      if (sourceValue === '') {
        hasEmpty = true;
      } else {
        sources.add(sourceValue);
      }
    });
    const ordered = Array.from(sources);
    if (hasEmpty) {
      ordered.push('未知');
    }
    return ordered;
  }, [scatterPoints]);

  useEffect(() => {
    setSelectedGroups((prev) => {
      if (groupOptions.length === 0) return [];
      if (prev === null) return groupOptions;
      const valid = prev.filter((group) => groupOptions.includes(group));
      return valid;
    });
  }, [groupOptions]);

  useEffect(() => {
    setSelectedSources((prev) => {
      if (sourceOptions.length === 0) return [];
      if (prev === null) return sourceOptions;
      const valid = prev.filter((source) => sourceOptions.includes(source));
      return valid;
    });
  }, [sourceOptions]);

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
  const previewLabelItems = useMemo(
    () =>
      previewMode === 'value'
        ? previewBaseItems
        : previewBaseItems.filter((item) => item.count > 0),
    [previewBaseItems, previewMode]
  );
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

  const heatmapRows = heatmapPayload?.heatmap?.rows || [];
  const heatmapCols = heatmapPayload?.heatmap?.cols || [];
  const heatmapValues = heatmapPayload?.heatmap?.values || [];

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

  return (
    <PageLayout
      title="热图聚类"
      subtitle="查看框选数据的聚类结果与相似度矩阵"
      error={error}
      warning={warning}
      containerClassName="max-w-none"
      cardClassName="min-h-[calc(100vh-140px)]"
      contentClassName="h-full"
      stackClassName="gap-4"
      actions={
        <div className="flex w-full items-center justify-between rounded-2xl bg-white/80 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">结果聚类</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBackToScatter}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              返回配置
            </button>
            <button
              onClick={() => setIsSaveOpen(true)}
              disabled={!isClusterReady}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition ${
                !isClusterReady
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Save className="h-4 w-4" />
              保存结果
            </button>
          </div>
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col space-y-4">
        {!scatterData || scatterData.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
            暂无可用数据，请先在散点图页面生成数据并执行聚类分析。
          </div>
        ) : null}

        {scatterData && scatterData.length > 0 && !isClusterReady ? (
          <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
            暂未生成热图，请返回数据配置页面点击“聚类分析”。
          </div>
        ) : null}

        {isClusterReady && (
          <Tabs defaultValue="heatmap" className="space-y-3 flex flex-col flex-1 min-h-0">
            <TabsList className="flex flex-wrap gap-1 bg-slate-100/60 p-1.5">
              <TabsTrigger value="heatmap" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:via-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white">
                聚类热图树
              </TabsTrigger>
              <TabsTrigger value="scatter" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:via-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white">
                散点图
              </TabsTrigger>
              <TabsTrigger value="cluster-table" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:via-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white">
                聚类表
              </TabsTrigger>
              <TabsTrigger value="scatter-table" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:via-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white">
                散点表
              </TabsTrigger>
            </TabsList>

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

            <TabsContent value="scatter" className="flex flex-col flex-1 min-h-0">
              <div className="flex flex-col flex-1 min-h-0 space-y-4">
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4">
                  <span className="text-sm text-slate-500">
                    当前显示 {filteredScatterPoints.length} / {scatterPoints.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadScatterImage}
                    className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    下载散点图
                  </button>
                </div>

                {hasClusterPoints ? (
                  <div
                    ref={setScatterAreaNode}
                    className="grid flex-1 min-h-[520px] gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]"
                    style={{ minHeight: scatterAreaHeight }}
                  >
                    <div className="min-w-0 h-full min-h-0 flex flex-col">
                      {filteredScatterPoints.length === 0 && (
                        <div className="mb-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
                          当前筛选条件下暂无数据，请调整聚类序号或来源筛选。
                        </div>
                      )}
                      <div className="min-h-0">
                        <ScatterPlot
                          data={filteredScatterPoints}
                          height={scatterPlotHeight}
                          showLegend={false}
                          enableSelection={false}
                          showSelectionToolbar={false}
                          filterSources={Array.isArray(selectedSources) ? selectedSources : null}
                          filterGroups={Array.isArray(selectedGroups) ? selectedGroups : null}
                          groupField="group"
                          groupBy={activeGroupBy}
                          groupOrder={activeGroupOrder}
                          xLabel={
                            scatterMode === '2d'
                              ? scatterAxisX || 'X'
                              : scatterSelectedColumns.length > 0
                                ? '降维维度1'
                                : 'X'
                          }
                          yLabel={
                            scatterMode === '2d'
                              ? scatterAxisY || 'Y'
                              : scatterSelectedColumns.length > 0
                                ? '降维维度2'
                                : 'Y'
                          }
                          colorField={activeColorField}
                          valueField={scatterColorField || null}
                          colorRange={colorRange}
                          onPlotReady={setScatterPlotNode}
                          pointSize={scatterPointSize}
                          fontScale={1.15}
                        />
                      </div>
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white/95">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                          <span className="text-sm font-semibold text-slate-800">图片预览</span>
                          <span className="text-xs text-slate-500">
                            {previewItems.length} 张
                          </span>
                        </div>
                        <div className="p-4">
                          {isPreviewGenerating && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-amber-600" />
                              正在生成预览...
                            </div>
                          )}
                          {!isPreviewGenerating && isPreviewStale && (
                            <div className="mb-2 text-xs text-amber-600">
                              当前设置已变更，点击“一键生成”可更新预览。
                            </div>
                          )}
                          {!isPreviewGenerating && previewError && (
                            <div className="text-sm text-rose-500">{previewError}</div>
                          )}
                          {!isPreviewGenerating &&
                            !previewError &&
                            previewItems.length === 0 &&
                            !hasGeneratedPreview && (
                            <div className="text-sm text-slate-500">
                              点击右侧“一键生成”生成{previewTitle}预览。
                            </div>
                          )}
                          {!isPreviewGenerating &&
                            !previewError &&
                            previewItems.length === 0 &&
                            hasGeneratedPreview && (
                            <div className="text-sm text-slate-500">暂无可用预览。</div>
                          )}
                          {!isPreviewGenerating && previewItems.length > 0 && (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              {previewItems.map((item) => (
                                <button
                                  key={item.label}
                                  type="button"
                                  onClick={() => setActivePreview(item)}
                                  className="group rounded-xl border border-slate-200 bg-white p-2 text-left transition hover:border-slate-300 hover:shadow-sm"
                                >
                                  <div className="flex h-32 w-full items-center justify-center rounded-lg bg-slate-50">
                                    <img
                                      src={item.url}
                                      alt={item.label}
                                      className="max-h-full max-w-full object-contain"
                                      loading="lazy"
                                    />
                                  </div>
                                  <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                                    <div className="flex min-w-0 items-center gap-2">
                                      {showPreviewColorChip && (
                                        <span
                                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                          style={{ background: item.color }}
                                        />
                                      )}
                                      <span className="truncate">{item.label}</span>
                                    </div>
                                    <span>{item.count.toLocaleString()}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/95">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <span className="text-sm font-semibold text-slate-800">图例</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{legendCount} 类</span>
                          <button
                            type="button"
                            onClick={handleGeneratePreviews}
                            disabled={isPreviewGenerating || filteredScatterPoints.length === 0}
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                              isPreviewGenerating || filteredScatterPoints.length === 0
                                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {isPreviewGenerating ? '生成中' : '一键生成'}
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-4 py-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                          <div className="text-xs font-semibold text-slate-700">颜色方式</div>
                          <div className="mt-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm transition hover:border-slate-300"
                                >
                                  <span>
                                    {colorModeOptions.find((item) => item.value === activeColorMode)?.label}
                                  </span>
                                  <ChevronDown className="h-4 w-4 text-slate-500" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="space-y-2">
                                  {colorModeOptions.map((item) => {
                                    const checked = activeColorMode === item.value;
                                    return (
                                      <button
                                        key={item.value}
                                        type="button"
                                        onClick={() => setScatterColorMode(item.value)}
                                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                                          checked
                                            ? 'border-slate-200 bg-slate-100 text-slate-700'
                                            : 'border-transparent text-slate-600 hover:bg-slate-50'
                                        }`}
                                      >
                                        <span>{item.label}</span>
                                        {checked ? (
                                          <span className="text-xs text-slate-500">当前</span>
                                        ) : null}
                                      </button>
                                    );
                                  })}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {showValueScale && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                            <div className="text-xs font-semibold text-slate-700">数值色阶</div>
                            <div className="mt-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm transition hover:border-slate-300"
                                  >
                                    <span>{scatterColorField || '暂无可选列'}</span>
                                    <ChevronDown className="h-4 w-4 text-slate-500" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72" align="start">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700">变量</span>
                                    {scatterColorField && (
                                      <button
                                        type="button"
                                        onClick={() => setScatterColorField('')}
                                        className="text-xs text-slate-500 transition hover:text-slate-700"
                                      >
                                        清空
                                      </button>
                                    )}
                                  </div>
                                  <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                                    {colorFieldOptions.map((label) => {
                                      const checked = scatterColorField === label;
                                      return (
                                        <label
                                          key={label}
                                          className="flex items-center gap-2 text-sm text-slate-700"
                                        >
                                          <Checkbox
                                            checked={checked}
                                            onCheckedChange={(value) => {
                                              if (value === true) {
                                                setScatterColorField(label);
                                              } else if (checked) {
                                                setScatterColorField('');
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
                            <div
                              className="mt-3 h-2.5 w-full rounded-full"
                              style={{ background: colorGradient }}
                            />
                            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                              <span>
                                {colorRange
                                  ? colorRange.min.toFixed(2)
                                  : '暂无范围'}
                              </span>
                              <span>
                                {colorRange
                                  ? colorRange.max.toFixed(2)
                                  : '暂无范围'}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                              {activeColorMode === 'value'
                                ? '选择数值列后，点颜色将随数值变化'
                                : '选择数值列后，可在提示信息中查看对应数值'}
                            </p>
                          </div>
                        )}

                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-700">点大小</span>
                            <span className="text-xs text-slate-500">
                              {scatterPointSize.toFixed(1)} px
                            </span>
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

                        <div>
                          <button
                            type="button"
                            onClick={() => setIsSourceOpen((prev) => !prev)}
                            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            来源筛选
                            {isSourceOpen ? (
                              <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                            )}
                          </button>
                          {isSourceOpen && (
                            <div className="mt-2 space-y-2">
                              {sourceItems.map((item) => {
                                const checked = Array.isArray(selectedSources)
                                  ? selectedSources.includes(item.label)
                                  : true;
                                return (
                                  <label
                                    key={item.label}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(value) =>
                                          setSelectedSources((prev) => {
                                            const current = Array.isArray(prev) ? prev : [];
                                            if (value === true) {
                                              return current.includes(item.label)
                                                ? current
                                                : [...current, item.label];
                                            }
                                            return current.filter((entry) => entry !== item.label);
                                          })
                                        }
                                      />
                                      {activeColorMode === 'source' && (
                                        <span
                                          className="h-3 w-3 rounded-sm"
                                          style={{ background: item.color }}
                                        />
                                      )}
                                      <span className="truncate">{item.label}</span>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                      {item.count.toLocaleString()} / {item.total.toLocaleString()}
                                    </span>
                                  </label>
                                );
                              })}
                              {sourceItems.length === 0 && (
                                <div className="text-xs text-slate-500">暂无来源信息</div>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() => setIsGroupOpen((prev) => !prev)}
                            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            聚类筛选
                            {isGroupOpen ? (
                              <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                            )}
                          </button>
                          {isGroupOpen && (
                            <div className="mt-2 space-y-2">
                              {legendItems.map((item) => {
                                const checked = Array.isArray(selectedGroups)
                                  ? selectedGroups.includes(item.label)
                                  : true;
                                return (
                                  <label
                                    key={item.label}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(value) =>
                                          setSelectedGroups((prev) => {
                                            const current = Array.isArray(prev) ? prev : [];
                                            if (value === true) {
                                              return current.includes(item.label)
                                                ? current
                                                : [...current, item.label];
                                            }
                                            return current.filter((entry) => entry !== item.label);
                                          })
                                        }
                                      />
                                      {activeColorMode === 'cluster' && (
                                        <span
                                          className="h-3 w-3 rounded-sm"
                                          style={{ background: item.color }}
                                        />
                                      )}
                                      <span className="truncate">{item.label}</span>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                      {item.count.toLocaleString()} / {item.total.toLocaleString()}
                                    </span>
                                  </label>
                                );
                              })}
                              {legendItems.length === 0 && (
                                <div className="text-xs text-slate-500">暂无聚类信息</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </aside>
                  </div>
                ) : (
                  <div
                    ref={setScatterAreaNode}
                    className="flex flex-1 min-h-[520px]"
                    style={{ height: scatterAreaHeight }}
                  >
                    {filteredScatterPoints.length === 0 && (
                      <div className="mb-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
                        当前筛选条件下暂无数据，请调整聚类序号或来源筛选。
                      </div>
                    )}
                    <ScatterPlot
                      data={filteredScatterPoints}
                      height={scatterPlotHeight}
                      showLegend
                      enableSelection={false}
                      showSelectionToolbar={false}
                      filterSources={Array.isArray(selectedSources) ? selectedSources : null}
                      filterGroups={Array.isArray(selectedGroups) ? selectedGroups : null}
                      groupField="group"
                      groupBy={activeGroupBy}
                      groupOrder={activeGroupOrder}
                      xLabel={
                        scatterMode === '2d'
                          ? scatterAxisX || 'X'
                          : scatterSelectedColumns.length > 0
                            ? '降维维度1'
                            : 'X'
                      }
                      yLabel={
                        scatterMode === '2d'
                          ? scatterAxisY || 'Y'
                          : scatterSelectedColumns.length > 0
                            ? '降维维度2'
                            : 'Y'
                      }
                      colorField={activeColorField}
                      valueField={scatterColorField || null}
                      colorRange={colorRange}
                      onPlotReady={setScatterPlotNode}
                      pointSize={scatterPointSize}
                      fontScale={1.15}
                    />
                  </div>
                )}
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
        )}
      </div>

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
    </PageLayout>
  );
};

export default HeatmapPage;
