import { create } from "zustand";
import { api } from "../lib/api";
import type { Transaction, NewTransaction, TransactionFilters } from "@ctrl-custo/core";

interface TransactionStore {
  transactions: Transaction[];
  filters: TransactionFilters;
  load: (filters?: TransactionFilters) => Promise<void>;
  add: (data: NewTransaction) => Promise<Transaction>;
  addInstallments: (
    data: Omit<NewTransaction, "installment">,
    total: number
  ) => Promise<Transaction[]>;
  update: (id: string, data: Partial<NewTransaction>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setFilters: (filters: TransactionFilters) => Promise<void>;
  clearFilters: () => Promise<void>;
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  filters: {},

  load: async (filters = {}) => {
    const all = await api.transactions.list();
    const filtered = applyFilters(all, filters);
    set({ transactions: filtered, filters });
  },

  add: async (data) => {
    const tx = await api.transactions.create(data);
    set((s) => ({ transactions: [tx, ...s.transactions] }));
    return tx;
  },

  addInstallments: async (data, total) => {
    const groupId = crypto.randomUUID();
    const txs = await Promise.all(
      Array.from({ length: total }, (_, i) =>
        api.transactions.create({
          ...data,
          installment: { total, current: i + 1, groupId },
        })
      )
    );
    set((s) => ({ transactions: [...txs, ...s.transactions] }));
    return txs;
  },

  update: async (id, data) => {
    const updated = await api.transactions.update(id, data);
    set((s) => ({
      transactions: s.transactions.map((t) => (t.id === id ? updated : t)),
    }));
  },

  remove: async (id) => {
    await api.transactions.remove(id);
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
  },

  setFilters: async (filters) => {
    await get().load(filters);
  },

  clearFilters: async () => {
    await get().load({});
  },
}));

function applyFilters(txs: Transaction[], filters: TransactionFilters): Transaction[] {
  return txs.filter((t) => {
    if (filters.startDate && t.date < filters.startDate) return false;
    if (filters.endDate && t.date > filters.endDate) return false;
    if (filters.type && t.type !== filters.type) return false;
    if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
    if (filters.accountId && t.accountId !== filters.accountId) return false;
    if (filters.cardId && t.cardId !== filters.cardId) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!t.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
