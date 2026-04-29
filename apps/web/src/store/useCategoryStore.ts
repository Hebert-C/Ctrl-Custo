import { create } from "zustand";
import { createCategoryService } from "@ctrl-custo/core";
import type { Category, NewCategory } from "@ctrl-custo/core";
import type { CoreDatabase } from "../db/index";

interface CategoryStore {
  categories: Category[];
  load: (db: CoreDatabase) => Promise<void>;
  add: (db: CoreDatabase, data: NewCategory) => Promise<Category>;
  update: (db: CoreDatabase, id: string, data: Partial<NewCategory>) => Promise<void>;
  remove: (db: CoreDatabase, id: string) => Promise<void>;
  byId: (id: string) => Category | undefined;
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: [],

  load: async (db) => {
    const svc = createCategoryService(db);
    const categories = await svc.findAll();
    set({ categories });
  },

  add: async (db, data) => {
    const svc = createCategoryService(db);
    const category = await svc.create(data);
    set((s) => ({ categories: [...s.categories, category] }));
    return category;
  },

  update: async (db, id, data) => {
    const svc = createCategoryService(db);
    const updated = await svc.update(id, data);
    if (!updated) return;
    set((s) => ({
      categories: s.categories.map((c) => (c.id === id ? updated : c)),
    }));
  },

  remove: async (db, id) => {
    const svc = createCategoryService(db);
    await svc.delete(id);
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
  },

  byId: (id) => get().categories.find((c) => c.id === id),
}));
