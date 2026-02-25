// Determine the API base URL
// In the packaged app, the frontend and backend run on the same origin
// In development, we use the environment variable or default to localhost
const isPackaged = typeof window !== 'undefined' && window.location.port !== '5173' && window.location.port !== '8080';

const API_BASE_URL = isPackaged
  ? ''  // Use relative URL for packaged app (same origin)
  : (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000');

export { API_BASE_URL };
