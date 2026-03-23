// Determine the API base URL
// In the packaged app, the frontend and backend run on the same origin
// In development, we use the environment variable or default to localhost
const isDevelopmentPort = (port) => {
  // Vite default ports and common dev server ports
  const devPorts = ['5173', '5174', '5175', '5176', '5177', '5178', '5179', '8080', '3000', '3001'];
  return devPorts.includes(port);
};

const isPackaged = typeof window !== 'undefined' && !isDevelopmentPort(window.location.port);

const API_BASE_URL = isPackaged
  ? ''  // Use relative URL for packaged app (same origin)
  : (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000');

export { API_BASE_URL };
