import axios from 'axios';

const API_KEY_STORAGE = 'looki_api_key';

export function getStoredApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE);
}

export function setStoredApiKey(key: string | null): void {
  if (key && key.trim()) {
    localStorage.setItem(API_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(API_KEY_STORAGE);
  }
}

export const lookupClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

lookupClient.interceptors.request.use((config) => {
  const key = getStoredApiKey();
  if (key) {
    config.headers.Authorization = `Bearer ${key}`;
  }
  return config;
});
