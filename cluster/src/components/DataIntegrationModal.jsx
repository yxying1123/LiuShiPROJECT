import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import FileUpload from './FileUpload';

const DataIntegrationModal = ({
  isOpen,
  onClose,
  files,
  onFilesChange,
  cofactor,
  onCofactorChange,
  onConfirm,
  confirmLabel = '开始整合',
  isSubmitting = false,
}) => {
  const confirmDisabled = isSubmitting;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">
                  FCS文件导入
                </h3>
                <p className="text-sm text-slate-500 mt-1">上传 1 个 CSV 补偿矩阵与 多 个 FCS 文件</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              <FileUpload
                files={files}
                onFilesChange={onFilesChange}
                multiple
                acceptedTypes=".csv,.fcs"
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">COFACTOR</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={cofactor}
                  onChange={(event) => onCofactorChange(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="例如 150"
                />
                <p className="mt-2 text-xs text-slate-500">
                  荧光流式推荐 150-500，质谱流式推荐 5。输出文件名将使用对应 FCS 文件名。
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={confirmDisabled}
                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${
                  confirmDisabled
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {isSubmitting ? '处理中...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DataIntegrationModal;
