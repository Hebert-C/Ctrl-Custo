import { create } from "zustand";
import { api } from "../lib/api";
import type { Investment, NewInvestment } from "@ctrl-custo/core";

interface InvestmentStore {
  investments: Investment[];
  load: () => Promise<void>;
  add: (data: NewInvestment) => Promise<Investment>;
  update: (id: string, data: Partial<NewInvestment>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useInvestmentStore = create<InvestmentStore>((set) => ({
  investments: [],

  load: async () => {
    const investments = await api.investments.list();
    set({ investments });
  },

  add: async (data) => {
    const investment = await api.investments.create(data);
    set((s) => ({ investments: [...s.investments, investment] }));
    return investment;
  },

  update: async (id, data) => {
    const updated = await api.investments.update(id, data);
    set((s) => ({ investments: s.investments.map((inv) => (inv.id === id ? updated : inv)) }));
  },

  remove: async (id) => {
    await api.investments.remove(id);
    set((s) => ({ investments: s.investments.filter((inv) => inv.id !== id) }));
  },
}));
