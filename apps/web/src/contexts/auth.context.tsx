'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, tokenStorage } from '../lib/api';
// Use workspace package alias for shared types
import type { JwtPayload } from '@medconnect/types';
import { jwtDecode } from 'jwt-decode';

interface AuthContextType {
  user: JwtPayload | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    tenantSubdomain: string,
  ) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'patient' | 'doctor';
  tenantSubdomain: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Restore user from token on mount
  useEffect(() => {
    const token = tokenStorage.getAccess();
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        setUser(decoded);
      } catch {
        tokenStorage.clearTokens();
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string, tenantSubdomain: string) => {
      const response = await api.post('/auth/login', {
        email,
        password,
        tenantSubdomain,
      });

      const { accessToken, refreshToken } = response.data.data.tokens;
      tokenStorage.setTokens(accessToken, refreshToken);

      const decoded = jwtDecode<JwtPayload>(accessToken);
      setUser(decoded);

      // Redirect based on role
      if (decoded.role === 'admin') router.push('/admin');
      else if (decoded.role === 'doctor') router.push('/doctor');
      else router.push('/patient');
    },
    [router],
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const response = await api.post('/auth/register', data);
      const { accessToken, refreshToken } = response.data.data.tokens;
      tokenStorage.setTokens(accessToken, refreshToken);

      const decoded = jwtDecode<JwtPayload>(accessToken);
      setUser(decoded);

      if (decoded.role === 'doctor') router.push('/doctor');
      else router.push('/patient');
    },
    [router],
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = tokenStorage.getRefresh();
      await api.post('/auth/logout', { refreshToken });
    } finally {
      tokenStorage.clearTokens();
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
