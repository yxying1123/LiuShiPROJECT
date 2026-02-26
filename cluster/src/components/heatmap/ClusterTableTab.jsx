import React from 'react';
import { Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { downloadHeatmapCsv, generateTimestampFilename } from '../../utils/exportUtils';
import { formatTableValue } from '../../utils/dataHelpers';

/**
 * 聚类表标签页组件
 */
const ClusterTableTab = ({ heatmap }) => {
  const rows = heatmap?.rows || [];
  const cols = heatmap?.cols || [];
  const values = heatmap?.values || [];

  const handleDownload = () => {
    if (!values.length) return;
    const filename = generateTimestampFilename('cluster-table');
    downloadHeatmapCsv(filename, heatmap);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4">
        <div className="text-sm text-slate-600">聚类表</div>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          下载聚类表
        </button>
      </div>
      <div className="mt-3 rounded-2xl border border-slate-200 bg-white/90 p-4">
        {rows.length === 0 ? (
          <div className="text-sm text-slate-600">暂无聚类表数据</div>
        ) : (
          <div className="max-h-[65vh] overflow-x-auto overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>聚类</TableHead>
                  {cols.map((col) => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((rowLabel, rowIndex) => (
                  <TableRow key={rowLabel}>
                    <TableCell className="font-medium text-slate-700">{rowLabel}</TableCell>
                    {(values[rowIndex] || []).map((value, valueIndex) => (
                      <TableCell key={`${rowLabel}-${cols[valueIndex]}`}>
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
    </>
  );
};

export default ClusterTableTab;
