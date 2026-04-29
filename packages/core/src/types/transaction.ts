export type TransactionType = "income" | "expense" | "transfer";

export type TransactionStatus = "confirmed" | "pending" | "cancelled";

export interface InstallmentInfo {
  total: number; // total de parcelas
  current: number; // parcela atual (1-based)
  groupId: string; // id que agrupa todas as parcelas do mesmo lançamento
}

export interface Transaction {
  id: string;
  description: string;
  amount: number; // em centavos para evitar float
  type: TransactionType;
  status: TransactionStatus;
  date: string; // ISO 8601: "YYYY-MM-DD"
  categoryId: string;
  accountId: string;
  cardId?: string;
  installment?: InstallmentInfo;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type NewTransaction = Omit<Transaction, "id" | "createdAt" | "updatedAt">;

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  cardId?: string;
  status?: TransactionStatus;
  search?: string;
}
