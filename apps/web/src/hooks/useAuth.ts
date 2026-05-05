import { create } from "zustand";
import { api, setToken, clearToken, hasToken } from "../lib/api";

interface AuthStore {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  errorCode: string | null;
  pendingVerificationEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  tryRestore: () => Promise<void>;
  clearError: () => void;
  clearPendingVerification: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  error: null,
  errorCode: null,
  pendingVerificationEmail: null,

  login: async (email, password) => {
    set({ error: null, errorCode: null });
    const { accessToken } = await api.auth.login(email, password);
    setToken(accessToken);
    set({ isAuthenticated: true });
  },

  register: async (email, password) => {
    set({ error: null, errorCode: null });
    await api.auth.register(email, password);
    set({ pendingVerificationEmail: email });
  },

  logout: async () => {
    await api.auth.logout().catch(() => undefined);
    clearToken();
    set({ isAuthenticated: false });
  },

  tryRestore: async () => {
    set({ isLoading: true });
    try {
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

  clearError: () => set({ error: null, errorCode: null }),
  clearPendingVerification: () => set({ pendingVerificationEmail: null }),
}));

export function useIsAuthenticated() {
  return useAuthStore((s) => s.isAuthenticated) || hasToken();
}
