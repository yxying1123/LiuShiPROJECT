import React from 'react';
import { motion } from 'framer-motion';
import { Download, Trash2 } from 'lucide-react';

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 获取文件扩展名
 */
const getFileExtension = (filename) => {
  return filename.split('.').pop()?.toUpperCase() || '';
};

/**
 * 获取文件图标
 */
const getFileIcon = (filename) => {
  const ext = getFileExtension(filename);
  if (['CSV'].includes(ext)) return '📊';
  if (['TXT'].includes(ext)) return '📄';
  return '📁';
};

/**
 * 文件卡片组件
 */
const FileCard = ({ file, onDelete, onDownload }) => {
  return (
    <motion.div
      layout
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:border-amber-300"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start space-x-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-rose-100 text-2xl">
          {getFileIcon(file.name)}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-800 truncate group-hover:text-amber-700 transition-colors">
            {file.name}
          </h3>
          <div className="mt-1 flex items-center space-x-4 text-sm text-slate-500">
            <span className="font-medium">{formatFileSize(file.size)}</span>
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              {getFileExtension(file.name)}
            </span>
            <span>
              上传于{' '}
              {new Date(file.modified || file.lastModified || Date.now()).toLocaleDateString('zh-CN')}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <motion.button
            onClick={() => onDownload(file)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download className="h-4 w-4" />
            下载
          </motion.button>

          <motion.button
            onClick={() => onDelete(file)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Trash2 className="h-4 w-4" />
            删除
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default FileCard;
