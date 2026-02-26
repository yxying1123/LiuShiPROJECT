import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

/**
 * 空状态组件
 */
const EmptyState = () => {
  return (
    <motion.div
      className="text-center py-16"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-rose-100 mb-6">
        <FileText className="h-12 w-12 text-amber-600" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">暂无文件</h3>
      <p className="text-slate-500">点击上方"上传文件"按钮添加文件</p>
    </motion.div>
  );
};

export default EmptyState;
