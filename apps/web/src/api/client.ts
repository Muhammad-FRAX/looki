import axios from 'axios';

const ACCESS_KEY = 'looki_access_token';
const REFRESH_KEY = 'looki_refresh_token';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem(ACCESS_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err as Error);
    }

    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) {
      window.location.href = '/login';
      return Promise.reject(err as Error);
    }

    if (isRefreshing) {
      return new Promise(resolve => {
        refreshQueue.push((token: string) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(original));
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post<{ access_token: string }>('/api/v1/auth/refresh', {
        refresh_token: refreshToken,
      });
      localStorage.setItem(ACCESS_KEY, data.access_token);
      refreshQueue.forEach(cb => cb(data.access_token));
      refreshQueue = [];
      original.headers.Authorization = `Bearer ${data.access_token}`;
      return apiClient(original);
    } catch {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      window.location.href = '/login';
      return Promise.reject(err as Error);
    } finally {
      isRefreshing = false;
    }
  },
);
