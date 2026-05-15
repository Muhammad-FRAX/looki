export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthAdapter {
  login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }>;
  register(credentials: RegisterCredentials): Promise<{ user: User; tokens: AuthTokens }>;
  logout(): Promise<void>;
  getCurrentUser(): User | null;
  isAuthenticated(): boolean;
}
