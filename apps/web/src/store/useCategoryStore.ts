import { create } from "zustand";
import { api } from "../lib/api";
import type { Category, NewCategory } from "@ctrl-custo/core";

interface CategoryStore {
  categories: Category[];
  load: () => Promise<void>;
  add: (data: NewCategory) => Promise<Category>;
  update: (id: string, data: Partial<NewCategory>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  byId: (id: string) => Category | undefined;
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: [],

  load: async () => {
    const categories = await api.categories.list();
    set({ categories });
  },

  add: async (data) => {
    const category = await api.categories.create(data);
    set((s) => ({ categories: [...s.categories, category] }));
    return category;
  },

  update: async (id, data) => {
    const updated = await api.categories.update(id, data);
    set((s) => ({
      categories: s.categories.map((c) => (c.id === id ? updated : c)),
    }));
  },

  remove: async (id) => {
    await api.categories.remove(id);
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
  },

  byId: (id) => get().categories.find((c) => c.id === id),
}));
