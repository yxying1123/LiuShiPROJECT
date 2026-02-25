import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import PageLayout from '../components/PageLayout';
import { AnalysisBreadcrumb, AnalysisStepper } from '../components/AnalysisFlowHeader';
import { useDataContext } from '../context/data-context';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const Index = () => {
  const { datasets, uploadedFiles, isLoading, error, warning, handleFilesChange, rowLimit, setRowLimit } = useDataContext();
  const navigate = useNavigate();
  const [rowLimitInput, setRowLimitInput] = useState(String(rowLimit));
  const [rowLimitConfirmed, setRowLimitConfirmed] = useState(false);
  const fileNames = datasets.map((dataset) => dataset.name);

  useEffect(() => {
    if (datasets.length === 0) {
      setRowLimitConfirmed(false);
      return;
    }
    setRowLimitConfirmed(false);
  }, [datasets]);

  useEffect(() => {
    setRowLimitInput(String(rowLimit));
  }, [rowLimit]);

  useEffect(() => {
    if (datasets.length > 0 && rowLimitConfirmed && !isLoading) {
      navigate('/axes');
    }
  }, [datasets.length, rowLimitConfirmed, isLoading, navigate]);

  const handleRowLimitApply = () => {
    const parsed = Number.parseInt(rowLimitInput, 10);
    const nextLimit = Number.isNaN(parsed) ? rowLimit : Math.max(1, parsed);
    setRowLimit(nextLimit);
    setRowLimitConfirmed(true);
  };

  return (
    <PageLayout
      title="上传文件"
      subtitle="支持CSV、TXT格式，包含数值数据"
      error={error}
      warning={warning}
      breadcrumb={<AnalysisBreadcrumb currentStep={1} />}
      actions={
        <button
          type="button"
          onClick={() => navigate('/results')}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          返回结果列表
        </button>
      }
    >
      <div className="space-y-6">
        <AnalysisStepper currentStep={1} />
        {isLoading ? (
          <motion.div 
            className="rounded-2xl border border-slate-200 bg-white/70 px-6 py-10 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-slate-200 border-t-amber-600"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <motion.p 
              className="bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text font-medium text-transparent"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              正在解析文件...
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <FileUpload files={uploadedFiles} onFilesChange={handleFilesChange} multiple />
          </motion.div>
        )}
        {datasets.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">设置读取行数</p>
                <p className="text-xs text-slate-500">每个文件读取前 min(设置行数, 文件行数) 行（不包含表头）。</p>
              </div>
              <div className="flex items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="row-limit-input" className="text-xs text-slate-500">
                    读取行数
                  </Label>
                  <Input
                    id="row-limit-input"
                    type="number"
                    min="1"
                    value={rowLimitInput}
                    onChange={(event) => setRowLimitInput(event.target.value)}
                    className="w-32"
                  />
                </div>
              <motion.button
                type="button"
                onClick={handleRowLimitApply}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                应用并继续
              </motion.button>
              </div>
            </div>
          </div>
        )}
        <AnimatePresence>
          {fileNames.length > 0 && (
            <motion.div 
              className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-rose-50 px-4 py-3 text-sm font-medium bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent shadow-sm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              已上传文件: {fileNames.join('、')}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {fileNames.length > 0 && rowLimitConfirmed && (
            <motion.div 
              className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <motion.span
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                正在跳转到坐标轴选择页面...
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageLayout>
  );
};

export default Index;
