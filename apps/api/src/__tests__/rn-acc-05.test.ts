/**
 * RN-ACC-05 — Conta arquivada não pode receber novas operações
 *
 * STATUS: ❌ TDD — estes testes devem FALHAR até a implementação.
 */

import { describe, it, expect } from "vitest";
import { createUser, getToken, createAccount, createCategory, api } from "./helpers";

describe("RN-ACC-05 — Conta arquivada não pode receber novas operações", () => {
  it("rejeita despesa em conta arquivada", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { isArchived: true, balance: 100_000 });
    const category = await createCategory(user.id);

    const res = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Compra",
        amount: 1_000,
        type: "expense",
        status: "confirmed",
        date: "2026-01-01",
        accountId: account.id,
        categoryId: category.id,
      },
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("ACCOUNT_ARCHIVED");
  });

  it("rejeita receita em conta arquivada", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { isArchived: true });
    const category = await createCategory(user.id, { type: "income" });

    const res = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Salário",
        amount: 500_000,
        type: "income",
        status: "confirmed",
        date: "2026-01-01",
        accountId: account.id,
        categoryId: category.id,
      },
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("ACCOUNT_ARCHIVED");
  });

  it("rejeita transferência com conta de destino arquivada", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const origin = await createAccount(user.id, { balance: 100_000 });
    const dest = await createAccount(user.id, { isArchived: true });
    const category = await createCategory(user.id, { type: "both" });

    const res = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Transferência",
        amount: 5_000,
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
    expect(body.code).toBe("ACCOUNT_ARCHIVED");
  });

  it("rejeita depósito de meta em conta arquivada", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { isArchived: true, balance: 100_000 });

    const [goalRes] = await Promise.all([
      api("/goals", {
        method: "POST",
        token,
        body: {
          name: "Meta Teste",
          targetAmount: 10_000,
          color: "#8B5CF6",
          icon: "🎯",
        },
      }),
    ]);
    const goal = await goalRes.json();

    const res = await api(`/goals/${goal.id}/deposit`, {
      method: "POST",
      token,
      body: { amount: 1_000, accountId: account.id },
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("ACCOUNT_ARCHIVED");
  });

  it("permite transação em conta ativa normalmente", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 50_000 });
    const category = await createCategory(user.id);

    const res = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Compra normal",
        amount: 1_000,
        type: "expense",
        status: "confirmed",
        date: "2026-01-01",
        accountId: account.id,
        categoryId: category.id,
      },
    });

    expect(res.status).toBe(201);
  });
});
