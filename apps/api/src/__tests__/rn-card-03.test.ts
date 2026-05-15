/**
 * RN-CARD-03 — Limite de cartão não pode ser excedido
 *
 * STATUS: ❌ Não implementado — estes testes vão FALHAR até a regra ser adicionada.
 * Implementar em: apps/api/src/routes/transactions.ts (POST handler)
 */

import { describe, it, expect } from "vitest";
import {
  createUser,
  getToken,
  createAccount,
  createCategory,
  createCard,
  createTransaction,
  api,
} from "./helpers";

const today = new Date().toISOString().slice(0, 10);

describe("RN-CARD-03 — Limite de cartão não pode ser excedido", () => {
  it("rejeita transação que ultrapassa o limite disponível no mês", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 1_000_000 });
    const category = await createCategory(user.id);
    const card = await createCard(user.id, account.id, { creditLimit: 50_000 }); // limite R$ 500

    // Cria gasto de R$ 400 no cartão (inserção direta — sem verificar saldo)
    await createTransaction(user.id, account.id, category.id, {
      amount: 40_000,
      cardId: card.id,
      date: today,
    });

    // Tenta gastar mais R$ 200 → total seria R$ 600 > limite R$ 500
    const res = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Compra extra",
        amount: 20_000,
        type: "expense",
        status: "confirmed",
        date: today,
        accountId: account.id,
        categoryId: category.id,
        cardId: card.id,
      },
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("CARD_LIMIT_EXCEEDED");
  });

  it("informa o limite disponível no erro de rejeição", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 1_000_000 });
    const category = await createCategory(user.id);
    const card = await createCard(user.id, account.id, { creditLimit: 50_000 });

    await createTransaction(user.id, account.id, category.id, {
      amount: 45_000, // R$ 450 gastos → disponível: R$ 50
      cardId: card.id,
      date: today,
    });

    const res = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Compra impossível",
        amount: 10_000, // R$ 100 > R$ 50 disponível
        type: "expense",
        status: "confirmed",
        date: today,
        accountId: account.id,
        categoryId: category.id,
        cardId: card.id,
      },
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.availableLimit).toBe(5_000); // R$ 50 disponível
  });

  it("permite transação quando há limite suficiente", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 1_000_000 });
    const category = await createCategory(user.id);
    const card = await createCard(user.id, account.id, { creditLimit: 50_000 });

    const res = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Compra ok",
        amount: 20_000, // R$ 200 < limite R$ 500
        type: "expense",
        status: "confirmed",
        date: today,
        accountId: account.id,
        categoryId: category.id,
        cardId: card.id,
      },
    });

    expect(res.status).toBe(201);
  });

  it("não considera gastos de meses anteriores no cálculo do limite", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 1_000_000 });
    const category = await createCategory(user.id);
    const card = await createCard(user.id, account.id, { creditLimit: 50_000 });

    // Gasto de R$ 490 no mês PASSADO
    await createTransaction(user.id, account.id, category.id, {
      amount: 49_000,
      cardId: card.id,
      date: "2025-12-15", // mês anterior
    });

    // Tenta gastar R$ 200 ESTE mês — limite deve estar zerado (fatura nova)
    const res = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Início do mês",
        amount: 20_000,
        type: "expense",
        status: "confirmed",
        date: today,
        accountId: account.id,
        categoryId: category.id,
        cardId: card.id,
      },
    });

    expect(res.status).toBe(201);
  });

  it("não verifica limite quando transação não usa cartão", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id);

    // Sem cardId — limite de cartão não se aplica, apenas saldo da conta
    const res = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Compra sem cartão",
        amount: 50_000,
        type: "expense",
        status: "confirmed",
        date: today,
        accountId: account.id,
        categoryId: category.id,
      },
    });

    expect(res.status).toBe(201);
  });
});
