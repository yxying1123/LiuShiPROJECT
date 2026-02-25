import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Download, Trash2, Upload, Layers } from "lucide-react";
import { toast } from "sonner";
import PageLayout from "../components/PageLayout";
import UploadModal from "../components/UploadModal";
import DataIntegrationModal from "../components/DataIntegrationModal";
import { useDataContext } from "../context/data-context";
import { API_BASE_URL } from "../config/api";
import { requestApi } from "../utils/apiClient";

const FileCard = ({ file, onDelete, onDownload }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileExtension = (filename) => {
    return filename.split('.').pop()?.toUpperCase() || '';
  };

  const getFileIcon = (filename) => {
    const ext = getFileExtension(filename);
    if (['CSV'].includes(ext)) return '📊';
    if (['TXT'].includes(ext)) return '📄';
    return '📁';
  };

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
              上传于{" "}
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

    </motion.div>
  );
};

const normalizeFilesResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.files)) return payload.files;
  if (Array.isArray(payload?.data?.files)) return payload.data.files;
  return [];
};

const FileListPage = () => {
  const { error, warning, startNewAnalysis } = useDataContext();
  const [storedFiles, setStoredFiles] = useState([]);
  const [isFilesLoading, setIsFilesLoading] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [draftFiles, setDraftFiles] = useState([]);
  const [isIntegrationOpen, setIsIntegrationOpen] = useState(false);
  const [integrationFiles, setIntegrationFiles] = useState([]);
  const [cofactor, setCofactor] = useState(150);
  const [isIntegrating, setIsIntegrating] = useState(false);

  const fetchStoredFiles = useCallback(async () => {
    setIsFilesLoading(true);
    try {
      const responseData = await requestApi("/files");
      const files = normalizeFilesResponse(responseData);
      setStoredFiles(files);
    } catch (err) {
      toast.error(err.message || "文件列表加载失败");
    } finally {
      setIsFilesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoredFiles();
  }, [fetchStoredFiles]);

  const handleDeleteFile = async (fileToDelete) => {
    try {
      await requestApi(`/files/${encodeURIComponent(fileToDelete.name)}`, {
        method: "DELETE",
      });
      await fetchStoredFiles();
      if (storedFiles.length <= 1) {
        startNewAnalysis();
      }
    } catch (err) {
      toast.error(err.message || "删除失败");
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/files/download/${encodeURIComponent(file.name)}`
      );
      if (!response.ok) {
        throw new Error(`下载失败 (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || "下载失败");
    }
  };

  const handleOpenUpload = () => {
    setDraftFiles([]);
    setIsUploadOpen(true);
  };

  const handleCloseUpload = () => {
    setIsUploadOpen(false);
    setDraftFiles([]);
  };

  const handleConfirmUpload = () => {
    const upload = async () => {
      if (!draftFiles || draftFiles.length === 0) {
        toast.error("请先选择需要上传的文件");
        return;
      }
      const formData = new FormData();
      draftFiles.forEach((file) => formData.append("files", file));
      try {
        await requestApi("/files/upload", {
          method: "POST",
          body: formData,
        });
        await fetchStoredFiles();
        toast.success("文件上传成功");
        handleCloseUpload();
      } catch (err) {
        toast.error(err.message || "文件上传失败");
      }
    };
    upload();
  };

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

  const normalizeExtension = (filename) => {
    return filename.split(".").pop()?.toLowerCase() || "";
  };

  const validateIntegrationFiles = (files) => {
    if (!files || files.length === 0) {
      toast.error("请上传 CSV 与 FCS 文件");
      return null;
    }
    const invalidFiles = files.filter(
      (file) => !["csv", "fcs"].includes(normalizeExtension(file.name))
    );
    if (invalidFiles.length > 0) {
      toast.error(`不支持的文件类型: ${invalidFiles.map((file) => file.name).join(", ")}`);
      return null;
    }
    const csvFiles = files.filter((file) => normalizeExtension(file.name) === "csv");
    const fcsFiles = files.filter((file) => normalizeExtension(file.name) === "fcs");
    if (csvFiles.length === 0) {
      toast.error("请上传 CSV 文件");
      return null;
    }
    if (fcsFiles.length === 0) {
      toast.error("请上传 FCS 文件");
      return null;
    }
    if (csvFiles.length !== 1) {
      toast.error("请只上传 1 个 CSV 文件");
      return null;
    }
    return { csvFile: csvFiles[0], fcsFiles };
  };

  const handleIntegrationFilesChange = (files) => {
    const invalidFiles = files.filter(
      (file) => !["csv", "fcs"].includes(normalizeExtension(file.name))
    );
    if (invalidFiles.length > 0) {
      toast.error(`不支持的文件类型: ${invalidFiles.map((file) => file.name).join(", ")}`);
    }
    const filteredFiles = files.filter((file) =>
      ["csv", "fcs"].includes(normalizeExtension(file.name))
    );
    setIntegrationFiles(filteredFiles);
  };

  const handleConfirmIntegration = async () => {
    if (isIntegrating) return;
    const numericCofactor = Number(cofactor);
    if (!Number.isFinite(numericCofactor) || numericCofactor <= 0) {
      toast.error("COFACTOR 必须为正数");
      return;
    }
    const validFiles = validateIntegrationFiles(integrationFiles);
    if (!validFiles) return;

    const formData = new FormData();
    formData.append("files", validFiles.csvFile);
    validFiles.fcsFiles.forEach((file) => formData.append("files", file));
    formData.append("cofactor", String(numericCofactor));

    setIsIntegrating(true);
    setIsIntegrationOpen(false);
    try {
      const responseData = await requestApi("/upload/flow/merge", {
        method: "POST",
        body: formData,
      });
      const responseFiles = Array.isArray(responseData)
        ? responseData
        : responseData?.files || [];
      if (responseFiles.length === 0) {
        throw new Error("后端未返回处理结果");
      }
      await fetchStoredFiles();
      toast.success(`数据导入完成，已生成 ${responseFiles.length} 个文件`);
      setIntegrationFiles([]);
    } catch (err) {
      toast.error(err.message || "数据导入失败");
    } finally {
      setIsIntegrating(false);
    }
  };

  const fileCount = Array.isArray(storedFiles) ? storedFiles.length : 0;

  const listHeader = (
    <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
      <FileText className="h-5 w-5 text-slate-500" />
      <h4 className="text-lg font-medium text-slate-700 whitespace-nowrap">文件列表</h4>
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        {fileCount} 个文件
      </span>
      {isFilesLoading && <span className="text-xs text-slate-400">加载中...</span>}
    </div>
  );

  return (
    <PageLayout
      title="文件列表"
      subtitle={fileCount > 0 ? `已上传 ${fileCount} 个文件` : "集中管理上传文件，支持下载与删除"}
      error={error}
      warning={warning}
      containerClassName="max-w-none"
      cardClassName="min-h-[calc(100vh-140px)]"
      breadcrumb={listHeader}
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
        {isIntegrating && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-6 py-5 shadow-lg">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
              <p className="text-sm font-medium text-slate-600">数据导入中，请稍候...</p>
            </div>
          </div>
        )}

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
                    onDelete={handleDeleteFile}
                    onDownload={handleDownloadFile}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </div>
      <UploadModal
        isOpen={isUploadOpen}
        onClose={handleCloseUpload}
        files={draftFiles}
        onFilesChange={setDraftFiles}
        onConfirm={handleConfirmUpload}
        confirmLabel="确认上传"
      />
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
