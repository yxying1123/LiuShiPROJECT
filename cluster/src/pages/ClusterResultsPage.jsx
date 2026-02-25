import React, { useMemo, useState } from 'react';
import { Download, FolderOpen, Files, ChevronRight, Clock, Database, Layers, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { useDataContext } from '../context/data-context';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';

const formatDateTime = (isoString) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
};

const formatFileStamp = (isoString) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours()
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

const formatRelativeTime = (isoString) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} 天前`;
  if (hours > 0) return `${hours} 小时前`;
  if (minutes > 0) return `${minutes} 分钟前`;
  return '刚刚';
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

const normalizePointRows = (rows) =>
  (rows || []).map((row) => {
    if (!row || typeof row !== 'object') return row;
    const { originalData, ...rest } = row;
    return rest;
  });

const ResultCard = ({ result }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(null);

  const scatterCount = result.scatterData?.length || 0;
  const heatmapRows = result.heatmap?.rows?.length || 0;
  const heatmapCols = result.heatmap?.cols?.length || 0;
  const heatmapValues = result.heatmap?.values?.length || 0;
  const uniqueClusters = useMemo(() => {
    if (!result.scatterData) return 0;
    const clusters = new Set(result.scatterData.map(p => p.cluster).filter(c => c !== undefined));
    return clusters.size;
  }, [result.scatterData]);

  const handleDownload = (type, downloadFn, filename) => {
    setIsDownloading(type);
    downloadFn();
    setTimeout(() => setIsDownloading(null), 500);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="group overflow-hidden border-0 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-slate-200/50 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1">
        <CollapsibleTrigger asChild>
          <div className="flex cursor-pointer flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-500/30 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-amber-500/40">
                <Layers className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-slate-900">{result.name}</h3>
                  <Badge variant="secondary" className="bg-gradient-to-r from-amber-100 to-rose-100 text-amber-700 border-0">
                    {result.heatmap ? '聚类' : '降维'}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {formatRelativeTime(result.savedAt)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-slate-700">{scatterCount.toLocaleString()}</span> 数据点
                  </span>
                  {heatmapValues > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Files className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-700">{heatmapRows} × {heatmapCols}</span> 热图矩阵
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:ml-auto">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-all duration-300 ${isOpen ? 'bg-amber-100 text-amber-600 rotate-90' : 'group-hover:bg-amber-50 group-hover:text-amber-600'}`}>
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scatterCount > 0 && (
                <button
                  type="button"
                  onClick={() => handleDownload('scatter', () =>
                    downloadCsv(
                      `scatter-dimension-${result.fileStamp}.csv`,
                      normalizePointRows(result.scatterData)
                    ), `scatter-dimension-${result.fileStamp}.csv`
                  )}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all duration-300 hover:border-amber-300 hover:bg-gradient-to-r hover:from-amber-50/80 hover:to-rose-50/50 hover:shadow-lg hover:shadow-amber-200/30 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30 transition-transform duration-300 group-hover:scale-110">
                      <Database className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">降维数据表</p>
                      <p className="text-sm text-slate-500">{scatterCount.toLocaleString()} 条记录</p>
                    </div>
                  </div>
                  {isDownloading === 'scatter' ? (
                    <Progress value={100} className="h-1.5 w-14 animate-pulse" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition-all duration-300 group-hover:bg-white group-hover:shadow-md group-hover:text-amber-600">
                      <Download className="h-5 w-5" />
                    </div>
                  )}
                </button>
              )}
              {heatmapValues > 0 && (
                <button
                  type="button"
                  onClick={() => handleDownload('heatmap', () =>
                    downloadHeatmapCsv(
                      `heatmap-cluster-${result.fileStamp}.csv`,
                      result.heatmap
                    ), `heatmap-cluster-${result.fileStamp}.csv`
                  )}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all duration-300 hover:border-amber-300 hover:bg-gradient-to-r hover:from-amber-50/80 hover:to-rose-50/50 hover:shadow-lg hover:shadow-amber-200/30 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30 transition-transform duration-300 group-hover:scale-110">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">热图聚类结果</p>
                      <p className="text-sm text-slate-500">{heatmapRows} × {heatmapCols}</p>
                    </div>
                  </div>
                  {isDownloading === 'heatmap' ? (
                    <Progress value={100} className="h-1.5 w-14 animate-pulse" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition-all duration-300 group-hover:bg-white group-hover:shadow-md group-hover:text-amber-600">
                      <Download className="h-5 w-5" />
                    </div>
                  )}
                </button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white py-16 text-center transition-all duration-500 hover:border-amber-300 hover:from-amber-50/50 hover:to-white">
    <div className="relative mb-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 shadow-inner">
        <FolderOpen className="h-10 w-10" />
      </div>
      <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/40">
        <Sparkles className="h-4 w-4" />
      </div>
    </div>
    <h3 className="mb-2 text-xl font-semibold text-slate-900">暂无结果</h3>
  </div>
);

const ResultsHeader = ({ count }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-500/30">
        <Layers className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900">聚类结果</h2>
        <p className="text-sm text-slate-500">查看和管理已保存的分析结果</p>
      </div>
    </div>
    {count > 0 && (
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 via-amber-300 to-transparent sm:hidden" />
        <Badge variant="secondary" className="bg-gradient-to-r from-amber-100 to-rose-100 text-amber-700 border-0 px-4 py-1.5">
          共 <span className="mx-1 font-bold">{count}</span> 个结果
        </Badge>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-300 to-slate-200 sm:hidden" />
      </div>
    )}
  </div>
);

const ClusterResultsPage = () => {
  const { clusterResults, error, warning, startNewAnalysis } = useDataContext();
  const navigate = useNavigate();
  const hasResults = clusterResults.length > 0;

  const normalizedResults = useMemo(
    () =>
      clusterResults.map((result) => ({
        ...result,
        savedLabel: formatDateTime(result.savedAt),
        fileStamp: formatFileStamp(result.savedAt),
      })),
    [clusterResults]
  );

  return (
    <PageLayout
      title={<ResultsHeader count={normalizedResults.length} />}
      subtitle=""
      error={error}
      warning={warning}
      containerClassName="max-w-none"
      cardClassName="min-h-[calc(100vh-140px)]"
    >
      {!hasResults ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {normalizedResults.map((result) => (
            <ResultCard key={result.id} result={result} />
          ))}
        </div>
      )}
    </PageLayout>
  );
};

export default ClusterResultsPage;
