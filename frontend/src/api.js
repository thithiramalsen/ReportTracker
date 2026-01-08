import axios from 'axios';

// Normalize API base so it always points to the API root (ends with /api)
let base = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
try {
  if (!base.endsWith('/api')) base = base.replace(/\/$/, '') + '/api';
} catch (e) {
  base = 'http://localhost:5000/api';
}

const API = axios.create({ baseURL: base });

// Add token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 responses globally: clear auth and redirect to login
API.interceptors.response.use((r) => r, (error) => {
  const resp = error && error.response;
  try {
    const reqUrl = error.config && (error.config.url || '');
    // ignore auth endpoints (login/forgot/reset) to avoid loops
    if (resp && resp.status === 401 && !/auth\/(login|forgot|reset)/.test(reqUrl)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // slight delay to allow any UI cleanup, then navigate
      setTimeout(() => { window.location.href = '/login'; }, 50);
    }
  } catch (e) {
    // swallow
  }
  return Promise.reject(error);
});

export default API;
