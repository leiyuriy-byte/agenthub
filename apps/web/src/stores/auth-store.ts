/**
 * Auth store - manages user authentication state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, User, api } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) => Promise<boolean>;
  oauthLogin: (token: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        const response = await authApi.login({ email, password });

        if (response.success && response.data) {
          const { user, token } = response.data;
          api.setToken(token);
          set({ user, token, isLoading: false });
          return true;
        } else {
          set({
            error: response.error || '登录失败',
            isLoading: false,
          });
          return false;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });

        const response = await authApi.register(data);

        if (response.success && response.data) {
          const { user, token } = response.data;
          api.setToken(token);
          set({ user, token, isLoading: false });
          return true;
        } else {
          set({
            error: response.error || '注册失败',
            isLoading: false,
          });
          return false;
        }
      },

      logout: () => {
        api.setToken(null);
        set({ user: null, token: null, error: null });
      },

      oauthLogin: async (token: string) => {
        set({ isLoading: true, error: null });
        
        // Set the token
        api.setToken(token);
        
        // Fetch user info
        const response = await authApi.me();
        
        if (response.success && response.data) {
          set({ user: response.data, token, isLoading: false });
        } else {
          // Token is invalid
          api.setToken(null);
          set({ user: null, token: null, isLoading: false, error: 'OAuth 登录失败' });
        }
      },

      checkAuth: async () => {
        const token = get().token;
        if (!token) return;

        api.setToken(token);
        set({ isLoading: true });

        const response = await authApi.me();

        if (response.success && response.data) {
          set({ user: response.data, isLoading: false });
        } else {
          // Token is invalid, clear auth
          api.setToken(null);
          set({ user: null, token: null, isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'agenthub_auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

export default useAuthStore;
