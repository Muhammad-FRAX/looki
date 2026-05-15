import { useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';
import type { User } from './auth.types';
import { prodAuth } from './adapters/prodAuth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(prodAuth.getCurrentUser());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setUser(prodAuth.getCurrentUser());
  }, []);

  async function login(email: string, password: string) {
    setIsLoading(true);
    try {
      const result = await prodAuth.login({ email, password });
      setUser(result.user);
    } finally {
      setIsLoading(false);
    }
  }

  async function register(email: string, password: string) {
    setIsLoading(true);
    try {
      const result = await prodAuth.register({ email, password });
      setUser(result.user);
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    await prodAuth.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: user !== null,
        user,
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
