import { describe, it, expect, beforeEach } from "vitest";
import { createDatabase } from "../db/index";
import { createTransactionService } from "../services/TransactionService";
import { createCategoryService } from "../services/CategoryService";
import { createAccountService } from "../services/AccountService";

describe("TransactionService", () => {
  let transactionService: ReturnType<typeof createTransactionService>;
  let categoryId: string;
  let accountId: string;

  beforeEach(async () => {
    const db = await createDatabase();
    transactionService = createTransactionService(db);

    const categoryService = createCategoryService(db);
    const accountService = createAccountService(db);

    const category = await categoryService.create({
      name: "Alimentação",
      type: "expense",
      color: "#F00",
      icon: "food",
    });
    categoryId = category.id;

    const account = await accountService.create({
      name: "Nubank",
      type: "checking",
      balance: 0,
      color: "#8A2BE2",
      icon: "bank",
      isArchived: false,
    });
    accountId = account.id;
  });

  it("cria uma transação e retorna com id", async () => {
    const tx = await transactionService.create({
      description: "Almoço",
      amount: 3500,
      type: "expense",
      status: "confirmed",
      date: "2024-01-15",
      categoryId,
      accountId,
    });

    expect(tx.id).toBeDefined();
    expect(tx.description).toBe("Almoço");
    expect(tx.amount).toBe(3500);
  });

  it("busca transação por id", async () => {
    const created = await transactionService.create({
      description: "Jantar",
      amount: 4200,
      type: "expense",
      status: "confirmed",
      date: "2024-01-16",
      categoryId,
      accountId,
    });

    const found = await transactionService.findById(created.id);
    expect(found?.description).toBe("Jantar");
  });

  it("filtra transações por período", async () => {
    await transactionService.create({
      description: "Janeiro",
      amount: 1000,
      type: "expense",
      status: "confirmed",
      date: "2024-01-10",
      categoryId,
      accountId,
    });

    await transactionService.create({
      description: "Fevereiro",
      amount: 2000,
      type: "expense",
      status: "confirmed",
      date: "2024-02-10",
      categoryId,
      accountId,
    });

    const janeiro = await transactionService.findAll({
      startDate: "2024-01-01",
      endDate: "2024-01-31",
    });

    expect(janeiro.length).toBe(1);
    expect(janeiro[0].description).toBe("Janeiro");
  });

  it("filtra transações por tipo", async () => {
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
      description: "Mercado",
      amount: 15000,
      type: "expense",
      status: "confirmed",
      date: "2024-01-06",
      categoryId,
      accountId,
    });

    const income = await transactionService.findAll({ type: "income" });
    expect(income.every((t) => t.type === "income")).toBe(true);
  });

  it("filtra por texto na descrição", async () => {
    await transactionService.create({
      description: "Supermercado Pão de Açúcar",
      amount: 20000,
      type: "expense",
      status: "confirmed",
      date: "2024-01-07",
      categoryId,
      accountId,
    });

    const results = await transactionService.findAll({ search: "Pão de Açúcar" });
    expect(results.length).toBeGreaterThan(0);
  });

  it("atualiza uma transação", async () => {
    const tx = await transactionService.create({
      description: "Café",
      amount: 800,
      type: "expense",
      status: "confirmed",
      date: "2024-01-08",
      categoryId,
      accountId,
    });

    const updated = await transactionService.update(tx.id, { amount: 950 });
    expect(updated?.amount).toBe(950);
  });

  it("deleta uma transação", async () => {
    const tx = await transactionService.create({
      description: "Para deletar",
      amount: 100,
      type: "expense",
      status: "confirmed",
      date: "2024-01-09",
      categoryId,
      accountId,
    });

    const deleted = await transactionService.delete(tx.id);
    expect(deleted).toBe(true);

    const found = await transactionService.findById(tx.id);
    expect(found).toBeNull();
  });

  it("cria parcelas distribuindo o valor corretamente", async () => {
    const installments = await transactionService.createInstallments(
      {
        description: "Notebook",
        amount: 600000, // R$ 6.000,00
        type: "expense",
        status: "confirmed",
        date: "2024-01-01",
        categoryId,
        accountId,
      },
      12
    );

    expect(installments.length).toBe(12);
    expect(installments[0].installment?.total).toBe(12);
    expect(installments[0].installment?.current).toBe(1);
    expect(installments[11].installment?.current).toBe(12);

    // Todas as parcelas têm o mesmo groupId
    const groupId = installments[0].installment?.groupId;
    expect(installments.every((t) => t.installment?.groupId === groupId)).toBe(true);
  });
});
