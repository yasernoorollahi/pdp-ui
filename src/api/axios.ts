import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  // withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (config.url && !config.url.includes('/auth')) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // config.headers.authorization = `Bearer ${token}`;
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
