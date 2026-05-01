import { create } from "zustand";
import { api, setToken, clearToken, loadTokenFromStorage } from "../lib/api";

interface AuthStore {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  tryRestore: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { accessToken } = await api.auth.login(email, password);
    setToken(accessToken);
    set({ isAuthenticated: true });
  },

  register: async (email, password) => {
    const { accessToken } = await api.auth.register(email, password);
    setToken(accessToken);
    set({ isAuthenticated: true });
  },

  logout: async () => {
    await api.auth.logout().catch(() => undefined);
    clearToken();
    set({ isAuthenticated: false });
  },

  tryRestore: async () => {
    set({ isLoading: true });
    try {
      // Restore any stored token first so refresh request has context
      await loadTokenFromStorage();
      const { accessToken } = await api.auth.refresh();
      setToken(accessToken);
      set({ isAuthenticated: true });
    } catch {
      clearToken();
      set({ isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
