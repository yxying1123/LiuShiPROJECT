import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileOperations } from './useFileOperations';

// Mock the apiClient
vi.mock('../utils/apiClient', () => ({
  requestApi: vi.fn(),
}));

// Mock the API_BASE_URL
vi.mock('../config/api', () => ({
  API_BASE_URL: 'http://localhost:8000',
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { requestApi } from '../utils/apiClient';
import { toast } from 'sonner';

describe('useFileOperations', () => {
  const mockStartNewAnalysis = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchFiles', () => {
    it('should fetch and set files successfully', async () => {
      const mockFiles = [
        { name: 'file1.csv', size: 1024, modified: '2024-01-01' },
        { name: 'file2.csv', size: 2048, modified: '2024-01-02' },
      ];
      requestApi.mockResolvedValueOnce({ files: mockFiles });

      const { result } = renderHook(() => useFileOperations(mockStartNewAnalysis));

      await waitFor(() => {
        expect(result.current.storedFiles).toEqual(mockFiles);
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle fetch error', async () => {
      requestApi.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useFileOperations(mockStartNewAnalysis));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network error');
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should normalize array response', async () => {
      const mockFiles = [{ name: 'file1.csv', size: 1024, modified: '2024-01-01' }];
      requestApi.mockResolvedValueOnce(mockFiles);

      const { result } = renderHook(() => useFileOperations(mockStartNewAnalysis));

      await waitFor(() => {
        expect(result.current.storedFiles).toEqual(mockFiles);
      });
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      requestApi.mockResolvedValueOnce({ files: [] });
      requestApi.mockResolvedValueOnce({ name: 'file1.csv' });

      const { result } = renderHook(() => useFileOperations(mockStartNewAnalysis));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteFile({ name: 'file1.csv' });
      });

      expect(requestApi).toHaveBeenCalledWith(
        '/files/file1.csv',
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(toast.success).toHaveBeenCalledWith('文件删除成功');
    });

    it('should call startNewAnalysis when last file is deleted', async () => {
      requestApi.mockResolvedValueOnce({
        files: [{ name: 'file1.csv', size: 1024, modified: '2024-01-01' }],
      });
      requestApi.mockResolvedValueOnce({ name: 'file1.csv' });
      requestApi.mockResolvedValueOnce({ files: [] });

      const { result } = renderHook(() => useFileOperations(mockStartNewAnalysis));

      await waitFor(() => expect(result.current.storedFiles.length).toBe(1));

      await act(async () => {
        await result.current.deleteFile({ name: 'file1.csv' });
      });

      expect(mockStartNewAnalysis).toHaveBeenCalled();
    });

    it('should handle delete error', async () => {
      requestApi.mockResolvedValueOnce({ files: [] });
      requestApi.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useFileOperations(mockStartNewAnalysis));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteFile({ name: 'file1.csv' });
      });

      expect(toast.error).toHaveBeenCalledWith('Delete failed');
    });
  });

  describe('downloadFile', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
    });

    it('should download file successfully', async () => {
      const mockBlob = new Blob(['test content']);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const { result } = renderHook(() => useFileOperations(mockStartNewAnalysis));

      await act(async () => {
        await result.current.downloadFile({ name: 'file1.csv' });
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/files/download/file1.csv'
      );
    });

    it('should handle download error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => useFileOperations(mockStartNewAnalysis));

      await act(async () => {
        await result.current.downloadFile({ name: 'file1.csv' });
      });

      expect(toast.error).toHaveBeenCalledWith('下载失败 (404)');
    });
  });

  describe('uploadFiles', () => {
    it('should upload files successfully', async () => {
      const mockFiles = [new File(['content'], 'test.csv', { type: 'text/csv' })];
      requestApi.mockResolvedValueOnce({ files: [{ name: 'test.csv' }] });
      requestApi.mockResolvedValueOnce({ files: [{ name: 'test.csv' }] });

      const { result } = renderHook(() => useFileOperations(mockStartNewAnalysis));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let success;
      await act(async () => {
        success = await result.current.uploadFiles(mockFiles);
      });

      expect(success).toBe(true);
      expect(requestApi).toHaveBeenCalledWith(
        '/files/upload',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
      expect(toast.success).toHaveBeenCalledWith('文件上传成功');
    });

    it('should return false when no files provided', async () => {
      const { result } = renderHook(() => useFileOperations(mockStartNewAnalysis));

      let success;
      await act(async () => {
        success = await result.current.uploadFiles([]);
      });

      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('请先选择需要上传的文件');
    });

    it('should handle upload error', async () => {
      const mockFiles = [new File(['content'], 'test.csv', { type: 'text/csv' })];

      // First call is for initial fetchFiles, second is for upload (fails), third is for fetchFiles after upload
      requestApi.mockResolvedValueOnce({ files: [] }); // initial fetchFiles
      requestApi.mockRejectedValueOnce(new Error('Upload failed')); // upload fails

      const { result } = renderHook(() => useFileOperations(mockStartNewAnalysis));

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.storedFiles).toEqual([]);
      });

      let success;
      await act(async () => {
        success = await result.current.uploadFiles(mockFiles);
      });

      // Upload should fail and return false
      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
