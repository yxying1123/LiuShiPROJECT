import React, { useMemo, useState, useRef, useCallback } from 'react';
import { Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

/**
 * 简化版热图组件（无树形结构）
 * @param {Object} props
 * @param {Array} props.rows - 行标签数组
 * @param {Array} props.cols - 列标签数组
 * @param {Array} props.values - 热图数值二维数组
 * @param {string} props.title - 标题
 */
const SimpleHeatmapView = ({ rows = [], cols = [], values = [], title = '自定义分组热图' }) => {
  const [activeTab, setActiveTab] = useState('heatmap');
  const [hoveredCell, setHoveredCell] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const heatmapRef = useRef(null);

  // 计算颜色映射 - 使用蓝-白-红 diverging 配色方案
  const { colorScale, minValue, maxValue } = useMemo(() => {
    if (!values || values.length === 0) {
      return { colorScale: () => '#e2e8f0', minValue: 0, maxValue: 0 };
    }

    const allValues = values.flat().filter(v => typeof v === 'number' && !isNaN(v));
    if (allValues.length === 0) {
      return { colorScale: () => '#e2e8f0', minValue: 0, maxValue: 0 };
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const maxAbs = Math.max(Math.abs(min), Math.abs(max));
    
    // 以 0 为中心对称

    const scale = (value) => {
      if (typeof value !== 'number' || isNaN(value)) return '#e2e8f0';
      
      // 将值归一化到 [-1, 1] 范围，0 为中心
      const normalized = value / maxAbs;
      
      if (normalized < 0) {
        // 负值：蓝色渐变 (深蓝 -> 浅蓝 -> 白)
        const intensity = Math.abs(normalized);
        if (intensity > 0.5) {
          // 深蓝到蓝色
          const t = (intensity - 0.5) * 2;
          const r = Math.round(33 + (67 - 33) * (1 - t));
          const g = Math.round(102 + (147 - 102) * (1 - t));
          const b = Math.round(172 + (195 - 172) * (1 - t));
          return `rgb(${r}, ${g}, ${b})`;
        } else {
          // 蓝色到白色
          const t = intensity * 2;
          const r = Math.round(67 + (255 - 67) * (1 - t));
          const g = Math.round(147 + (255 - 147) * (1 - t));
          const b = Math.round(195 + (255 - 195) * (1 - t));
          return `rgb(${r}, ${g}, ${b})`;
        }
      } else if (normalized > 0) {
        // 正值：红色渐变 (白 -> 浅红 -> 深红)
        const intensity = normalized;
        if (intensity < 0.5) {
          // 白色到浅红
          const t = intensity * 2;
          const r = Math.round(255 + (239 - 255) * t);
          const g = Math.round(255 + (138 - 255) * t);
          const b = Math.round(255 + (98 - 255) * t);
          return `rgb(${r}, ${g}, ${b})`;
        } else {
          // 浅红到深红
          const t = (intensity - 0.5) * 2;
          const r = Math.round(239 + (178 - 239) * t);
          const g = Math.round(138 + (24 - 138) * t);
          const b = Math.round(98 + (43 - 98) * t);
          return `rgb(${r}, ${g}, ${b})`;
        }
      }
      // 接近 0 的值：白色
      return '#ffffff';
    };

    return { colorScale: scale, minValue: -maxAbs, maxValue: maxAbs };
  }, [values]);

  // 格式化数值
  const formatValue = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? String(value) : value.toFixed(3);
    }
    return String(value);
  };

  // 下载热图数据为CSV
  const handleDownloadCsv = useCallback(() => {
    if (!values || values.length === 0) return;

    const headers = ['Group', ...cols];
    const lines = [headers.join(',')];

    rows.forEach((rowLabel, rowIndex) => {
      const rowValues = values[rowIndex] || [];
      const line = [rowLabel, ...rowValues.map(v => formatValue(v))].join(',');
      lines.push(line);
    });

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    link.download = `custom-heatmap-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, [values, cols, rows]);

  // 下载热图为图片
  const handleDownloadImage = useCallback(async () => {
    if (!heatmapRef.current || isDownloading) return;

    setIsDownloading(true);
    try {
      const dataUrl = await toPng(heatmapRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
      link.download = `heatmap-${timestamp}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('下载热图图片失败:', err);
      // 降级为下载 CSV
      handleDownloadCsv();
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, handleDownloadCsv]);

  if (!values || values.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 text-center">
        <p className="text-slate-500">暂无热图数据</p>
      </div>
    );
  }

  // 计算热图尺寸
  const cellWidth = 50;
  const cellHeight = 40;
  const rowLabelWidth = 100;
  const colLabelHeight = 80;
  const colorBarWidth = 20;
  const colorBarHeight = Math.max(150, rows.length * cellHeight);

  // 颜色条刻度
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const value = minValue + (maxValue - minValue) * (i / (tickCount - 1));
    return { value, position: (1 - i / (tickCount - 1)) * 100 };
  });

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <TabsList className="flex flex-wrap gap-1 bg-slate-100/60 p-1.5">
          <TabsTrigger
            value="heatmap"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:via-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white"
          >
            热图
          </TabsTrigger>
          <TabsTrigger
            value="table"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:via-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white"
          >
            热图表
          </TabsTrigger>
        </TabsList>

        {/* 热图标签页 - 彩色格子矩阵 */}
        <TabsContent value="heatmap" className="min-h-[400px]">
          {/* 标题和下载按钮 */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="text-sm font-medium text-slate-700">{title}</div>
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? '下载中...' : '下载热图图片'}
            </button>
          </div>

          {/* 热图可视化 - 彩色格子 */}
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-6">
            {/* 固定高度容器，避免抖动 */}
            <div className="h-[350px] overflow-auto">
              <div ref={heatmapRef} className="inline-block p-4 bg-white">
                <div className="flex items-start gap-6">
                  {/* 热图主体 */}
                  <div className="flex flex-col">
                    {/* 热图矩阵和行标签 */}
                    <div className="flex">
                      {/* 行标签（左侧） */}
                      <div style={{ width: rowLabelWidth }}>
                        {rows.map((row) => (
                          <div
                            key={row}
                            className="flex items-center justify-end pr-3"
                            style={{ height: cellHeight }}
                          >
                            <span className="text-xs font-medium text-slate-700 truncate" title={row}>
                              {row}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* 彩色格子矩阵 */}
                      <div>
                        {rows.map((row, rowIndex) => (
                          <div key={row} className="flex">
                            {(values[rowIndex] || []).map((value, colIndex) => (
                              <div
                                key={`${row}-${cols[colIndex]}`}
                                className="border border-white/60 cursor-pointer transition-all hover:border-slate-500 hover:scale-110 hover:z-10 relative"
                                style={{
                                  width: cellWidth,
                                  height: cellHeight,
                                  backgroundColor: colorScale(value),
                                }}
                                onMouseEnter={() => setHoveredCell({ row, col: cols[colIndex], value, rowIndex, colIndex })}
                                onMouseLeave={() => setHoveredCell(null)}
                                title={`${row} / ${cols[colIndex]}: ${formatValue(value)}`}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 列标题（底部） */}
                    <div className="flex" style={{ marginLeft: rowLabelWidth, marginTop: 8 }}>
                      {cols.map((col) => (
                        <div
                          key={col}
                          className="flex items-start justify-center px-1"
                          style={{ width: cellWidth, height: colLabelHeight }}
                        >
                          <span 
                            className="text-xs text-slate-600 text-center origin-top"
                            style={{
                              writingMode: 'vertical-rl',
                              whiteSpace: 'nowrap',
                            }}
                            title={col}
                          >
                            {col}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 颜色条和刻度（右侧） */}
                  <div className="flex flex-col items-center" style={{ paddingTop: 0 }}>
                    <div className="relative" style={{ height: colorBarHeight }}>
                      {/* 颜色条 */}
                      <div 
                        className="rounded border border-slate-300"
                        style={{
                          width: colorBarWidth,
                          height: colorBarHeight,
                          background: 'linear-gradient(to top, #2166ac 0%, #4393c3 20%, #92c5de 35%, #d1e5f0 45%, #f7f7f7 50%, #fddbc7 55%, #f4a582 65%, #d6604d 80%, #b2182b 100%)',
                        }}
                      />
                      {/* 刻度标签 */}
                      {ticks.map((tick, index) => (
                        <div
                          key={index}
                          className="absolute flex items-center"
                          style={{
                            top: `${tick.position}%`,
                            left: colorBarWidth + 8,
                            transform: 'translateY(-50%)',
                          }}
                        >
                          <span className="text-xs text-slate-600">
                            {tick.value.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* 颜色条标题 */}
                    <div className="mt-2 text-xs text-slate-500">标准化值</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 悬停提示 - 固定位置，使用绝对定位避免抖动 */}
            <div className="h-12 mt-2">
              {hoveredCell ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium text-slate-700">分组: {hoveredCell.row}</span>
                    <span className="font-medium text-slate-700">指标: {hoveredCell.col}</span>
                    <span className="font-medium text-amber-600">值: {formatValue(hoveredCell.value)}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-transparent p-3">
                  <div className="flex items-center gap-4 text-sm text-slate-300">
                    <span>分组: -</span>
                    <span>指标: -</span>
                    <span>值: -</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 统计信息 */}
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            <span>分组数: {rows.length}</span>
            <span>指标数: {cols.length}</span>
            <span>总数据点: {rows.length * cols.length}</span>
          </div>
        </TabsContent>

        {/* 热图表标签页（纯数据表格） */}
        <TabsContent value="table" className="min-h-[400px]">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="text-sm font-medium text-slate-700">热图表数据</div>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              下载数据
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70">
                    <TableHead className="font-semibold text-slate-700">分组</TableHead>
                    {cols.map((col) => (
                      <TableHead key={col} className="text-xs text-slate-600">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((rowLabel, rowIndex) => (
                    <TableRow key={rowLabel}>
                      <TableCell className="font-medium text-slate-700">{rowLabel}</TableCell>
                      {(values[rowIndex] || []).map((value, colIndex) => (
                        <TableCell key={`${rowLabel}-${cols[colIndex]}`} className="text-xs">
                          {formatValue(value)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            <span>分组数: {rows.length}</span>
            <span>指标数: {cols.length}</span>
            <span>总数据点: {rows.length * cols.length}</span>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SimpleHeatmapView;
