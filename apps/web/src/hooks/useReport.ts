import { useMemo } from "react";
import type { Transaction } from "@ctrl-custo/core";

interface ReportData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: Record<string, number>;
}

// Agrega transações do mês para o dashboard sem depender do ReportService assíncrono
export function useMonthReport(transactions: Transaction[], month: string): ReportData {
  return useMemo(() => {
    const monthTxs = transactions.filter(
      (t) => t.date.startsWith(month) && t.status === "confirmed"
    );

    let totalIncome = 0;
    let totalExpense = 0;
    const byCategory: Record<string, number> = {};

    for (const tx of monthTxs) {
      if (tx.type === "income") totalIncome += tx.amount;
      if (tx.type === "expense") {
        totalExpense += tx.amount;
        byCategory[tx.categoryId] = (byCategory[tx.categoryId] ?? 0) + tx.amount;
      }
    }

    return { totalIncome, totalExpense, balance: totalIncome - totalExpense, byCategory };
  }, [transactions, month]);
}

// Retorna a string YYYY-MM do mês atual
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

// Retorna os últimos N meses como strings "YYYY-MM" (mais antigo primeiro)
export function lastNMonths(n: number): string[] {
  const months: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(date.toISOString().slice(0, 7));
  }
  return months;
}

// Formata "YYYY-MM" para "Janeiro 2024"
export function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
