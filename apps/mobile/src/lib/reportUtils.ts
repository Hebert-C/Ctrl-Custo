import type { Transaction } from "@ctrl-custo/core";

const MONTHS_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export interface MonthMeta {
  year: number;
  month: number;
  label: string;
}

export interface MonthData {
  label: string;
  year: number;
  month: number;
  income: number;
  expense: number;
  net: number;
}

export function lastNMonths(n: number): MonthMeta[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: MONTHS_LABELS[d.getMonth()] };
  });
}

export function aggregateMonths(txs: Transaction[], months: MonthMeta[]): MonthData[] {
  return months.map(({ year, month, label }) => {
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
    const monthTxs = txs.filter(
      (t) => t.date >= start && t.date <= end && t.status === "confirmed"
    );
    const income = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { label, year, month, income, expense, net: income - expense };
  });
}

export function buildCumulativeLine(monthData: MonthData[]): { x: string; y: number }[] {
  let cumulative = 0;
  return monthData.map((m) => {
    cumulative += m.net;
    return { x: m.label, y: cumulative };
  });
}

export function isCurrentMonth(year: number, month: number): boolean {
  const now = new Date();
  return year === now.getFullYear() && month === now.getMonth() + 1;
}
