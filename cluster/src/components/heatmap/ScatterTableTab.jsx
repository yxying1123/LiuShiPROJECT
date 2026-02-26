import React from 'react';
import { Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { downloadCsv, generateTimestampFilename } from '../../utils/exportUtils';
import { buildScatterTableColumns, formatTableValue } from '../../utils/dataHelpers';

/**
 * 散点表标签页组件
 */
const ScatterTableTab = ({ scatterPoints, axisLabelMap = {} }) => {
  const columns = buildScatterTableColumns(scatterPoints);

  const handleDownload = () => {
    if (!scatterPoints || scatterPoints.length === 0) return;
    const filename = generateTimestampFilename('scatter-table');
    downloadCsv(filename, scatterPoints);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4">
        <div className="text-sm text-slate-600">散点表</div>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          下载散点表
        </button>
      </div>
      <div className="mt-3 rounded-2xl border border-slate-200 bg-white/90 p-4">
        {scatterPoints.length === 0 ? (
          <div className="text-sm text-slate-600">暂无散点表数据</div>
        ) : (
          <div className="max-h-[65vh] overflow-x-auto overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column}>{axisLabelMap[column] ?? column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {scatterPoints.map((row, rowIndex) => (
                  <TableRow key={row.id ?? rowIndex}>
                    {columns.map((column) => (
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
    </>
  );
};

export default ScatterTableTab;
