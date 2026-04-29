import { create } from "zustand";
import type { Card, NewCard } from "@ctrl-custo/core";
import { cards } from "@ctrl-custo/core";
import { eq } from "drizzle-orm";
import type { CoreDatabase } from "../db/index";

interface CardStore {
  cards: Card[];
  load: (db: CoreDatabase) => Promise<void>;
  add: (db: CoreDatabase, data: NewCard) => Promise<Card>;
  update: (db: CoreDatabase, id: string, data: Partial<NewCard>) => Promise<void>;
  remove: (db: CoreDatabase, id: string) => Promise<void>;
  byId: (id: string) => Card | undefined;
}

function rowToCard(row: typeof cards.$inferSelect): Card {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    lastFourDigits: row.lastFourDigits ?? undefined,
    creditLimit: row.creditLimit,
    billingDay: row.billingDay,
    dueDay: row.dueDay,
    accountId: row.accountId,
    color: row.color,
    isArchived: row.isArchived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const useCardStore = create<CardStore>((set, get) => ({
  cards: [],

  load: async (db) => {
    const rows = await db.select().from(cards).where(eq(cards.isArchived, false));
    set({ cards: rows.map(rowToCard) });
  },

  add: async (db, data) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await db.insert(cards).values({ id, ...data, createdAt: now, updatedAt: now });
    const [row] = await db.select().from(cards).where(eq(cards.id, id));
    const card = rowToCard(row);
    set((s) => ({ cards: [...s.cards, card] }));
    return card;
  },

  update: async (db, id, data) => {
    const now = new Date().toISOString();
    await db
      .update(cards)
      .set({ ...data, updatedAt: now })
      .where(eq(cards.id, id));
    const [row] = await db.select().from(cards).where(eq(cards.id, id));
    if (!row) return;
    const updated = rowToCard(row);
    set((s) => ({ cards: s.cards.map((c) => (c.id === id ? updated : c)) }));
  },

  remove: async (db, id) => {
    await db.delete(cards).where(eq(cards.id, id));
    set((s) => ({ cards: s.cards.filter((c) => c.id !== id) }));
  },

  byId: (id) => get().cards.find((c) => c.id === id),
}));
