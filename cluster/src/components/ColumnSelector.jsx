import React from 'react';
import { BarChart3 } from 'lucide-react';

// 默认禁用的列名（time 列为系统保留列）
const DISABLED_COLUMNS = ['time'];

const ColumnSelector = ({ columns, selectedX, selectedY, onXChange, onYChange }) => {
  if (!columns || columns.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BarChart3 className="mx-auto h-12 w-12 mb-4" />
        <p>请先选择包含数值数据的文件</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-6">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <BarChart3 className="h-5 w-5 text-slate-600" />
        选择坐标轴
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            X轴数据列
          </label>
          <select
            value={selectedX}
            onChange={(e) => onXChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white/80 p-2.5 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">请选择X轴数据列</option>
            {columns.map((column) => {
              const isDisabled = DISABLED_COLUMNS.includes(column);
              return (
                <option key={column} value={column} disabled={isDisabled} className={isDisabled ? 'text-gray-400' : ''}>
                  {column}{isDisabled ? ' (不可用)' : ''}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Y轴数据列
          </label>
          <select
            value={selectedY}
            onChange={(e) => onYChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white/80 p-2.5 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">请选择Y轴数据列</option>
            {columns.map((column) => {
              const isDisabled = DISABLED_COLUMNS.includes(column);
              return (
                <option key={column} value={column} disabled={isDisabled} className={isDisabled ? 'text-gray-400' : ''}>
                  {column}{isDisabled ? ' (不可用)' : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        注：time 列为系统保留列，不可选择
      </p>
    </div>
  );
};

export default ColumnSelector;
