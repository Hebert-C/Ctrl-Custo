import { create } from "zustand";
import { api } from "../lib/api";
import type { Account, NewAccount } from "@ctrl-custo/core";

interface AccountStore {
  accounts: Account[];
  totalBalance: number;
  load: () => Promise<void>;
  add: (data: NewAccount) => Promise<Account>;
  update: (id: string, data: Partial<NewAccount>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  archive: (id: string) => Promise<void>;
  byId: (id: string) => Account | undefined;
}

function sumBalances(accounts: Account[]): number {
  return accounts.reduce((s, a) => s + a.balance, 0);
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  accounts: [],
  totalBalance: 0,

  load: async () => {
    const accounts = await api.accounts.list();
    set({ accounts, totalBalance: sumBalances(accounts) });
  },

  add: async (data) => {
    const account = await api.accounts.create(data);
    set((s) => {
      const accounts = [...s.accounts, account];
      return { accounts, totalBalance: sumBalances(accounts) };
    });
    return account;
  },

  update: async (id, data) => {
    const updated = await api.accounts.update(id, data);
    set((s) => {
      const accounts = s.accounts.map((a) => (a.id === id ? updated : a));
      return { accounts, totalBalance: sumBalances(accounts) };
    });
  },

  remove: async (id) => {
    await api.accounts.remove(id);
    set((s) => {
      const accounts = s.accounts.filter((a) => a.id !== id);
      return { accounts, totalBalance: sumBalances(accounts) };
    });
  },

  archive: async (id) => {
    await api.accounts.update(id, { isArchived: true });
    set((s) => {
      const accounts = s.accounts.filter((a) => a.id !== id);
      return { accounts, totalBalance: sumBalances(accounts) };
    });
  },

  byId: (id) => get().accounts.find((a) => a.id === id),
}));
