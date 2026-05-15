import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from './AuthContext.js';
import { prodAuth } from './adapters/prodAuth.js';
import { setStoredApiKey } from '../api/lookupClient.js';
import type { User, LoginCredentials, RegisterCredentials } from './auth.types.js';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    prodAuth.getCurrentUser().then((u) => {
      setUser(u);
      setIsLoading(false);
    });
  }, []);

  function clearSessionState() {
    queryClient.clear();
    setStoredApiKey(null);
  }

  async function login(credentials: LoginCredentials) {
    clearSessionState();
    const { user: u } = await prodAuth.login(credentials);
    setUser(u);
  }

  async function register(credentials: RegisterCredentials) {
    clearSessionState();
    const { user: u } = await prodAuth.register(credentials);
    setUser(u);
  }

  async function logout() {
    await prodAuth.logout();
    clearSessionState();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
