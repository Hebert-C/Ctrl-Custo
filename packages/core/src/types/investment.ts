export type InvestmentType = "stock" | "fund" | "crypto" | "fixed_income" | "real_estate" | "other";

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  ticker?: string; // ex: "PETR4", "BTC"
  quantity: number; // quantidade de cotas/ações (em milésimos para evitar float)
  purchasePrice: number; // preço médio de compra em centavos
  currentPrice: number; // preço atual em centavos
  purchaseDate: string; // ISO 8601
  accountId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type NewInvestment = Omit<Investment, "id" | "createdAt" | "updatedAt">;
