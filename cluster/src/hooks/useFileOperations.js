import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { requestApi } from '../utils/apiClient';
import { API_BASE_URL } from '../config/api';

/**
 * 标准化文件列表响应
 */
const normalizeFilesResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.files)) return payload.files;
  if (Array.isArray(payload?.data?.files)) return payload.data.files;
  return [];
};

/**
 * 文件操作 Hook
 * 处理文件列表的获取、删除、下载等操作
 */
export const useFileOperations = (startNewAnalysis) => {
  const [storedFiles, setStoredFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 获取文件列表
  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const responseData = await requestApi('/files');
      const files = normalizeFilesResponse(responseData);
      setStoredFiles(files);
    } catch (err) {
      toast.error(err.message || '文件列表加载失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // 删除文件
  const deleteFile = useCallback(async (fileToDelete) => {
    try {
      await requestApi(`/files/${encodeURIComponent(fileToDelete.name)}`, {
        method: 'DELETE',
      });
      await fetchFiles();
      if (storedFiles.length <= 1) {
        startNewAnalysis?.();
      }
      toast.success('文件删除成功');
    } catch (err) {
      toast.error(err.message || '删除失败');
    }
  }, [fetchFiles, storedFiles.length, startNewAnalysis]);

  // 下载文件
  const downloadFile = useCallback(async (file) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/files/download/${encodeURIComponent(file.name)}`
      );
      if (!response.ok) {
        throw new Error(`下载失败 (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || '下载失败');
    }
  }, []);

  // 上传文件
  const uploadFiles = useCallback(async (files) => {
    if (!files || files.length === 0) {
      toast.error('请先选择需要上传的文件');
      return false;
    }
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    try {
      await requestApi('/files/upload', {
        method: 'POST',
        body: formData,
      });
      await fetchFiles();
      toast.success('文件上传成功');
      return true;
    } catch (err) {
      toast.error(err.message || '文件上传失败');
      return false;
    }
  }, [fetchFiles]);

  return {
    storedFiles,
    isLoading,
    fetchFiles,
    deleteFile,
    downloadFile,
    uploadFiles,
  };
};
