import React, { useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, Trash2 } from 'lucide-react';

const FileUpload = ({ files = [], onFilesChange, acceptedTypes = '.csv,.txt', multiple = true }) => {
  const uploadedFiles = files;

  const fileKey = useCallback((file) => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }, []);

  const mergeFiles = useCallback(
    (existing, incoming) => {
      const seen = new Set(existing.map(fileKey));
      const merged = [...existing];
      incoming.forEach((file) => {
        const key = fileKey(file);
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(file);
        }
      });
      return merged;
    },
    [fileKey]
  );

  const handleFileChange = useCallback(
    (event) => {
      const incoming = Array.from(event.target.files || []);
      if (incoming.length === 0) return;
      const nextFiles = multiple ? mergeFiles(uploadedFiles, incoming) : [incoming[0]];
      onFilesChange(nextFiles);
    },
    [mergeFiles, uploadedFiles, onFilesChange, multiple]
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      const incoming = Array.from(event.dataTransfer.files || []);
      if (incoming.length === 0) return;
      const nextFiles = multiple ? mergeFiles(uploadedFiles, incoming) : [incoming[0]];
      onFilesChange(nextFiles);
    },
    [mergeFiles, uploadedFiles, onFilesChange, multiple]
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
  }, []);

  const removeFile = (file) => {
    const nextFiles = uploadedFiles.filter((item) => fileKey(item) !== fileKey(file));
    onFilesChange(nextFiles);
  };

  const clearFiles = () => {
    onFilesChange([]);
    const fileInput = document.getElementById('file-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const totalSizeKb = useMemo(() => {
    return uploadedFiles.reduce((sum, file) => sum + file.size, 0) / 1024;
  }, [uploadedFiles]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center transition-all duration-300 hover:border-amber-400 hover:bg-amber-50/50 hover:shadow-lg"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div 
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-lg"
          whileHover={{ rotate: 360, scale: 1.1 }}
          transition={{ duration: 0.6 }}
        >
          <Upload className="h-6 w-6" />
        </motion.div>
        <motion.p 
          className="mb-2 bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text font-medium text-transparent"
          initial={{ opacity: 0.8 }}
          whileHover={{ opacity: 1 }}
        >
          拖拽文件到此处或点击上传
        </motion.p>
        <p className="text-sm text-slate-500">支持 CSV, TXT 格式，建议使用数值列</p>
        <input
          type="file"
          accept={acceptedTypes}
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          multiple={multiple}
        />
        <motion.label
          htmlFor="file-upload"
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FileText className="h-4 w-4" />
          {uploadedFiles.length > 0 ? '继续添加文件' : '选择文件'}
        </motion.label>
      </motion.div>

      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">
                已上传 {uploadedFiles.length} 个文件，合计 {totalSizeKb.toFixed(2)} KB
              </div>
              <motion.button
                onClick={clearFiles}
                className="inline-flex items-center gap-1 text-sm text-rose-500 hover:text-rose-700"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Trash2 className="h-4 w-4" />
                清空
              </motion.button>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {uploadedFiles.map((file) => (
                  <motion.div
                    key={fileKey(file)}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm hover:shadow-md transition-shadow"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-rose-100">
                        <FileText className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => removeFile(file)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded-full hover:bg-rose-50 transition-colors"
                      whileHover={{ scale: 1.2, rotate: 90 }}
                      whileTap={{ scale: 0.8 }}
                    >
                      <X className="h-4 w-4" />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;
