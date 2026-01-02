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

export default API;
