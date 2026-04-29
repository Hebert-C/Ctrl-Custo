import { create } from "zustand";
import { createTransactionService } from "@ctrl-custo/core";
import type { Transaction, NewTransaction, TransactionFilters } from "@ctrl-custo/core";
import type { CoreDatabase } from "../db/index";

interface TransactionStore {
  transactions: Transaction[];
  filters: TransactionFilters;
  load: (db: CoreDatabase, filters?: TransactionFilters) => Promise<void>;
  add: (db: CoreDatabase, data: NewTransaction) => Promise<Transaction>;
  addInstallments: (
    db: CoreDatabase,
    data: Omit<NewTransaction, "installment">,
    total: number
  ) => Promise<Transaction[]>;
  update: (db: CoreDatabase, id: string, data: Partial<NewTransaction>) => Promise<void>;
  remove: (db: CoreDatabase, id: string) => Promise<void>;
  setFilters: (db: CoreDatabase, filters: TransactionFilters) => Promise<void>;
  clearFilters: (db: CoreDatabase) => Promise<void>;
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  filters: {},

  load: async (db, filters = {}) => {
    const svc = createTransactionService(db);
    const transactions = await svc.findAll(filters);
    set({ transactions, filters });
  },

  add: async (db, data) => {
    const svc = createTransactionService(db);
    const tx = await svc.create(data);
    set((s) => ({ transactions: [tx, ...s.transactions] }));
    return tx;
  },

  addInstallments: async (db, data, total) => {
    const svc = createTransactionService(db);
    const txs = await svc.createInstallments(data, total);
    set((s) => ({ transactions: [...txs, ...s.transactions] }));
    return txs;
  },

  update: async (db, id, data) => {
    const svc = createTransactionService(db);
    const updated = await svc.update(id, data);
    if (!updated) return;
    set((s) => ({
      transactions: s.transactions.map((t) => (t.id === id ? updated : t)),
    }));
  },

  remove: async (db, id) => {
    const svc = createTransactionService(db);
    await svc.delete(id);
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
  },

  setFilters: async (db, filters) => {
    await get().load(db, filters);
  },

  clearFilters: async (db) => {
    await get().load(db, {});
  },
}));
