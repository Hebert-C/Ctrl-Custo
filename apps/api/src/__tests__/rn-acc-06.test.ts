/**
 * RN-ACC-06 — Saldo insuficiente bloqueia débito
 *
 * STATUS: ❌ Não implementado — estes testes vão FALHAR até a regra ser adicionada.
 * Implementar em: apps/api/src/routes/transactions.ts (POST handler e goals deposit)
 */

import { describe, it, expect } from "vitest";
import { createUser, getToken, createAccount, createCategory, api, getBalance } from "./helpers";

describe("RN-ACC-06 — Saldo insuficiente bloqueia débito", () => {
  it("rejeita despesa confirmada quando saldo é insuficiente", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 5_000 }); // R$ 50
    const category = await createCategory(user.id);

    const res = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Compra cara",
        amount: 10_000, // R$ 100 > R$ 50 de saldo
        type: "expense",
        status: "confirmed",
        date: "2026-01-01",
        accountId: account.id,
        categoryId: category.id,
      },
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("INSUFFICIENT_BALANCE");
  });

  it("permite despesa confirmada quando saldo é exatamente suficiente", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 10_000 }); // R$ 100
    const category = await createCategory(user.id);

    const res = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Compra exata",
        amount: 10_000, // R$ 100 = saldo exato
        type: "expense",
        status: "confirmed",
        date: "2026-01-01",
        accountId: account.id,
        categoryId: category.id,
      },
    });

    expect(res.status).toBe(201);
  });

  it("permite despesa com status pending mesmo sem saldo suficiente", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 0 });
    const category = await createCategory(user.id);

    const res = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Boleto pendente",
        amount: 50_000,
        type: "expense",
        status: "pending", // pendente não movimenta saldo
        date: "2026-01-01",
        accountId: account.id,
        categoryId: category.id,
      },
    });

    // Pendente não afeta saldo — deve ser criado independente do saldo atual
    expect(res.status).toBe(201);
    expect(await getBalance(account.id)).toBe(0); // saldo não mudou
  });

  it("rejeita transferência quando saldo da conta de origem é insuficiente", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const origin = await createAccount(user.id, { balance: 1_000 }); // R$ 10
    const dest = await createAccount(user.id, { balance: 0 });
    const category = await createCategory(user.id, { type: "both" });

    const res = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Transferência grande",
        amount: 5_000, // R$ 50 > R$ 10 de saldo
        type: "transfer",
        status: "confirmed",
        date: "2026-01-01",
        accountId: origin.id,
        destinationAccountId: dest.id,
        categoryId: category.id,
      },
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("INSUFFICIENT_BALANCE");
  });

  it("não verifica saldo para receita (crédito nunca bloqueia)", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 0 });
    const category = await createCategory(user.id, { type: "income" });

    const res = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Salário",
        amount: 300_000,
        type: "income",
        status: "confirmed",
        date: "2026-01-01",
        accountId: account.id,
        categoryId: category.id,
      },
    });

    expect(res.status).toBe(201);
  });
});
