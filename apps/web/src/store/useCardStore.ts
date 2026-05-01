import { create } from "zustand";
import { api } from "../lib/api";
import type { Card, NewCard } from "@ctrl-custo/core";

interface CardStore {
  cards: Card[];
  load: () => Promise<void>;
  add: (data: NewCard) => Promise<Card>;
  update: (id: string, data: Partial<NewCard>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  byId: (id: string) => Card | undefined;
}

export const useCardStore = create<CardStore>((set, get) => ({
  cards: [],

  load: async () => {
    const cards = await api.cards.list();
    set({ cards });
  },

  add: async (data) => {
    const card = await api.cards.create(data);
    set((s) => ({ cards: [...s.cards, card] }));
    return card;
  },

  update: async (id, data) => {
    const updated = await api.cards.update(id, data);
    set((s) => ({ cards: s.cards.map((c) => (c.id === id ? updated : c)) }));
  },

  remove: async (id) => {
    await api.cards.remove(id);
    set((s) => ({ cards: s.cards.filter((c) => c.id !== id) }));
  },

  byId: (id) => get().cards.find((c) => c.id === id),
}));
