'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { User } from '@/lib/api';

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
