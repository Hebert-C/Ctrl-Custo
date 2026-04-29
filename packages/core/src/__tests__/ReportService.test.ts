import { describe, it, expect, beforeEach } from "vitest";
import { createDatabase } from "../db/index";
import { createReportService } from "../services/ReportService";
import { createTransactionService } from "../services/TransactionService";
import { createCategoryService } from "../services/CategoryService";
import { createAccountService } from "../services/AccountService";

describe("ReportService", () => {
  let reportService: ReturnType<typeof createReportService>;
  let transactionService: ReturnType<typeof createTransactionService>;
  let categoryId: string;
  let accountId: string;

  beforeEach(async () => {
    const db = await createDatabase();
    reportService = createReportService(db);
    transactionService = createTransactionService(db);

    const categoryService = createCategoryService(db);
    const accountService = createAccountService(db);

    const category = await categoryService.create({
      name: "Geral",
      type: "both",
      color: "#000",
      icon: "general",
    });
    categoryId = category.id;

    const account = await accountService.create({
      name: "Conta",
      type: "checking",
      balance: 0,
      color: "#111",
      icon: "bank",
      isArchived: false,
    });
    accountId = account.id;

    // Popula dados para os relatórios
    await transactionService.create({
      description: "Salário",
      amount: 500000,
      type: "income",
      status: "confirmed",
      date: "2024-01-05",
      categoryId,
      accountId,
    });

    await transactionService.create({
      description: "Aluguel",
      amount: 150000,
      type: "expense",
      status: "confirmed",
      date: "2024-01-10",
      categoryId,
      accountId,
    });

    await transactionService.create({
      description: "Mercado",
      amount: 80000,
      type: "expense",
      status: "confirmed",
      date: "2024-01-15",
      categoryId,
      accountId,
    });
  });

  it("calcula totais do período corretamente", async () => {
    const summary = await reportService.getPeriodSummary("2024-01-01", "2024-01-31");

    expect(summary.totalIncome).toBe(500000);
    expect(summary.totalExpense).toBe(230000);
    expect(summary.balance).toBe(270000);
  });

  it("retorna zero quando não há transações no período", async () => {
    const summary = await reportService.getPeriodSummary("2023-01-01", "2023-01-31");

    expect(summary.totalIncome).toBe(0);
    expect(summary.totalExpense).toBe(0);
    expect(summary.balance).toBe(0);
  });

  it("agrupa despesas por categoria com percentual", async () => {
    const categories = await reportService.getExpensesByCategory("2024-01-01", "2024-01-31");

    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0].categoryId).toBeDefined();
    expect(categories[0].percentage).toBeGreaterThan(0);

    // Soma dos percentuais deve ser ~100%
    const totalPercentage = categories.reduce((sum, c) => sum + c.percentage, 0);
    expect(totalPercentage).toBeCloseTo(100, 0);
  });

  it("retorna evolução mensal agrupada por mês", async () => {
    const evolution = await reportService.getMonthlyEvolution("2024-01-01", "2024-01-31");

    expect(evolution.length).toBe(1);
    expect(evolution[0].month).toBe("2024-01");
    expect(evolution[0].income).toBe(500000);
    expect(evolution[0].expense).toBe(230000);
    expect(evolution[0].balance).toBe(270000);
  });
});
