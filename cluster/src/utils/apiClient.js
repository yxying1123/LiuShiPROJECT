import { API_BASE_URL } from '../config/api';

const parseJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

export const requestApi = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const message = payload?.msg || payload?.detail || `请求失败 (${response.status})`;
    throw new Error(message);
  }

  if (payload && typeof payload.code !== 'undefined' && payload.code !== 200) {
    throw new Error(payload.msg || '请求失败');
  }

  return payload?.data ?? payload;
};
