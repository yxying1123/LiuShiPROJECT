import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestApi } from './apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('requestApi', () => {
    it('should successfully fetch data and return data field', async () => {
      const mockData = { id: 1, name: 'test' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: 200, data: mockData }),
      });

      const result = await requestApi('/test');
      expect(result).toEqual(mockData);
    });

    it('should return full payload when data field is missing', async () => {
      const mockPayload = { id: 1, name: 'test' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPayload),
      });

      const result = await requestApi('/test');
      expect(result).toEqual(mockPayload);
    });

    it('should throw error when response is not ok', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ msg: 'Not found' }),
      });

      await expect(requestApi('/test')).rejects.toThrow('Not found');
    });

    it('should throw error with detail message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ detail: 'Bad request' }),
      });

      await expect(requestApi('/test')).rejects.toThrow('Bad request');
    });

    it('should throw error when response code is not 200', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: 500, msg: 'Server error' }),
      });

      await expect(requestApi('/test')).rejects.toThrow('Server error');
    });

    it('should throw default error message when no msg provided', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: 500 }),
      });

      await expect(requestApi('/test')).rejects.toThrow('请求失败');
    });

    it('should handle JSON parse error gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const result = await requestApi('/test');
      expect(result).toBeNull();
    });

    it('should pass options to fetch', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: 200, data: {} }),
      });

      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      };

      await requestApi('/test', options);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        options
      );
    });
  });
});
