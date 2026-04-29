export type CardBrand = "visa" | "mastercard" | "elo" | "amex" | "hipercard" | "other";

export interface Card {
  id: string;
  name: string;
  brand: CardBrand;
  lastFourDigits?: string;
  creditLimit: number; // em centavos
  billingDay: number; // dia do fechamento (1-31)
  dueDay: number; // dia do vencimento (1-31)
  accountId: string; // conta para pagamento da fatura
  color: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NewCard = Omit<Card, "id" | "createdAt" | "updatedAt">;
