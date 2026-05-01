import { create } from "zustand";
import { api } from "../lib/api";
import type { Goal, NewGoal } from "@ctrl-custo/core";

interface GoalStore {
  goals: Goal[];
  load: () => Promise<void>;
  add: (data: NewGoal) => Promise<Goal>;
  deposit: (id: string, amountCents: number) => Promise<void>;
  update: (id: string, data: Partial<NewGoal>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useGoalStore = create<GoalStore>((set) => ({
  goals: [],

  load: async () => {
    const goals = await api.goals.list();
    set({ goals });
  },

  add: async (data) => {
    const goal = await api.goals.create(data);
    set((s) => ({ goals: [...s.goals, goal] }));
    return goal;
  },

  deposit: async (id, amountCents) => {
    const updated = await api.goals.deposit(id, amountCents);
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? updated : g)) }));
  },

  update: async (id, data) => {
    const updated = await api.goals.update(id, data);
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? updated : g)) }));
  },

  remove: async (id) => {
    await api.goals.remove(id);
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
  },
}));
