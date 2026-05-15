import axios from 'axios';
import type { AuthAdapter, LoginCredentials, RegisterCredentials, User } from '../auth.types.js';

const ACCESS_KEY = 'looki_access_token';
const REFRESH_KEY = 'looki_refresh_token';

export const prodAuth: AuthAdapter = {
  async login(credentials: LoginCredentials) {
    const { data } = await axios.post<{ access_token: string; refresh_token: string; user: User }>(
      '/api/v1/auth/login',
      credentials,
    );
    localStorage.setItem(ACCESS_KEY, data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token);
    return { user: data.user, accessToken: data.access_token, refreshToken: data.refresh_token };
  },

  async register(credentials: RegisterCredentials) {
    const { data } = await axios.post<{ access_token: string; refresh_token: string; user: User }>(
      '/api/v1/auth/register',
      credentials,
    );
    localStorage.setItem(ACCESS_KEY, data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token);
    return { user: data.user, accessToken: data.access_token, refreshToken: data.refresh_token };
  },

  async logout() {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      try {
        await axios.post('/api/v1/auth/logout', { refresh_token: refreshToken });
      } catch {
        // ignore logout errors
      }
    }
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },

  async getCurrentUser() {
    const token = localStorage.getItem(ACCESS_KEY);
    if (!token) return null;
    try {
      const { data } = await axios.get<User>('/api/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return Boolean(localStorage.getItem(ACCESS_KEY));
  },
};
