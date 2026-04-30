import { create } from "zustand";
import { createAccountService } from "@ctrl-custo/core";
import type { Account, NewAccount, CoreDatabase } from "@ctrl-custo/core";

function sumBalances(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + a.balance, 0);
}

interface AccountStore {
  accounts: Account[];
  totalBalance: number;
  load: (db: CoreDatabase) => Promise<void>;
  add: (db: CoreDatabase, data: NewAccount) => Promise<Account>;
  update: (db: CoreDatabase, id: string, data: Partial<NewAccount>) => Promise<void>;
  remove: (db: CoreDatabase, id: string) => Promise<void>;
  archive: (db: CoreDatabase, id: string) => Promise<void>;
  byId: (id: string) => Account | undefined;
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  accounts: [],
  totalBalance: 0,

  load: async (db) => {
    const svc = createAccountService(db);
    const accounts = await svc.findAll(false);
    set({ accounts, totalBalance: sumBalances(accounts) });
  },

  add: async (db, data) => {
    const svc = createAccountService(db);
    const account = await svc.create(data);
    set((s) => {
      const accounts = [...s.accounts, account];
      return { accounts, totalBalance: sumBalances(accounts) };
    });
    return account;
  },

  update: async (db, id, data) => {
    const svc = createAccountService(db);
    const updated = await svc.update(id, data);
    if (!updated) return;
    set((s) => {
      const accounts = s.accounts.map((a) => (a.id === id ? updated : a));
      return { accounts, totalBalance: sumBalances(accounts) };
    });
  },

  remove: async (db, id) => {
    const svc = createAccountService(db);
    await svc.delete(id);
    set((s) => {
      const accounts = s.accounts.filter((a) => a.id !== id);
      return { accounts, totalBalance: sumBalances(accounts) };
    });
  },

  archive: async (db, id) => {
    const svc = createAccountService(db);
    await svc.archive(id);
    set((s) => {
      const accounts = s.accounts.filter((a) => a.id !== id);
      return { accounts, totalBalance: sumBalances(accounts) };
    });
  },

  byId: (id) => get().accounts.find((a) => a.id === id),
}));
