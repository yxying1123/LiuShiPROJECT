import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Save } from 'lucide-react';
import { toast } from 'sonner';
import Plotly from 'plotly.js-dist-min';
import PageLayout from '../components/PageLayout';
import { useDataContext } from '../context/data-context';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  HeatmapTab,
  ScatterTab,
  ClusterTableTab,
  ScatterTableTab,
} from '../components/heatmap';
import { useHeatmapLayout } from '../hooks/useHeatmapLayout';
import { useScatterPanelLayout } from '../hooks/useScatterPanelLayout';
import { useScatterFilters } from '../hooks/useScatterFilters';
import { generateTimestampFilename, downloadCsv, remapScatterRowsForExport } from '../utils/exportUtils';
import { calculateValueRange, getColorFieldOptions } from '../utils/dataHelpers';
import { SCATTER_COLOR_SCALE } from '../components/ScatterPlot';

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

  // 对话框状态
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  // 布局 Hooks
  const { heatmapSize, rootFontSize, heatmapContainerRef } = useHeatmapLayout();
  const {
    scatterPlotHeight,
    scatterAreaHeight,
    scatterAreaNode,
    setScatterAreaNode,
  } = useScatterPanelLayout();

  // 散点图状态
  const [scatterPointSize, setScatterPointSize] = useState(5);
  const [scatterColorMode, setScatterColorMode] = useState(() =>
    clusterData?.length > 0 ? 'cluster' : 'value'
  );

  // 筛选 Hook
  const hasClusterPoints = clusterData?.length > 0;
  const scatterPoints = hasClusterPoints ? clusterData : scatterData;

  const {
    selectedGroups,
    setSelectedGroups,
    selectedSources,
    setSelectedSources,
    filteredScatterPoints,
    legendItems,
    sourceItems,
  } = useScatterFilters(scatterPoints, hasClusterPoints);

  // 颜色字段选项
  const colorFieldOptions = useMemo(() => getColorFieldOptions(scatterPoints), [scatterPoints]);

  // 颜色范围
  const colorRange = useMemo(
    () => calculateValueRange(filteredScatterPoints, scatterColorField),
    [filteredScatterPoints, scatterColorField]
  );

  // 颜色渐变
  const colorGradient = useMemo(() => {
    const total = SCATTER_COLOR_SCALE.length - 1;
    return `linear-gradient(90deg, ${SCATTER_COLOR_SCALE.map(
      (color, index) => `${color} ${(index / total) * 100}%`
    ).join(', ')})`;
  }, []);

  // 颜色模式选项
  const colorModeOptions = useMemo(
    () => [
      { value: 'value', label: '数值色阶' },
      { value: 'source', label: '来源筛选' },
      { value: 'cluster', label: '聚类筛选' },
    ],
    []
  );

  // 当前激活的颜色模式处理
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

  const activeColorMode = scatterColorMode;
  const activeGroupBy = activeColorMode === 'source' || !hasClusterPoints ? 'source' : 'group';
  const activeGroupOrder = activeColorMode === 'source' || !hasClusterPoints
    ? sourceItems.map((i) => i.label)
    : legendItems.map((i) => i.label);

  // 保存处理
  const isClusterReady = showCluster && heatmapPayload?.heatmap?.values?.length > 0;
  const isSaveDisabled = saveName.trim().length === 0;

  const handleSave = () => {
    if (isSaveDisabled) return;
    saveClusterResult(saveName);
    setSaveName('');
    setIsSaveOpen(false);
  };

  // 下载处理
  const handleDownloadScatterImage = async (plotNode) => {
    if (!plotNode || !Plotly) return;
    try {
      const url = await Plotly.toImage(plotNode, {
        format: 'png',
        width: plotNode.clientWidth || 1200,
        height: plotNode.clientHeight || 600,
      });
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
      link.download = `scatter-plot-${timestamp}.png`;
      link.href = url;
      link.click();
    } catch {
      // ignore
    }
  };

  const handleDownloadScatterCsv = () => {
    if (!filteredScatterPoints?.length) return;
    const axisMap = scatterMode === '2d' ? { x: scatterAxisX, y: scatterAxisY } : {};
    const rows = remapScatterRowsForExport(filteredScatterPoints, axisMap);
    downloadCsv(generateTimestampFilename('scatter-table'), rows);
  };

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
              onClick={() => navigate('/scatter')}
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
        {!scatterData?.length && (
          <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
            暂无可用数据，请先在散点图页面生成数据并执行聚类分析。
          </div>
        )}

        {scatterData?.length > 0 && !isClusterReady && (
          <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
            暂未生成热图，请返回数据配置页面点击"聚类分析"。
          </div>
        )}

        {isClusterReady && (
          <Tabs defaultValue="heatmap" className="space-y-3 flex flex-col flex-1 min-h-0">
            <TabsList className="flex flex-wrap gap-1 bg-slate-100/60 p-1.5">
              <TabsTrigger
                value="heatmap"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:via-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white"
              >
                聚类热图树
              </TabsTrigger>
              <TabsTrigger
                value="scatter"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:via-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white"
              >
                散点图
              </TabsTrigger>
              <TabsTrigger
                value="cluster-table"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:via-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white"
              >
                聚类表
              </TabsTrigger>
              <TabsTrigger
                value="scatter-table"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:via-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white"
              >
                散点表
              </TabsTrigger>
            </TabsList>

            <TabsContent value="heatmap">
              <HeatmapTab
                heatmapPayload={heatmapPayload}
                heatmapSize={heatmapSize}
                rootFontSize={rootFontSize}
              />
            </TabsContent>

            <TabsContent value="scatter" className="flex flex-col flex-1 min-h-0">
              <ScatterTab
                scatterPoints={scatterPoints}
                filteredScatterPoints={filteredScatterPoints}
                hasClusterPoints={hasClusterPoints}
                scatterMode={scatterMode}
                scatterAxisX={scatterAxisX}
                scatterAxisY={scatterAxisY}
                scatterSelectedColumns={scatterSelectedColumns}
                activeColorMode={activeColorMode}
                colorModeOptions={colorModeOptions}
                onColorModeChange={setScatterColorMode}
                colorFieldOptions={colorFieldOptions}
                scatterColorField={scatterColorField}
                setScatterColorField={setScatterColorField}
                colorGradient={colorGradient}
                colorRange={colorRange}
                sourceItems={sourceItems}
                selectedSources={selectedSources}
                setSelectedSources={setSelectedSources}
                legendItems={legendItems}
                selectedGroups={selectedGroups}
                setSelectedGroups={setSelectedGroups}
                scatterAreaNode={scatterAreaNode}
                setScatterAreaNode={setScatterAreaNode}
                scatterPlotHeight={scatterPlotHeight}
                scatterAreaHeight={scatterAreaHeight}
                scatterPointSize={scatterPointSize}
                setScatterPointSize={setScatterPointSize}
                groupBy={activeGroupBy}
                groupOrder={activeGroupOrder}
                onDownloadScatterImage={handleDownloadScatterImage}
                onDownloadScatterCsv={handleDownloadScatterCsv}
              />
            </TabsContent>

            <TabsContent value="cluster-table">
              <ClusterTableTab heatmap={heatmapPayload?.heatmap} />
            </TabsContent>

            <TabsContent value="scatter-table">
              <ScatterTableTab
                scatterPoints={filteredScatterPoints}
                axisLabelMap={scatterMode === '2d' ? { x: scatterAxisX, y: scatterAxisY } : {}}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* 保存对话框 */}
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
              onChange={(e) => setSaveName(e.target.value)}
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

      {/* 隐藏的容器用于热图尺寸计算 */}
      <div ref={heatmapContainerRef} className="hidden" />
    </PageLayout>
  );
};

export default HeatmapPage;
