import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UiStore {
  isHidden: boolean;
  isBiometricEnabled: boolean;
  isLocked: boolean;
  toggleHidden: () => void;
  setBiometricEnabled: (enabled: boolean) => void;
  lock: () => void;
  unlock: () => void;
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      isHidden: false,
      isBiometricEnabled: false,
      isLocked: false,
      toggleHidden: () => set((s) => ({ isHidden: !s.isHidden })),
      setBiometricEnabled: (enabled) => set({ isBiometricEnabled: enabled }),
      lock: () => set({ isLocked: true }),
      unlock: () => set({ isLocked: false }),
    }),
    {
      name: "ctrl-custo-ui",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ isHidden: s.isHidden, isBiometricEnabled: s.isBiometricEnabled }),
    }
  )
);
