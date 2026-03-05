import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, type ApiUser } from './api';

interface AuthContextType {
  user: ApiUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    authApi.me()
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user: me } = await authApi.login(email, password);
    localStorage.setItem('token', token);
    setUser(me);
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    localStorage.removeItem('token');
    setUser(null);
  };

  const refreshUser = async () => {
    const me = await authApi.me();
    setUser(me);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
