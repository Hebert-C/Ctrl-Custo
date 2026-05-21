import { create } from "zustand";
import {
  api,
  type ApiRecurringBill,
  type ApiRecurringBillDue,
  type NewRecurringBill,
} from "../lib/api";

interface RecurringBillStore {
  bills: ApiRecurringBill[];
  dueBills: ApiRecurringBillDue[];
  load: () => Promise<void>;
  loadDue: () => Promise<void>;
  add: (data: NewRecurringBill) => Promise<ApiRecurringBill>;
  update: (id: string, data: Partial<NewRecurringBill> & { isActive?: boolean }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  pay: (id: string, month: string, amountCents?: number) => Promise<void>;
}

export const useRecurringBillStore = create<RecurringBillStore>((set) => ({
  bills: [],
  dueBills: [],

  load: async () => {
    const bills = await api.recurringBills.list();
    set({ bills });
  },

  loadDue: async () => {
    const dueBills = await api.recurringBills.due();
    set({ dueBills });
  },

  add: async (data) => {
    const bill = await api.recurringBills.create(data);
    set((s) => ({ bills: [...s.bills, bill] }));
    return bill;
  },

  update: async (id, data) => {
    const updated = await api.recurringBills.update(id, data);
    set((s) => ({
      bills: s.bills.map((b) => (b.id === id ? updated : b)),
      dueBills: s.dueBills.filter((b) => b.id !== id || updated.isActive),
    }));
  },

  remove: async (id) => {
    await api.recurringBills.remove(id);
    set((s) => ({
      bills: s.bills.filter((b) => b.id !== id),
      dueBills: s.dueBills.filter((b) => b.id !== id),
    }));
  },

  pay: async (id, month, amountCents) => {
    await api.recurringBills.pay(id, month, amountCents);
    set((s) => ({ dueBills: s.dueBills.filter((b) => b.id !== id) }));
  },
}));
