import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Upload, Layers } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import UploadModal from '../components/UploadModal';
import DataIntegrationModal from '../components/DataIntegrationModal';
import { FileCard, EmptyState, FileListHeader } from '../components/filelist';
import { useDataContext } from '../context/data-context';
import { useFileOperations } from '../hooks/useFileOperations';
import { useDataIntegration } from '../hooks/useDataIntegration';

const FileListPage = () => {
  const { error, warning, startNewAnalysis } = useDataContext();

  // 文件操作 Hook
  const { storedFiles, isLoading, deleteFile, downloadFile, uploadFiles } =
    useFileOperations(startNewAnalysis);

  // 数据整合 Hook
  const { isIntegrating, filterValidFiles, performIntegration } =
    useDataIntegration(() => {});

  // 上传弹窗状态
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [draftFiles, setDraftFiles] = useState([]);

  // 数据整合弹窗状态
  const [isIntegrationOpen, setIsIntegrationOpen] = useState(false);
  const [integrationFiles, setIntegrationFiles] = useState([]);
  const [cofactor, setCofactor] = useState(150);

  const fileCount = storedFiles.length;

  // 上传处理
  const handleOpenUpload = () => {
    setDraftFiles([]);
    setIsUploadOpen(true);
  };

  const handleCloseUpload = () => {
    setIsUploadOpen(false);
    setDraftFiles([]);
  };

  const handleConfirmUpload = async () => {
    const success = await uploadFiles(draftFiles);
    if (success) {
      handleCloseUpload();
    }
  };

  // 数据整合处理
  const handleOpenIntegration = () => {
    setIntegrationFiles([]);
    setCofactor(150);
    setIsIntegrationOpen(true);
  };

  const handleCloseIntegration = () => {
    if (isIntegrating) return;
    setIsIntegrationOpen(false);
    setIntegrationFiles([]);
  };

  const handleIntegrationFilesChange = (files) => {
    const filtered = filterValidFiles(files);
    setIntegrationFiles(filtered);
  };

  const handleConfirmIntegration = async () => {
    const success = await performIntegration(integrationFiles, cofactor);
    if (success) {
      handleCloseIntegration();
      setIntegrationFiles([]);
    }
  };

  return (
    <PageLayout
      title="文件列表"
      subtitle={fileCount > 0 ? `已上传 ${fileCount} 个文件` : '集中管理上传文件，支持下载与删除'}
      error={error}
      warning={warning}
      containerClassName="max-w-none"
      cardClassName="min-h-[calc(100vh-140px)]"
      breadcrumb={<FileListHeader count={fileCount} isLoading={isLoading} />}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleOpenIntegration}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-300 hover:text-amber-700"
          >
            <Layers className="h-4 w-4" />
            数据导入
          </button>
          <button
            type="button"
            onClick={handleOpenUpload}
            className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-100"
          >
            <Upload className="h-4 w-4" />
            上传文件
          </button>
        </div>
      }
    >
      <div className="relative">
        {/* 整合中遮罩 */}
        {isIntegrating && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-6 py-5 shadow-lg">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
              <p className="text-sm font-medium text-slate-600">数据导入中，请稍候...</p>
            </div>
          </div>
        )}

        {/* 文件列表 */}
        {fileCount === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <AnimatePresence mode="popLayout">
              <motion.div
                className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                layout
              >
                {storedFiles.map((file) => (
                  <FileCard
                    key={file.name}
                    file={file}
                    onDelete={deleteFile}
                    onDownload={downloadFile}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* 上传弹窗 */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={handleCloseUpload}
        files={draftFiles}
        onFilesChange={setDraftFiles}
        onConfirm={handleConfirmUpload}
        confirmLabel="确认上传"
      />

      {/* 数据整合弹窗 */}
      <DataIntegrationModal
        isOpen={isIntegrationOpen}
        onClose={handleCloseIntegration}
        files={integrationFiles}
        onFilesChange={handleIntegrationFilesChange}
        cofactor={cofactor}
        onCofactorChange={setCofactor}
        onConfirm={handleConfirmIntegration}
        confirmLabel="开始整合"
        isSubmitting={isIntegrating}
      />
    </PageLayout>
  );
};

export default FileListPage;
