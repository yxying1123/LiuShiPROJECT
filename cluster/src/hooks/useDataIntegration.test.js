import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDataIntegration } from './useDataIntegration';

// Mock the apiClient
vi.mock('../utils/apiClient', () => ({
  requestApi: vi.fn(),
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

describe('useDataIntegration', () => {
  const mockFetchFiles = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('filterValidFiles', () => {
    it('should filter and return only FCS files', () => {
      const { result } = renderHook(() => useDataIntegration(mockFetchFiles));

      const files = [
        new File([''], 'test1.fcs', { type: 'application/octet-stream' }),
        new File([''], 'test2.csv', { type: 'text/csv' }),
        new File([''], 'test3.fcs', { type: 'application/octet-stream' }),
      ];

      let filteredFiles;
      act(() => {
        filteredFiles = result.current.filterValidFiles(files);
      });

      expect(filteredFiles).toHaveLength(2);
      expect(filteredFiles[0].name).toBe('test1.fcs');
      expect(filteredFiles[1].name).toBe('test3.fcs');
    });

    it('should show error for invalid file types', () => {
      const { result } = renderHook(() => useDataIntegration(mockFetchFiles));

      const files = [
        new File([''], 'test1.fcs', { type: 'application/octet-stream' }),
        new File([''], 'test2.csv', { type: 'text/csv' }),
      ];

      act(() => {
        result.current.filterValidFiles(files);
      });

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('不支持的文件类型: test2.csv')
      );
    });

    it('should return empty array when no valid files', () => {
      const { result } = renderHook(() => useDataIntegration(mockFetchFiles));

      const files = [new File([''], 'test.csv', { type: 'text/csv' })];

      let filteredFiles;
      act(() => {
        filteredFiles = result.current.filterValidFiles(files);
      });

      expect(filteredFiles).toHaveLength(0);
    });
  });

  describe('performIntegration', () => {
    it('should successfully integrate FCS files', async () => {
      requestApi.mockResolvedValueOnce({
        files: [{ name: 'converted1.csv' }, { name: 'converted2.csv' }],
      });

      const { result } = renderHook(() => useDataIntegration(mockFetchFiles));

      const files = [
        new File([''], 'test1.fcs', { type: 'application/octet-stream' }),
        new File([''], 'test2.fcs', { type: 'application/octet-stream' }),
      ];

      let success;
      await act(async () => {
        success = await result.current.performIntegration(files, 5);
      });

      expect(success).toBe(true);
      expect(requestApi).toHaveBeenCalledWith(
        '/upload/flow/merge',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
      expect(mockFetchFiles).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('FCS 转换完成，已生成 2 个文件');
    });

    it('should return false when already integrating', async () => {
      const { result } = renderHook(() => useDataIntegration(mockFetchFiles));

      const files = [new File([''], 'test.fcs', { type: 'application/octet-stream' })];

      // Start first integration
      requestApi.mockImplementationOnce(() => new Promise(() => {}));

      act(() => {
        result.current.performIntegration(files, 5);
      });

      // Try second integration while first is in progress
      let success;
      await act(async () => {
        success = await result.current.performIntegration(files, 5);
      });

      expect(success).toBe(false);
    });

    it('should return false for invalid cofactor', async () => {
      const { result } = renderHook(() => useDataIntegration(mockFetchFiles));

      const files = [new File([''], 'test.fcs', { type: 'application/octet-stream' })];

      let success;
      await act(async () => {
        success = await result.current.performIntegration(files, -1);
      });

      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('COFACTOR 必须为正数');
    });

    it('should return false when no files provided', async () => {
      const { result } = renderHook(() => useDataIntegration(mockFetchFiles));

      let success;
      await act(async () => {
        success = await result.current.performIntegration([], 5);
      });

      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('请上传 FCS 文件');
    });

    it('should return false when no FCS files provided', async () => {
      const { result } = renderHook(() => useDataIntegration(mockFetchFiles));

      const files = [new File([''], 'test.csv', { type: 'text/csv' })];

      let success;
      await act(async () => {
        success = await result.current.performIntegration(files, 5);
      });

      expect(success).toBe(false);
      // Error message may be about unsupported file type
      expect(toast.error).toHaveBeenCalled();
    });

    it('should handle API error', async () => {
      requestApi.mockRejectedValueOnce(new Error('Integration failed'));

      const { result } = renderHook(() => useDataIntegration(mockFetchFiles));

      const files = [new File([''], 'test.fcs', { type: 'application/octet-stream' })];

      let success;
      await act(async () => {
        success = await result.current.performIntegration(files, 5);
      });

      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Integration failed');
    });

    it('should handle empty response', async () => {
      requestApi.mockResolvedValueOnce({ files: [] });

      const { result } = renderHook(() => useDataIntegration(mockFetchFiles));

      const files = [new File([''], 'test.fcs', { type: 'application/octet-stream' })];

      let success;
      await act(async () => {
        success = await result.current.performIntegration(files, 5);
      });

      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('后端未返回处理结果');
    });

    it('should set isIntegrating state correctly', async () => {
      requestApi.mockResolvedValueOnce({ files: [{ name: 'converted.csv' }] });
      requestApi.mockResolvedValueOnce({ files: [] }); // for fetchFiles

      const { result } = renderHook(() => useDataIntegration(mockFetchFiles));

      const files = [new File([''], 'test.fcs', { type: 'application/octet-stream' })];

      // Initial state
      expect(result.current.isIntegrating).toBe(false);

      // Start integration
      let success;
      await act(async () => {
        success = await result.current.performIntegration(files, 5);
      });

      // After completion
      expect(result.current.isIntegrating).toBe(false);
      expect(success).toBe(true);
    });
  });
});
