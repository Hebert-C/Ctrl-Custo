import { create } from "zustand";
import { api } from "../lib/api";
import type { Transaction, NewTransaction, TransactionFilters } from "@ctrl-custo/core";

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

interface TransactionState extends TransactionStore {
  _all: Transaction[];
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  _all: [],
  transactions: [],
  filters: {},

  load: async (filters = {}) => {
    const all = await api.transactions.list();
    set({ _all: all, transactions: applyFilters(all, filters), filters });
  },

  add: async (data) => {
    const tx = await api.transactions.create(data);
    set((s) => {
      const all = [tx, ...s._all];
      return { _all: all, transactions: [tx, ...s.transactions] };
    });
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
    set((s) => {
      const all = [...txs, ...s._all];
      return { _all: all, transactions: [...txs, ...s.transactions] };
    });
    return txs;
  },

  update: async (id, data) => {
    const updated = await api.transactions.update(id, data);
    set((s) => {
      const all = s._all.map((t) => (t.id === id ? updated : t));
      return {
        _all: all,
        transactions: applyFilters(all, s.filters),
      };
    });
  },

  remove: async (id) => {
    await api.transactions.remove(id);
    set((s) => {
      const all = s._all.filter((t) => t.id !== id);
      return { _all: all, transactions: applyFilters(all, s.filters) };
    });
  },

  setFilters: async (filters) => {
    const all = get()._all;
    set({ filters, transactions: applyFilters(all, filters) });
  },

  clearFilters: async () => {
    const all = get()._all;
    set({ filters: {}, transactions: all });
  },
}));
