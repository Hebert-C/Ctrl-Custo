export type AccountType = "checking" | "savings" | "investment" | "cash" | "wallet";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number; // em centavos
  color: string; // hex
  icon: string;
  bankName?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NewAccount = Omit<Account, "id" | "createdAt" | "updatedAt">;
