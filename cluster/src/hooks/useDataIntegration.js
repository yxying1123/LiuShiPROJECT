import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { requestApi } from '../utils/apiClient';

/**
 * 获取文件扩展名
 */
const normalizeExtension = (filename) => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

/**
 * 数据整合 Hook
 * 处理 CSV 与 FCS 文件的整合上传
 */
export const useDataIntegration = (fetchFiles) => {
  const [isIntegrating, setIsIntegrating] = useState(false);

  // 验证整合文件
  const validateIntegrationFiles = useCallback((files) => {
    if (!files || files.length === 0) {
      toast.error('请上传 CSV 与 FCS 文件');
      return null;
    }

    const invalidFiles = files.filter(
      (file) => !['csv', 'fcs'].includes(normalizeExtension(file.name))
    );
    if (invalidFiles.length > 0) {
      toast.error(`不支持的文件类型: ${invalidFiles.map((f) => f.name).join(', ')}`);
      return null;
    }

    const csvFiles = files.filter((file) => normalizeExtension(file.name) === 'csv');
    const fcsFiles = files.filter((file) => normalizeExtension(file.name) === 'fcs');

    if (csvFiles.length === 0) {
      toast.error('请上传 CSV 文件');
      return null;
    }
    if (fcsFiles.length === 0) {
      toast.error('请上传 FCS 文件');
      return null;
    }
    if (csvFiles.length !== 1) {
      toast.error('请只上传 1 个 CSV 文件');
      return null;
    }

    return { csvFile: csvFiles[0], fcsFiles };
  }, []);

  // 过滤有效文件
  const filterValidFiles = useCallback((files) => {
    const invalidFiles = files.filter(
      (file) => !['csv', 'fcs'].includes(normalizeExtension(file.name))
    );
    if (invalidFiles.length > 0) {
      toast.error(`不支持的文件类型: ${invalidFiles.map((f) => f.name).join(', ')}`);
    }
    return files.filter((file) => ['csv', 'fcs'].includes(normalizeExtension(file.name)));
  }, []);

  // 执行整合
  const performIntegration = useCallback(async (files, cofactor) => {
    if (isIntegrating) return false;

    const numericCofactor = Number(cofactor);
    if (!Number.isFinite(numericCofactor) || numericCofactor <= 0) {
      toast.error('COFACTOR 必须为正数');
      return false;
    }

    const validFiles = validateIntegrationFiles(files);
    if (!validFiles) return false;

    const formData = new FormData();
    formData.append('files', validFiles.csvFile);
    validFiles.fcsFiles.forEach((file) => formData.append('files', file));
    formData.append('cofactor', String(numericCofactor));

    setIsIntegrating(true);
    try {
      const responseData = await requestApi('/upload/flow/merge', {
        method: 'POST',
        body: formData,
      });
      const responseFiles = Array.isArray(responseData)
        ? responseData
        : responseData?.files || [];

      if (responseFiles.length === 0) {
        throw new Error('后端未返回处理结果');
      }

      await fetchFiles();
      toast.success(`数据导入完成，已生成 ${responseFiles.length} 个文件`);
      return true;
    } catch (err) {
      toast.error(err.message || '数据导入失败');
      return false;
    } finally {
      setIsIntegrating(false);
    }
  }, [isIntegrating, validateIntegrationFiles, fetchFiles]);

  return {
    isIntegrating,
    filterValidFiles,
    performIntegration,
  };
};
