import { describe, it, expect, beforeEach } from "vitest";
import { createDatabase } from "../db/index";
import { createAccountService } from "../services/AccountService";
import { createCategoryService } from "../services/CategoryService";
import { createTransactionService } from "../services/TransactionService";

describe("AccountService", () => {
  let accountService: ReturnType<typeof createAccountService>;
  let categoryService: ReturnType<typeof createCategoryService>;
  let transactionService: ReturnType<typeof createTransactionService>;

  beforeEach(async () => {
    const db = await createDatabase();
    accountService = createAccountService(db);
    categoryService = createCategoryService(db);
    transactionService = createTransactionService(db);
  });

  it("cria uma conta e retorna com id", async () => {
    const account = await accountService.create({
      name: "Nubank",
      type: "checking",
      balance: 0,
      color: "#8A2BE2",
      icon: "bank",
      isArchived: false,
    });

    expect(account.id).toBeDefined();
    expect(account.name).toBe("Nubank");
  });

  it("lista apenas contas ativas por padrão", async () => {
    await accountService.create({
      name: "Ativa",
      type: "cash",
      balance: 0,
      color: "#000",
      icon: "cash",
      isArchived: false,
    });
    const archived = await accountService.create({
      name: "Arquivada",
      type: "cash",
      balance: 0,
      color: "#111",
      icon: "cash",
      isArchived: false,
    });
    await accountService.archive(archived.id);

    const active = await accountService.findAll(false);
    expect(active.every((a) => !a.isArchived)).toBe(true);
  });

  it("calcula saldo com base nas transações", async () => {
    const account = await accountService.create({
      name: "Carteira",
      type: "cash",
      balance: 0,
      color: "#222",
      icon: "wallet",
      isArchived: false,
    });

    const category = await categoryService.create({
      name: "Geral",
      type: "both",
      color: "#333",
      icon: "general",
    });

    // Receita de R$ 1.000,00
    await transactionService.create({
      description: "Salário",
      amount: 100000,
      type: "income",
      status: "confirmed",
      date: "2024-01-05",
      categoryId: category.id,
      accountId: account.id,
    });

    // Despesa de R$ 200,00
    await transactionService.create({
      description: "Mercado",
      amount: 20000,
      type: "expense",
      status: "confirmed",
      date: "2024-01-10",
      categoryId: category.id,
      accountId: account.id,
    });

    const balance = await accountService.calculateBalance(account.id);
    expect(balance).toBe(80000); // R$ 800,00 em centavos
  });

  it("ignora transações pendentes no cálculo de saldo", async () => {
    const account = await accountService.create({
      name: "Inter",
      type: "checking",
      balance: 0,
      color: "#FF6B00",
      icon: "bank",
      isArchived: false,
    });

    const category = await categoryService.create({
      name: "Renda",
      type: "income",
      color: "#444",
      icon: "income",
    });

    await transactionService.create({
      description: "Pix pendente",
      amount: 50000,
      type: "income",
      status: "pending",
      date: "2024-01-15",
      categoryId: category.id,
      accountId: account.id,
    });

    const balance = await accountService.calculateBalance(account.id);
    expect(balance).toBe(0);
  });

  it("deleta uma conta", async () => {
    const account = await accountService.create({
      name: "Para deletar",
      type: "cash",
      balance: 0,
      color: "#555",
      icon: "trash",
      isArchived: false,
    });

    const deleted = await accountService.delete(account.id);
    expect(deleted).toBe(true);

    const found = await accountService.findById(account.id);
    expect(found).toBeNull();
  });
});
