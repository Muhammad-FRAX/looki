import axios from 'axios';
import type { AuthAdapter, User, LoginCredentials, RegisterCredentials } from '../auth.types';

const ACCESS_KEY = 'looki_access_token';
const REFRESH_KEY = 'looki_refresh_token';
const USER_KEY = 'looki_user';

const BASE = '/api/v1/auth';

export const prodAuth: AuthAdapter = {
  isAuthenticated() {
    return !!localStorage.getItem(ACCESS_KEY);
  },

  getCurrentUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  async login(credentials: LoginCredentials) {
    const { data } = await axios.post<{ access_token: string; refresh_token: string; user: User }>(
      `${BASE}/login`,
      credentials,
    );
    localStorage.setItem(ACCESS_KEY, data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return { user: data.user, tokens: { access_token: data.access_token, refresh_token: data.refresh_token } };
  },

  async register(credentials: RegisterCredentials) {
    const { data } = await axios.post<{ access_token: string; refresh_token: string; user: User }>(
      `${BASE}/register`,
      credentials,
    );
    localStorage.setItem(ACCESS_KEY, data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return { user: data.user, tokens: { access_token: data.access_token, refresh_token: data.refresh_token } };
  },

  async logout() {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      try {
        await axios.post(`${BASE}/logout`, { refresh_token: refreshToken });
      } catch {
        // ignore errors on logout
      }
    }
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
