import React, { useState, useMemo, useRef } from 'react';
import { X, Download, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Checkbox } from '../ui/checkbox';
import ScatterPlot, { SCATTER_COLOR_SCALE, getScatterColor } from '../ScatterPlot';
import HeatmapDendrogram from '../HeatmapDendrogram';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { downloadCsv, downloadHeatmapCsv, generateTimestampFilename, formatTableValue } from '../../utils/exportUtils';
import { buildScatterTableColumns, normalizeGroupValue, normalizeSourceValue } from '../../utils/dataHelpers';

/**
 * 历史聚类结果查看弹窗
 * 用于查看历史聚类分析结果，不影响当前散点图状态
 */
const HistoryClusterDialog = ({ result, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('scatter');
  const [colorMode, setColorMode] = useState('cluster');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedSources, setSelectedSources] = useState([]);
  const [isSourceOpen, setIsSourceOpen] = useState(true);
  const [isGroupOpen, setIsGroupOpen] = useState(true);
  const [scatterPointSize, setScatterPointSize] = useState(5);
  const heatmapSvgRef = useRef(null);

  // 获取数据
  const scatterData = result?.scatterData || [];
  const clusterData = result?.clusterData || [];
  const heatmap = result?.heatmap;
  const hasClusterData = clusterData.length > 0;

  // 使用聚类数据或散点数据
  const displayData = hasClusterData ? clusterData : scatterData;

  // 来源选项
  const sourceOptions = useMemo(() => {
    const sources = new Set();
    let hasEmpty = false;
    displayData.forEach((point) => {
      const sourceValue = normalizeSourceValue(point?.source ?? point?.sourceId);
      if (sourceValue === '未知') {
        hasEmpty = true;
      } else {
        sources.add(sourceValue);
      }
    });
    const ordered = Array.from(sources);
    if (hasEmpty) ordered.push('未知');
    return ordered;
  }, [displayData]);

  // 分组选项
  const groupOptions = useMemo(() => {
    if (!hasClusterData) return [];
    const groups = new Set();
    let hasEmpty = false;
    clusterData.forEach((point) => {
      const groupValue = point?.group ?? point?.cluster;
      if (groupValue === undefined || groupValue === null || String(groupValue).trim() === '') {
        hasEmpty = true;
      } else {
        groups.add(String(groupValue));
      }
    });
    const ordered = Array.from(groups).sort((a, b) => Number(a) - Number(b));
    if (hasEmpty) ordered.push('未分组');
    return ordered;
  }, [clusterData, hasClusterData]);

  // 初始化筛选
  React.useEffect(() => {
    setSelectedSources(sourceOptions);
  }, [sourceOptions]);

  React.useEffect(() => {
    setSelectedGroups(groupOptions);
  }, [groupOptions]);

  // 过滤数据
  const filteredData = useMemo(() => {
    const hasSourceFilter = selectedSources.length > 0 && selectedSources.length < sourceOptions.length;
    const hasGroupFilter = hasClusterData && selectedGroups.length > 0 && selectedGroups.length < groupOptions.length;

    if (!hasSourceFilter && !hasGroupFilter) return displayData;

    return displayData.filter((point) => {
      const sourceValue = normalizeSourceValue(point?.source ?? point?.sourceId);
      const groupValue = normalizeGroupValue(point?.group ?? point?.cluster) || '未分组';

      if (hasSourceFilter && !selectedSources.includes(sourceValue)) return false;
      if (hasGroupFilter && !selectedGroups.includes(groupValue)) return false;
      return true;
    });
  }, [displayData, selectedSources, selectedGroups, sourceOptions, groupOptions, hasClusterData]);

  // 图例项
  const sourceLegendItems = useMemo(() => {
    const groups = new Map();
    displayData.forEach((point) => {
      const label = point.source ?? '未知';
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    const entries = Array.from(groups.entries());
    const total = entries.length || 1;
    return entries.map(([label, count], index) => ({
      label,
      count,
      color: getScatterColor(index, total),
    }));
  }, [displayData]);

  const clusterLegendItems = useMemo(() => {
    if (!hasClusterData) return [];
    const groups = new Map();
    clusterData.forEach((point) => {
      const rawValue = point.group ?? point.cluster ?? '未分组';
      const label = rawValue === '' ? '未分组' : String(rawValue);
      groups.set(label, (groups.get(label) || 0) + 1);
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
  }, [clusterData, hasClusterData]);

  // 活跃分组
  const activeGroupBy = colorMode === 'cluster' ? 'group' : 'source';
  const activeGroupOrder = colorMode === 'cluster'
    ? clusterLegendItems.map((item) => item.label)
    : sourceLegendItems.map((item) => item.label);
  const activeFilterGroups = colorMode === 'cluster' ? selectedGroups : null;

  // 下载处理
  const handleDownloadScatterCsv = () => {
    if (!filteredData.length) return;
    downloadCsv(generateTimestampFilename('history-scatter'), filteredData);
  };

  const handleDownloadClusterCsv = () => {
    if (!heatmap?.values?.length) return;
    downloadHeatmapCsv(generateTimestampFilename('history-cluster'), heatmap);
  };

  // 切换筛选
  const handleToggleSource = (label, checked) => {
    setSelectedSources((prev) => {
      if (checked) return prev.includes(label) ? prev : [...prev, label];
      return prev.filter((item) => item !== label);
    });
  };

  const handleToggleCluster = (label, checked) => {
    setSelectedGroups((prev) => {
      if (checked) return prev.includes(label) ? prev : [...prev, label];
      return prev.filter((item) => item !== label);
    });
  };

  // 散点表列
  const scatterTableColumns = useMemo(() => buildScatterTableColumns(filteredData), [filteredData]);

  // 格式化时间
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('zh-CN');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl w-[95vw] h-[90vh] p-0 flex flex-col">
        {/* 头部 */}
        <DialogHeader className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
                返回
              </button>
              <DialogTitle className="text-lg font-semibold text-slate-800">
                {result?.name || '历史聚类结果'}
              </DialogTitle>
            </div>
            <div className="text-sm text-slate-500">
              保存于 {formatTime(result?.savedAt)}
            </div>
          </div>
        </DialogHeader>

        {/* 内容区 */}
        <div className="flex-1 min-h-0 p-6 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="flex flex-wrap gap-1 bg-slate-100/60 p-1.5 w-fit">
              <TabsTrigger value="scatter" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:via-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white">
                散点图
              </TabsTrigger>
              {heatmap?.values?.length > 0 && (
                <TabsTrigger value="heatmap" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:via-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white">
                  聚类热图
                </TabsTrigger>
              )}
              {heatmap?.values?.length > 0 && (
                <TabsTrigger value="cluster-table" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:via-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white">
                  聚类表
                </TabsTrigger>
              )}
              <TabsTrigger value="scatter-table" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:via-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white">
                散点表
              </TabsTrigger>
            </TabsList>

            {/* 散点图标签 */}
            <TabsContent value="scatter" className="flex-1 min-h-0 mt-4">
              <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,8fr)_minmax(0,2fr)]">
                {/* 左侧散点图 */}
                <div className="min-w-0 h-full rounded-2xl border border-slate-200 bg-white/90 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-500">
                      当前显示 {filteredData.length} / {displayData.length} 个点
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadScatterCsv}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" />
                      下载数据
                    </button>
                  </div>
                  <div className="h-[calc(100%-3rem)]">
                    <ScatterPlot
                      data={filteredData}
                      height={450}
                      showLegend={false}
                      enableSelection={false}
                      showSelectionToolbar={false}
                      filterSources={selectedSources}
                      filterGroups={activeFilterGroups}
                      groupField="group"
                      groupBy={activeGroupBy}
                      groupOrder={activeGroupOrder}
                      xLabel="X"
                      yLabel="Y"
                      pointSize={scatterPointSize}
                    />
                  </div>
                </div>

                {/* 右侧图例 */}
                <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/90 p-4 overflow-y-auto">
                  {/* 颜色模式 */}
                  {hasClusterData && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 mb-3">
                      <div className="text-xs font-semibold text-slate-700 mb-2">颜色方式</div>
                      <div className="flex rounded-lg border border-slate-200 bg-white p-1">
                        <button
                          type="button"
                          onClick={() => setColorMode('cluster')}
                          className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                            colorMode === 'cluster'
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          聚类
                        </button>
                        <button
                          type="button"
                          onClick={() => setColorMode('source')}
                          className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                            colorMode === 'source'
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          来源
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 点大小 */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">点大小</span>
                      <span className="text-xs text-slate-500">{scatterPointSize.toFixed(1)} px</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={12}
                      step={0.5}
                      value={scatterPointSize}
                      onChange={(e) => setScatterPointSize(Number(e.target.value))}
                      className="mt-2 w-full"
                    />
                  </div>

                  {/* 来源筛选 */}
                  <Collapsible open={isSourceOpen} onOpenChange={setIsSourceOpen}>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>来源筛选</span>
                      <CollapsibleTrigger asChild>
                        <button type="button" className="p-1 hover:bg-slate-100 rounded">
                          {isSourceOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="mt-2 space-y-1">
                        {sourceLegendItems.map((item) => {
                          const isEnabled = selectedSources.includes(item.label);
                          return (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => handleToggleSource(item.label, !isEnabled)}
                              className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-xs transition ${
                                isEnabled ? 'border-slate-100 bg-slate-50 text-slate-700' : 'border-slate-200 bg-slate-100 text-slate-400'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color, opacity: isEnabled ? 1 : 0.4 }} />
                                <span className={isEnabled ? '' : 'line-through'}>{item.label}</span>
                              </div>
                              <span className="text-xs">{item.count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* 聚类筛选 */}
                  {hasClusterData && (
                    <Collapsible open={isGroupOpen} onOpenChange={setIsGroupOpen} className="mt-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>聚类筛选</span>
                        <CollapsibleTrigger asChild>
                          <button type="button" className="p-1 hover:bg-slate-100 rounded">
                            {isGroupOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent>
                        <div className="mt-2 space-y-1">
                          {clusterLegendItems.map((item) => {
                            const isEnabled = selectedGroups.includes(item.label);
                            return (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => handleToggleCluster(item.label, !isEnabled)}
                                className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-xs transition ${
                                  isEnabled ? 'border-slate-100 bg-slate-50 text-slate-700' : 'border-slate-200 bg-slate-100 text-slate-400'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color, opacity: isEnabled ? 1 : 0.4 }} />
                                  <span className={isEnabled ? '' : 'line-through'}>聚类 {item.label}</span>
                                </div>
                                <span className="text-xs">{item.count}</span>
                              </button>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </aside>
              </div>
            </TabsContent>

            {/* 热图标签 */}
            <TabsContent value="heatmap" className="flex-1 min-h-0 mt-4">
              {heatmap?.values?.length > 0 && (
                <div className="h-full rounded-2xl border border-slate-200 bg-white/90 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-600">聚类热图</span>
                    <button
                      type="button"
                      onClick={() => {
                        const svg = heatmapSvgRef.current;
                        if (!svg) return;
                        // 下载 SVG 逻辑
                        const serializer = new XMLSerializer();
                        const svgString = serializer.serializeToString(svg);
                        const blob = new Blob([svgString], { type: 'image/svg+xml' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `heatmap-${result?.name || 'history'}.svg`;
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" />
                      下载热图
                    </button>
                  </div>
                  <div className="h-[calc(100%-3rem)] flex items-center justify-center">
                    <HeatmapDendrogram
                      heatmap={heatmap}
                      rowTree={null}
                      colTree={null}
                      width={800}
                      height={500}
                      svgRef={heatmapSvgRef}
                      showTitle={false}
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            {/* 聚类表标签 */}
            <TabsContent value="cluster-table" className="flex-1 min-h-0 mt-4">
              <div className="h-full rounded-2xl border border-slate-200 bg-white/90 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-600">聚类表</span>
                  <button
                    type="button"
                    onClick={handleDownloadClusterCsv}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    下载聚类表
                  </button>
                </div>
                <div className="h-[calc(100%-3rem)] overflow-auto">
                  {heatmap?.rows?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>聚类</TableHead>
                          {heatmap.cols?.map((col) => (
                            <TableHead key={col}>{col}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {heatmap.rows.map((rowLabel, rowIndex) => (
                          <TableRow key={rowLabel}>
                            <TableCell className="font-medium">{rowLabel}</TableCell>
                            {(heatmap.values[rowIndex] || []).map((value, valueIndex) => (
                              <TableCell key={`${rowLabel}-${heatmap.cols[valueIndex]}`}>
                                {formatTableValue(value)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center text-slate-500 py-8">暂无聚类表数据</div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* 散点表标签 */}
            <TabsContent value="scatter-table" className="flex-1 min-h-0 mt-4">
              <div className="h-full rounded-2xl border border-slate-200 bg-white/90 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-600">散点表</span>
                  <button
                    type="button"
                    onClick={handleDownloadScatterCsv}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    下载散点表
                  </button>
                </div>
                <div className="h-[calc(100%-3rem)] overflow-auto">
                  {filteredData.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {scatterTableColumns.map((column) => (
                            <TableHead key={column}>{column}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((row, rowIndex) => (
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
                  ) : (
                    <div className="text-center text-slate-500 py-8">暂无散点表数据</div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HistoryClusterDialog;
