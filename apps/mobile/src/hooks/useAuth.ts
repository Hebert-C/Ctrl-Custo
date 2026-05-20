import { create } from "zustand";
import { api, setToken, clearToken, loadTokenFromStorage } from "../lib/api";

export class RegistrationPendingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistrationPendingError";
  }
}

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
    const { message } = await api.auth.register(email, password);
    throw new RegistrationPendingError(message);
  },

  logout: async () => {
    await api.auth.logout().catch(() => undefined);
    clearToken();
    set({ isAuthenticated: false });
  },

  tryRestore: async () => {
    set({ isLoading: true });
    try {
      // Fast path: if SecureStore has no token (e.g. fresh install / clearState),
      // skip the network round-trip entirely and go straight to login.
      const storedToken = await Promise.race([
        loadTokenFromStorage(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3_000)),
      ]);

      if (!storedToken) {
        clearToken();
        set({ isAuthenticated: false });
        return;
      }

      // Stored token exists — try to get a fresh access token from the server.
      const deadline = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 7_000)
      );
      await Promise.race([
        (async () => {
          const { accessToken } = await api.auth.refresh();
          setToken(accessToken);
          set({ isAuthenticated: true });
        })(),
        deadline,
      ]);
    } catch {
      clearToken();
      set({ isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
