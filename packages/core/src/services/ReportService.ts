import { eq, and, gte, lte, sum, sql } from "drizzle-orm";
import type { CoreDatabase } from "../db/index";
import { transactions } from "../db/schema";

export interface PeriodSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  startDate: string;
  endDate: string;
}

export interface CategorySummary {
  categoryId: string;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlyEvolution {
  month: string; // "YYYY-MM"
  income: number;
  expense: number;
  balance: number;
}

export function createReportService(db: CoreDatabase) {
  return {
    // Totais de receita, despesa e saldo num período
    async getPeriodSummary(startDate: string, endDate: string): Promise<PeriodSummary> {
      const [incomeRow] = await db
        .select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(
          and(
            eq(transactions.type, "income"),
            eq(transactions.status, "confirmed"),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate)
          )
        );

      const [expenseRow] = await db
        .select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(
          and(
            eq(transactions.type, "expense"),
            eq(transactions.status, "confirmed"),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate)
          )
        );

      const totalIncome = Number(incomeRow?.total ?? 0);
      const totalExpense = Number(expenseRow?.total ?? 0);

      return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        startDate,
        endDate,
      };
    },

    // Gastos agrupados por categoria num período
    async getExpensesByCategory(startDate: string, endDate: string): Promise<CategorySummary[]> {
      const rows = await db
        .select({
          categoryId: transactions.categoryId,
          total: sum(transactions.amount),
          count: sql<number>`count(*)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.type, "expense"),
            eq(transactions.status, "confirmed"),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate)
          )
        )
        .groupBy(transactions.categoryId);

      const grandTotal = rows.reduce((acc, r) => acc + Number(r.total ?? 0), 0);

      return rows.map((row) => ({
        categoryId: row.categoryId,
        total: Number(row.total ?? 0),
        count: Number(row.count),
        percentage: grandTotal > 0 ? (Number(row.total ?? 0) / grandTotal) * 100 : 0,
      }));
    },

    // Evolução mensal de receitas e despesas num intervalo de meses
    async getMonthlyEvolution(startDate: string, endDate: string): Promise<MonthlyEvolution[]> {
      const rows = await db
        .select({
          month: sql<string>`strftime('%Y-%m', ${transactions.date})`,
          type: transactions.type,
          total: sum(transactions.amount),
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.status, "confirmed"),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate)
          )
        )
        .groupBy(sql`strftime('%Y-%m', ${transactions.date})`, transactions.type);

      // Agrupa por mês
      const monthMap = new Map<string, MonthlyEvolution>();

      for (const row of rows) {
        const month = row.month;
        if (!monthMap.has(month)) {
          monthMap.set(month, { month, income: 0, expense: 0, balance: 0 });
        }
        const entry = monthMap.get(month)!;
        const amount = Number(row.total ?? 0);

        if (row.type === "income") entry.income += amount;
        if (row.type === "expense") entry.expense += amount;
        entry.balance = entry.income - entry.expense;
      }

      return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
    },
  };
}

export type ReportService = ReturnType<typeof createReportService>;
