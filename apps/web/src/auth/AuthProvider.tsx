import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './AuthContext.js';
import { prodAuth } from './adapters/prodAuth.js';
import type { User, LoginCredentials, RegisterCredentials } from './auth.types.js';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    prodAuth.getCurrentUser().then((u) => {
      setUser(u);
      setIsLoading(false);
    });
  }, []);

  async function login(credentials: LoginCredentials) {
    const { user: u } = await prodAuth.login(credentials);
    setUser(u);
  }

  async function register(credentials: RegisterCredentials) {
    const { user: u } = await prodAuth.register(credentials);
    setUser(u);
  }

  async function logout() {
    await prodAuth.logout();
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
