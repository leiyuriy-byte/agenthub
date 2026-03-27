'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, type User } from '@/stores/auth-store';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { user, isLoading, login, register, logout, checkAuth } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsInitialized(true);
    };
    init();
  }, [checkAuth]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading: isLoading || !isInitialized,
    login,
    register,
    logout,
    checkAuth,
  };
}

export default useAuth;
