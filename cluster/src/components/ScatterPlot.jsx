import React, { useMemo, useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import { RotateCcw, MousePointer2 } from 'lucide-react';

export const SCATTER_PALETTE = [
  '#2563eb',
  '#f97316',
  '#10b981',
  '#a855f7',
  '#ef4444',
  '#0ea5e9',
  '#eab308',
  '#14b8a6',
];

export const SCATTER_COLOR_SCALE = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#7f1d1d'];

export const getScatterColor = (index, total) => {
  const safeTotal = Number.isFinite(total) && total > 0 ? total : SCATTER_PALETTE.length;
  if (safeTotal <= SCATTER_PALETTE.length) {
    return SCATTER_PALETTE[index % SCATTER_PALETTE.length];
  }
  const hue = (index * 360) / safeTotal;
  return `hsl(${hue.toFixed(2)}, 68%, 46%)`;
};

const ScatterPlot = ({
  data,
  height = 500,
  responsiveHeight = false,
  minHeight = 420,
  maxHeight = 720,
  aspectRatio = 0.62,
  onSelection,
  onConfirmSelection,
  confirmDisabled = false,
  confirmLabel = '确定筛选',
  enableSelection = true,
  showSelectionToolbar = true,
  clearSelectionSignal,
  toolbarActions,
  xLabel,
  yLabel,
  showLegend = true,
  highlightSource,
  filterSources,
  filterGroups,
  groupField = 'group',
  groupBy = 'source',
  groupOrder,
  colorField,
  valueField,
  colorRange,
  onPlotReady,
  pointSize = 4.5,
  fontScale = 1,
  lockAspect = false,
}) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [autoHeight, setAutoHeight] = useState(height);
  const [chromeHeight, setChromeHeight] = useState(0);
  const [chromeReady, setChromeReady] = useState(false);
  const [rootFontSize, setRootFontSize] = useState(() => {
    if (typeof window === 'undefined') return 16;
    return Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
  });
  const [plotNode, setPlotNode] = useState(null);
  const containerRef = useRef(null);
  const toolbarRef = useRef(null);
  const hintRef = useRef(null);
  const isSelectionLocked = enableSelection && selectedIds.length > 0;
  const dragMode = enableSelection ? (isSelectionLocked ? 'pan' : 'lasso') : 'pan';
  const modeLabel = isSelectionLocked ? '平移模式' : '选择模式';

  useEffect(() => {
    setSelectedIds([]);
  }, [data]);

  useEffect(() => {
    if (clearSelectionSignal === undefined) return;
    setSelectedIds([]);
    onSelection && onSelection([]);
  }, [clearSelectionSignal, onSelection]);

  useEffect(() => {
    if (!responsiveHeight) return;
    const node = containerRef.current;
    if (!node) return;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const updateHeight = () => {
      const width = node.clientWidth;
      if (!width) return;
      const next = Math.round(width * aspectRatio);
      setAutoHeight(clamp(next, minHeight, maxHeight));
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [responsiveHeight, aspectRatio, minHeight, maxHeight]);

  useEffect(() => {
    const toolbarNode = toolbarRef.current;
    const hintNode = hintRef.current;
    if (!toolbarNode && !hintNode) {
      setChromeHeight(0);
      setChromeReady(true);
      return undefined;
    }
    const getOuterHeight = (node) => {
      if (!node) return 0;
      const rect = node.getBoundingClientRect();
      const styles = window.getComputedStyle(node);
      const marginTop = Number.parseFloat(styles.marginTop) || 0;
      const marginBottom = Number.parseFloat(styles.marginBottom) || 0;
      return rect.height + marginTop + marginBottom;
    };
    const updateHeight = () => {
      const total = getOuterHeight(toolbarNode) + getOuterHeight(hintNode);
      setChromeHeight(total);
      setChromeReady(true);
    };
    updateHeight();
    const observers = [];
    if (toolbarNode) {
      const toolbarObserver = new ResizeObserver(updateHeight);
      toolbarObserver.observe(toolbarNode);
      observers.push(toolbarObserver);
    }
    if (hintNode) {
      const hintObserver = new ResizeObserver(updateHeight);
      hintObserver.observe(hintNode);
      observers.push(hintObserver);
    }
    window.addEventListener('resize', updateHeight);
    return () => {
      observers.forEach((observer) => observer.disconnect());
      window.removeEventListener('resize', updateHeight);
    };
  }, [enableSelection, showSelectionToolbar]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const readRootFont = () => {
      const next =
        Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
      setRootFontSize(next);
    };
    readRootFont();
    window.addEventListener('resize', readRootFont);
    const observer = new MutationObserver(readRootFont);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => {
      window.removeEventListener('resize', readRootFont);
      observer.disconnect();
    };
  }, []);

  const groupedData = useMemo(() => {
    const groups = new Map();
    const hasFilter = Array.isArray(filterSources);
    const hasGroupFilter = Array.isArray(filterGroups);
    (data || []).forEach((point, index) => {
      const rawSourceValue = point.source ?? point.sourceId ?? '未知';
      const sourceValue = rawSourceValue === '' ? '未知' : rawSourceValue;
      if (hasFilter && !filterSources.includes(sourceValue)) {
        return;
      }
      const groupValue =
        groupField && Object.prototype.hasOwnProperty.call(point, groupField)
          ? point[groupField]
          : point.group ?? point.cluster;
      const groupKey =
        groupValue === null || groupValue === undefined ? '' : String(groupValue);
      const groupLabel = groupKey === '' ? '未分组' : groupKey;
      if (hasGroupFilter && !filterGroups.includes(groupLabel)) {
        return;
      }
      const label =
        groupBy === 'source-group'
          ? `${sourceValue} · ${groupLabel}`
          : groupBy === 'group'
            ? groupLabel
            : sourceValue;
      if (!groups.has(label)) {
        groups.set(label, []);
      }
      groups.get(label).push({ ...point, __index: index });
    });
    const entries = Array.from(groups.entries());
    if (Array.isArray(groupOrder) && groupOrder.length > 0) {
      const ordered = [];
      const used = new Set();
      groupOrder.forEach((label) => {
        if (groups.has(label)) {
          ordered.push([label, groups.get(label)]);
          used.add(label);
        }
      });
      entries.forEach(([label, points]) => {
        if (!used.has(label)) {
          ordered.push([label, points]);
        }
      });
      return ordered;
    }
    return entries;
  }, [data, filterSources, filterGroups, groupBy, groupField, groupOrder]);

  const fallbackRange = useMemo(() => {
    if (!data || data.length === 0) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    data.forEach((point) => {
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
  }, [data]);

  const showFallbackRange = groupedData.length === 0 && fallbackRange;

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedItems = useMemo(() => {
    if (!data || selectedIds.length === 0) return [];
    const idSet = new Set(selectedIds);
    return data.filter((_, idx) => idSet.has(idx));
  }, [data, selectedIds]);

  useEffect(() => {
    if (!onSelection) return;
    if (!enableSelection) return;
    onSelection(selectedItems);
  }, [enableSelection, onSelection, selectedItems]);

  const traces = useMemo(() => {
    const colorscale = SCATTER_COLOR_SCALE.map((color, index) => [
      index / (SCATTER_COLOR_SCALE.length - 1),
      color,
    ]);
    const normalizedPointSize = Number.isFinite(pointSize) ? pointSize : 4.5;
    const showGroup =
      groupField &&
      (data || []).some(
        (point) => point?.[groupField] !== undefined && point?.[groupField] !== null
      );
    const hoverField = valueField || colorField;
    const orderedLabels =
      Array.isArray(groupOrder) && groupOrder.length > 0
        ? groupOrder
        : groupedData.map(([label]) => label);
    const colorMap = new Map();
    const colorTotal = orderedLabels.length || groupedData.length || 1;
    orderedLabels.forEach((label, idx) => {
      colorMap.set(label, getScatterColor(idx, colorTotal));
    });
    return groupedData.map(([label, points], idx) => {
      const selectedPoints = [];
      points.forEach((point, pointIndex) => {
        if (selectedSet.has(point.__index)) {
          selectedPoints.push(pointIndex);
        }
      });
      const isHighlighted = !highlightSource || highlightSource === label;
      const baseOpacity = isHighlighted ? 0.7 : 0.15;
      const baseSize = isHighlighted
        ? normalizedPointSize
        : Math.max(2, normalizedPointSize * 0.7);
      const colorValues = colorField
        ? points.map((point) => {
            const value = Number(point[colorField]);
            return Number.isFinite(value) ? value : null;
          })
        : null;
      // 只在第一个分组显示色阶条，避免重复
      const isFirstTrace = idx === 0;
      const marker = colorField
        ? {
            size: baseSize,
            color: colorValues,
            colorscale,
            cmin: colorRange?.min,
            cmax: colorRange?.max,
            opacity: baseOpacity,
            line: {
              width: 0,
            },
            showscale: isFirstTrace,
            colorbar: isFirstTrace
              ? {
                  title: {
                    text: colorField,
                    font: { size: 12, family: 'Noto Sans SC, sans-serif' },
                  },
                  tickfont: { size: 11, family: 'Noto Sans SC, sans-serif' },
                  thickness: 12,
                  len: 0.8,
                  x: 1.02,
                  xanchor: 'left',
                }
              : undefined,
          }
        : {
            size: baseSize,
            color: colorMap.get(label) ?? getScatterColor(idx, colorTotal),
            opacity: baseOpacity,
            line: {
              width: 0,
            },
          };
      const hoverLines = [
        `${xLabel || 'X'}: %{x}`,
        `${yLabel || 'Y'}: %{y}`,
        '样本: %{customdata[1]}',
      ];
      if (hoverField) {
        hoverLines.push(`${hoverField}: %{customdata[2]}`);
      }
      if (showGroup) {
        hoverLines.push(`聚类: %{customdata[3]}`);
      }

      return {
        type: 'scattergl',
        mode: 'markers',
        name: label,
        x: points.map((point) => point.x),
        y: points.map((point) => point.y),
        customdata: points.map((point) => [
          point.__index,
          point.source ?? '',
          hoverField ? point[hoverField] : null,
          groupField ? point[groupField] ?? point.group ?? '' : '',
        ]),
        text: points.map((point) => `${point.source ?? ''}`),
        marker,
        selectedpoints: selectedPoints,
        selected: {
          marker: {
            opacity: isHighlighted ? 0.95 : 0.6,
            size: isHighlighted
              ? normalizedPointSize + 1.5
              : Math.max(2.5, normalizedPointSize + 0.5),
            line: {
              width: isHighlighted ? 1 : 0,
              color: '#111827',
            },
          },
        },
        unselected: {
          marker: {
            opacity: selectedPoints.length > 0 ? (isHighlighted ? 0.25 : 0.08) : baseOpacity,
          },
        },
        hovertemplate: `${hoverLines.join('<br>')}<extra></extra>`,
      };
    });
  }, [
    colorField,
    colorRange,
    data,
    groupedData,
    groupField,
    groupOrder,
    highlightSource,
    pointSize,
    selectedSet,
    valueField,
    xLabel,
    yLabel,
  ]);

  const handleSelected = (event) => {
    if (!enableSelection) return;
    if (isSelectionLocked) return;
    const points = event?.points || [];
    const ids = points
      .map((point) => {
        if (Array.isArray(point.customdata)) {
          return Number(point.customdata[0]);
        }
        if (Number.isFinite(Number(point.customdata))) {
          return Number(point.customdata);
        }
        const curveIndex = point.curveNumber;
        const pointIndex = point.pointNumber ?? point.pointIndex;
        const groupPoints = groupedData?.[curveIndex]?.[1];
        if (!groupPoints || !Number.isFinite(pointIndex)) return null;
        return groupPoints[pointIndex]?.__index ?? null;
      })
      .filter((id) => Number.isFinite(id));
    if (ids.length === 0) return;
    setSelectedIds(ids);
  };

  const handleDeselect = () => {
    if (!enableSelection) return;
    // Keep current selection; only clear via the "清除选择" button.
    if (selectedIds.length === 0) return;
    setSelectedIds((prev) => [...prev]);
  };

  const handleClearSelection = () => {
    if (!enableSelection) return;
    setSelectedIds([]);
    onSelection && onSelection([]);
  };

  const resolvedHeight = responsiveHeight ? autoHeight : height;
  const plotHeight = Math.max(240, resolvedHeight - chromeHeight);
  const shouldLockAspect = lockAspect && groupedData.length > 0 && data && data.length > 1;
  const resolvedFontScale = Number.isFinite(fontScale) ? fontScale : 1;
  const axisTitleFontSize = Math.max(12, Math.round(rootFontSize * 0.95 * resolvedFontScale));
  const axisTickFontSize = Math.max(11, Math.round(rootFontSize * 0.8 * resolvedFontScale));
  const legendFontSize = Math.max(11, Math.round(rootFontSize * 0.85 * resolvedFontScale));
  const hoverFontSize = Math.max(12, Math.round(rootFontSize * 0.95 * resolvedFontScale));
  const modebarScale = Math.max(1, rootFontSize / 16);
  const axisMarginLeft = Math.max(70, Math.round(rootFontSize * 4));
  const axisMarginBottom = Math.max(70, Math.round(rootFontSize * 3.2));

  useEffect(() => {
    if (!plotNode) return;
    const modebar = plotNode.querySelector('.modebar');
    const modebarContainer = plotNode.querySelector('.modebar-container');
    if (modebar) {
      modebar.style.transform = `scale(${modebarScale})`;
      modebar.style.transformOrigin = 'top right';
    }
    if (modebarContainer) {
      modebarContainer.style.right = '8px';
      modebarContainer.style.top = '0px';
      modebarContainer.style.left = 'auto';
      modebarContainer.style.bottom = 'auto';
      modebarContainer.style.position = 'absolute';
    }
  }, [plotNode, modebarScale]);

  return (
    <div ref={containerRef} className="relative w-full scatter-plot-root">
      {showSelectionToolbar && enableSelection && (
        <div
          ref={toolbarRef}
          className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/90 p-2.5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-md"
              aria-label={modeLabel}
            >
              <MousePointer2 className="h-4 w-4" />
              {modeLabel}
            </div>
            <button
              onClick={handleClearSelection}
              disabled={selectedIds.length === 0}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                selectedIds.length === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              清除选择
            </button>
            {onConfirmSelection && (
              <button
                onClick={onConfirmSelection}
                disabled={confirmDisabled}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  confirmDisabled
                  ? 'bg-amber-100 text-amber-300 cursor-not-allowed'
                  : 'bg-amber-600 text-white hover:bg-amber-500'
                }`}
              >
                {confirmLabel}
              </button>
            )}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {toolbarActions}
            <span className="text-sm text-slate-600">
              已选 <span className="font-semibold text-slate-900">{selectedIds.length}</span> 个点
            </span>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white/95 shadow-sm">
        {!chromeReady ? (
          <div style={{ height: resolvedHeight }} />
        ) : (
          <Plot
            data={traces}
            layout={{
              height: plotHeight,
              autosize: true,
              dragmode: dragMode,
              hovermode: 'closest',
              showlegend: showLegend,
              margin: { l: axisMarginLeft, r: 30, t: 0, b: axisMarginBottom },
              xaxis: {
                title: {
                  text: xLabel || 'X',
                  font: { size: axisTitleFontSize, family: 'Noto Sans SC, sans-serif' },
                  standoff: 8,
                },
                autorange: showFallbackRange ? false : true,
                range: showFallbackRange ? showFallbackRange.x : undefined,
                automargin: true,
                showline: true,
                linecolor: '#e7e5e4',
                linewidth: 1,
                ticks: 'outside',
                ticklen: 6,
                tickwidth: 1,
                gridcolor: '#f0f0f0',
                zerolinecolor: '#e5e7eb',
                tickfont: { size: axisTickFontSize, family: 'Noto Sans SC, sans-serif' },
                constrain: shouldLockAspect ? 'domain' : undefined,
              },
              yaxis: {
                title: {
                  text: yLabel || 'Y',
                  font: { size: axisTitleFontSize, family: 'Noto Sans SC, sans-serif' },
                  standoff: 10,
                },
                autorange: showFallbackRange ? false : true,
                range: showFallbackRange ? showFallbackRange.y : undefined,
                automargin: true,
                showline: true,
                linecolor: '#cbd5f5',
                linewidth: 1,
                ticks: 'outside',
                ticklen: 6,
                tickwidth: 1,
                gridcolor: '#f0f0f0',
                zerolinecolor: '#e5e7eb',
                tickfont: { size: axisTickFontSize, family: 'Noto Sans SC, sans-serif' },
                scaleanchor: shouldLockAspect ? 'x' : undefined,
                scaleratio: shouldLockAspect ? 1 : undefined,
                constrain: shouldLockAspect ? 'domain' : undefined,
              },
              legend: showLegend
                ? {
                    orientation: 'h',
                    y: -0.25,
                    font: { size: legendFontSize, family: 'Noto Sans SC, sans-serif' },
                  }
                : undefined,
              hoverlabel: {
                font: {
                  size: hoverFontSize,
                  family: 'Noto Sans SC, sans-serif',
                  color: '#f9fafb',
                },
                bgcolor: '#111827',
                bordercolor: '#111827',
              },
              font: { family: 'Noto Sans SC, sans-serif' },
            }}
            config={{
              responsive: true,
              scrollZoom: true,
              displaylogo: false,
              modeBarButtonsToRemove: enableSelection ? ['select2d'] : ['select2d', 'lasso2d'],
            }}
            onSelected={enableSelection ? handleSelected : undefined}
            onDeselect={enableSelection ? handleDeselect : undefined}
            onInitialized={(_, graphDiv) => {
              setPlotNode(graphDiv);
              onPlotReady && onPlotReady(graphDiv);
            }}
            onUpdate={(_, graphDiv) => {
              setPlotNode(graphDiv);
              onPlotReady && onPlotReady(graphDiv);
            }}
            style={{ width: '100%', height: plotHeight }}
            useResizeHandler
          />
        )}
      </div>

      {showSelectionToolbar && enableSelection && (
        <div
          ref={hintRef}
          className="mt-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-sm text-amber-700"
        >
          提示：默认进入套索选择；选中后自动切换为平移，点击清除选择后可再次框选。
        </div>
      )}
    </div>
  );
};

export default React.memo(ScatterPlot);
