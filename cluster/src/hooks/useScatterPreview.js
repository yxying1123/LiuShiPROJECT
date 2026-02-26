import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Plotly from 'plotly.js-dist-min';
import { SCATTER_COLOR_SCALE } from '../components/ScatterPlot';
import { normalizeGroupValue, normalizeSourceValue } from '../utils/dataHelpers';
import { toast } from 'sonner';

const PREVIEW_IMAGE_SIZE = { width: 360, height: 240 };

/**
 * 散点图预览生成 Hook
 * 处理按分组或数值列生成预览图
 */
export const useScatterPreview = (filteredScatterPoints, options = {}) => {
  const { scatterPointSize = 5, colorFieldOptions = [] } = options;

  const [previewItems, setPreviewItems] = useState([]);
  const [hasGeneratedPreview, setHasGeneratedPreview] = useState(false);
  const [lastPreviewKey, setLastPreviewKey] = useState('');
  const [isPreviewGenerating, setIsPreviewGenerating] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [activePreview, setActivePreview] = useState(null);

  const previewPlotRef = useRef(null);

  // 预览模式：'value' | 'source' | 'group'
  const previewMode = useMemo(() => {
    const { activeColorMode = 'source', hasClusterPoints = false } = options;
    if (activeColorMode === 'value') return 'value';
    if (activeColorMode === 'source') return 'source';
    if (activeColorMode === 'cluster') return 'group';
    return hasClusterPoints ? 'group' : 'source';
  }, [options.activeColorMode, options.hasClusterPoints]);

  const previewGroupBy = previewMode === 'source' ? 'source' : 'group';
  const previewTitle = previewMode === 'value' ? '数值列' : previewGroupBy === 'source' ? '来源' : '类别';
  const showPreviewColorChip = previewMode !== 'value';

  // 清理预览错误
  useEffect(() => {
    if (!hasGeneratedPreview) return;
    setPreviewError('');
  }, [lastPreviewKey, hasGeneratedPreview]);

  const handleGeneratePreviews = useCallback(async () => {
    if (!previewPlotRef.current || !Plotly) return;

    const {
      legendItems = [],
      sourceItems = [],
      selectedSources = [],
      selectedGroups = [],
      previewAxisRange = null,
    } = options;

    if (!filteredScatterPoints || filteredScatterPoints.length === 0) {
      setPreviewItems([]);
      return;
    }

    const previewBaseItems = previewMode === 'value'
      ? colorFieldOptions.map((label) => {
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
        })
      : previewGroupBy === 'source'
        ? sourceItems
        : legendItems;

    const previewLabelItems = previewMode === 'value'
      ? previewBaseItems
      : previewBaseItems.filter((item) => item.count > 0);

    if (previewLabelItems.length === 0) {
      setPreviewItems([]);
      return;
    }

    setIsPreviewGenerating(true);
    setPreviewError('');

    // 构建颜色映射
    const previewColorMap = new Map();
    if (previewMode !== 'value') {
      previewBaseItems.forEach((item) => {
        previewColorMap.set(item.label, item.color);
      });
    }

    // 构建分组映射
    const groupMap = new Map();
    if (previewMode !== 'value') {
      const getLabel = previewGroupBy === 'source'
        ? (point) => normalizeSourceValue(point?.source ?? point?.sourceId)
        : (point) => normalizeGroupValue(point?.group ?? point?.cluster) || '未分组';

      filteredScatterPoints.forEach((point) => {
        const label = getLabel(point);
        if (!groupMap.has(label)) {
          groupMap.set(label, []);
        }
        groupMap.get(label).push(point);
      });
    }

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
      setLastPreviewKey(options.previewResetKey || '');
      if (!hasError && results.length > 0) {
        toast.success('图片预览生成成功', { position: 'top-center' });
      }
    }
  }, [filteredScatterPoints, options, previewMode, previewGroupBy, scatterPointSize, colorFieldOptions]);

  const handleDownloadPreview = useCallback((preview) => {
    if (!preview?.url) return;
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const name = String(preview.label || 'preview').replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '');
    const link = document.createElement('a');
    link.download = `scatter-preview-${name}-${timestamp}.png`;
    link.href = preview.url;
    link.click();
  }, []);

  return {
    // 状态
    previewItems,
    hasGeneratedPreview,
    isPreviewGenerating,
    previewError,
    activePreview,
    setActivePreview,
    previewTitle,
    showPreviewColorChip,
    lastPreviewKey,
    // 引用
    previewPlotRef,
    // 方法
    handleGeneratePreviews,
    handleDownloadPreview,
  };
};
