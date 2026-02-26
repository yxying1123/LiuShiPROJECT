import React from 'react';
import { FileText } from 'lucide-react';

/**
 * 文件列表头部组件
 */
const FileListHeader = ({ count, isLoading }) => {
  return (
    <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
      <FileText className="h-5 w-5 text-slate-500" />
      <h4 className="text-lg font-medium text-slate-700 whitespace-nowrap">文件列表</h4>
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        {count} 个文件
      </span>
      {isLoading && <span className="text-xs text-slate-400">加载中...</span>}
    </div>
  );
};

export default FileListHeader;
