import React, { useState, useRef, useCallback } from 'react';
import { Download } from 'lucide-react';
import Plotly from 'plotly.js-dist-min';
import ScatterPlot from '../ScatterPlot';
import ScatterLegendPanel from './ScatterLegendPanel';
import PreviewGallery from './PreviewGallery';
import { SCATTER_COLOR_SCALE } from '../ScatterPlot';

const PREVIEW_IMAGE_SIZE = { width: 360, height: 240 };

/**
 * 散点图标签页组件
 */
const ScatterTab = ({
  // 数据
  scatterPoints,
  filteredScatterPoints,
  hasClusterPoints,
  // 坐标轴
  scatterMode,
  scatterAxisX,
  scatterAxisY,
  scatterSelectedColumns,
  // 筛选
  activeColorMode,
  colorModeOptions,
  onColorModeChange,
  colorFieldOptions,
  scatterColorField,
  setScatterColorField,
  colorGradient,
  colorRange,
  // 来源/聚类筛选
  sourceItems,
  selectedSources,
  setSelectedSources,
  legendItems,
  selectedGroups,
  setSelectedGroups,
  // 尺寸
  scatterAreaNode,
  setScatterAreaNode,
  scatterPlotHeight,
  scatterAreaHeight,
  scatterPointSize,
  setScatterPointSize,
  // 其他
  groupBy,
  groupOrder,
  onDownloadScatterImage,
  onDownloadScatterCsv,
}) => {
  const [scatterPlotNode, setScatterPlotNode] = useState(null);
  const [isSourceOpen, setIsSourceOpen] = useState(true);
  const [isGroupOpen, setIsGroupOpen] = useState(true);

  // 预览相关状态
  const [previewItems, setPreviewItems] = useState([]);
  const [isPreviewGenerating, setIsPreviewGenerating] = useState(false);
  const [activePreview, setActivePreview] = useState(null);
  const previewPlotRef = useRef(null);

  const activeColorField = activeColorMode === 'value' ? scatterColorField || null : null;

  // 生成预览
  const handleGeneratePreviews = useCallback(async () => {
    if (!previewPlotRef.current || !Plotly) return;
    if (!filteredScatterPoints?.length) return;

    setIsPreviewGenerating(true);

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
      showlegend: false,
    };

    const config = {
      displayModeBar: false,
      staticPlot: true,
      responsive: false,
    };

    const results = [];

    try {
      const previewBaseItems = activeColorMode === 'source' ? sourceItems : legendItems;

      for (const item of previewBaseItems.filter((i) => i.count > 0)) {
        const marker = {
          size: scatterPointSize,
          color: item.color,
          opacity: 0.85,
          line: { width: 0 },
        };

        const trace = {
          type: 'scatter',
          mode: 'markers',
          x: filteredScatterPoints.map((p) => p.x),
          y: filteredScatterPoints.map((p) => p.y),
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
          count: item.count,
          color: item.color,
        });
      }
    } finally {
      Plotly.purge(previewPlotRef.current);
      setPreviewItems(results);
      setIsPreviewGenerating(false);
    }
  }, [filteredScatterPoints, activeColorMode, sourceItems, legendItems, scatterPointSize]);

  const xLabel = scatterMode === '2d'
    ? scatterAxisX || 'X'
    : scatterSelectedColumns.length > 0 ? '降维维度1' : 'X';

  const yLabel = scatterMode === '2d'
    ? scatterAxisY || 'Y'
    : scatterSelectedColumns.length > 0 ? '降维维度2' : 'Y';

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4">
        <span className="text-sm text-slate-500">
          当前显示 {filteredScatterPoints.length} / {scatterPoints.length}
        </span>
        <button
          type="button"
          onClick={onDownloadScatterImage}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          下载散点图
        </button>
      </div>

      {/* 主内容区 */}
      {hasClusterPoints ? (
        <div
          ref={setScatterAreaNode}
          className="grid flex-1 min-h-[520px] gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]"
          style={{ minHeight: scatterAreaHeight }}
        >
          {/* 左侧：散点图 + 预览 */}
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
                filterSources={selectedSources}
                filterGroups={selectedGroups}
                groupField="group"
                groupBy={groupBy}
                groupOrder={groupOrder}
                xLabel={xLabel}
                yLabel={yLabel}
                colorField={activeColorField}
                valueField={scatterColorField || null}
                colorRange={colorRange}
                onPlotReady={setScatterPlotNode}
                pointSize={scatterPointSize}
                fontScale={1.15}
              />
            </div>

            <PreviewGallery
              previewItems={previewItems}
              isGenerating={isPreviewGenerating}
              error=""
              hasGenerated={previewItems.length > 0}
              previewTitle={activeColorMode === 'source' ? '来源' : '类别'}
              showColorChip={activeColorMode !== 'value'}
              onSelect={setActivePreview}
              onGenerate={handleGeneratePreviews}
            />
          </div>

          {/* 右侧：图例面板 */}
          <ScatterLegendPanel
            activeColorMode={activeColorMode}
            colorModeOptions={colorModeOptions}
            onColorModeChange={onColorModeChange}
            colorFieldOptions={colorFieldOptions}
            scatterColorField={scatterColorField}
            setScatterColorField={setScatterColorField}
            colorGradient={colorGradient}
            colorRange={colorRange}
            scatterPointSize={scatterPointSize}
            setScatterPointSize={setScatterPointSize}
            isSourceOpen={isSourceOpen}
            setIsSourceOpen={setIsSourceOpen}
            sourceItems={sourceItems}
            selectedSources={selectedSources}
            setSelectedSources={setSelectedSources}
            isGroupOpen={isGroupOpen}
            setIsGroupOpen={setIsGroupOpen}
            legendItems={legendItems}
            selectedGroups={selectedGroups}
            setSelectedGroups={setSelectedGroups}
            isPreviewGenerating={isPreviewGenerating}
            onGeneratePreviews={handleGeneratePreviews}
            filteredPointsCount={filteredScatterPoints.length}
            totalPointsCount={scatterPoints.length}
          />
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
            filterSources={selectedSources}
            filterGroups={selectedGroups}
            groupField="group"
            groupBy={groupBy}
            groupOrder={groupOrder}
            xLabel={xLabel}
            yLabel={yLabel}
            colorField={activeColorField}
            valueField={scatterColorField || null}
            colorRange={colorRange}
            onPlotReady={setScatterPlotNode}
            pointSize={scatterPointSize}
            fontScale={1.15}
          />
        </div>
      )}

      {/* 隐藏的预览画布 */}
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
    </div>
  );
};

export default ScatterTab;
