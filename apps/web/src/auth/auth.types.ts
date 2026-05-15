export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}

export interface AuthAdapter {
  login(credentials: LoginCredentials): Promise<{ user: User; accessToken: string; refreshToken: string }>;
  register(credentials: RegisterCredentials): Promise<{ user: User; accessToken: string; refreshToken: string }>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  isAuthenticated(): boolean;
}
