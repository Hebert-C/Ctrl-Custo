/**
 * RN-TX-09, RN-TX-12, RN-TX-13 — Validações de transação
 * RN-CAT-03 — Categoria não pode ser transferida para si mesma
 * RN-GOAL-07, RN-GOAL-08, RN-GOAL-09 — Validações de metas
 *
 * STATUS: ❌ TDD — estes testes devem FALHAR até a implementação.
 */

import { describe, it, expect } from "vitest";
import { createUser, getToken, createAccount, createCategory, createCard, api } from "./helpers";

// ─── helpers locais ───────────────────────────────────────────────────────────

async function postTx(token: string, overrides: Record<string, unknown>) {
  return api("/transactions", { method: "POST", token, body: overrides });
}

async function createGoal(
  token: string,
  overrides: Record<string, unknown> = {}
): Promise<{ id: string; [k: string]: unknown }> {
  const res = await api("/goals", {
    method: "POST",
    token,
    body: { name: "Meta", targetAmount: 50_000, color: "#8B5CF6", icon: "🎯", ...overrides },
  });
  return res.json();
}

// ─── RN-TX-09 — Descrição não pode ser só espaços ────────────────────────────

describe("RN-TX-09 — Descrição não pode ser só espaços em branco", () => {
  it("rejeita descrição com apenas espaços", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id);

    const res = await postTx(token, {
      description: "   ",
      amount: 1_000,
      type: "expense",
      status: "confirmed",
      date: "2026-01-01",
      accountId: account.id,
      categoryId: category.id,
    });

    expect(res.status).toBe(400);
  });

  it("aceita descrição com texto válido", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id);

    const res = await postTx(token, {
      description: "Almoço",
      amount: 1_000,
      type: "expense",
      status: "confirmed",
      date: "2026-01-01",
      accountId: account.id,
      categoryId: category.id,
    });

    expect(res.status).toBe(201);
  });
});

// ─── RN-TX-12 — Máximo de 24 parcelas ────────────────────────────────────────

describe("RN-TX-12 — Máximo de 24 parcelas", () => {
  it("rejeita installmentTotal acima de 24", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id);
    const card = await createCard(user.id, account.id);

    const res = await postTx(token, {
      description: "Compra parcelada",
      amount: 1_000,
      type: "expense",
      status: "confirmed",
      date: "2026-01-01",
      accountId: account.id,
      categoryId: category.id,
      cardId: card.id,
      installmentTotal: 25,
      installmentCurrent: 1,
    });

    expect(res.status).toBe(400);
  });

  it("aceita installmentTotal de exatamente 24", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id);
    const card = await createCard(user.id, account.id);

    const res = await postTx(token, {
      description: "Compra 24x",
      amount: 1_000,
      type: "expense",
      status: "confirmed",
      date: "2026-01-01",
      accountId: account.id,
      categoryId: category.id,
      cardId: card.id,
      installmentTotal: 24,
      installmentCurrent: 1,
    });

    expect(res.status).toBe(201);
  });
});

// ─── RN-TX-13 — Parcelas só em despesas com cartão ───────────────────────────

describe("RN-TX-13 — Parcelas só em despesas com cartão", () => {
  it("rejeita parcelamento em receita", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id, { type: "income" });

    const res = await postTx(token, {
      description: "Receita parcelada",
      amount: 1_000,
      type: "income",
      status: "confirmed",
      date: "2026-01-01",
      accountId: account.id,
      categoryId: category.id,
      installmentTotal: 3,
      installmentCurrent: 1,
    });

    expect(res.status).toBe(400);
  });

  it("rejeita parcelamento em despesa sem cartão", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id);

    const res = await postTx(token, {
      description: "Despesa parcelada sem cartão",
      amount: 1_000,
      type: "expense",
      status: "confirmed",
      date: "2026-01-01",
      accountId: account.id,
      categoryId: category.id,
      installmentTotal: 3,
      installmentCurrent: 1,
    });

    expect(res.status).toBe(400);
  });

  it("aceita parcelamento em despesa com cartão", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id);
    const card = await createCard(user.id, account.id);

    const res = await postTx(token, {
      description: "Despesa parcelada no cartão",
      amount: 1_000,
      type: "expense",
      status: "confirmed",
      date: "2026-01-01",
      accountId: account.id,
      categoryId: category.id,
      cardId: card.id,
      installmentTotal: 3,
      installmentCurrent: 1,
    });

    expect(res.status).toBe(201);
  });
});

// ─── RN-CAT-03 — Categoria não pode ser transferida para si mesma ─────────────

describe("RN-CAT-03 — Categoria não pode ser transferida para si mesma", () => {
  it("rejeita transferTo igual ao próprio id", async () => {
    const user = await createUser();
    const token = await getToken(user.id);

    const catRes = await api("/categories", {
      method: "POST",
      token,
      body: { name: "Alimentação", type: "expense", color: "#EF4444", icon: "🍔" },
    });
    const cat = await catRes.json();

    const res = await api(`/categories/${cat.id}?transferTo=${cat.id}`, {
      method: "DELETE",
      token,
    });

    expect(res.status).toBe(400);
  });

  it("permite excluir categoria transferindo para outra", async () => {
    const user = await createUser();
    const token = await getToken(user.id);

    const [aRes, bRes] = await Promise.all([
      api("/categories", {
        method: "POST",
        token,
        body: { name: "Cat A", type: "expense", color: "#EF4444", icon: "A" },
      }),
      api("/categories", {
        method: "POST",
        token,
        body: { name: "Cat B", type: "expense", color: "#3B82F6", icon: "B" },
      }),
    ]);
    const catA = await aRes.json();
    const catB = await bRes.json();

    const res = await api(`/categories/${catA.id}?transferTo=${catB.id}`, {
      method: "DELETE",
      token,
    });

    expect(res.status).toBe(200);
  });
});

// ─── RN-GOAL-07 — Conta de reembolso não pode estar arquivada ────────────────

describe("RN-GOAL-07 — Conta de reembolso não pode estar arquivada", () => {
  it("rejeita delete de meta com conta de reembolso arquivada", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const archivedAccount = await createAccount(user.id, { isArchived: true });
    const goal = await createGoal(token);

    // Deposita para que haja depósitos vinculados
    await api(`/goals/${goal.id}/deposit`, {
      method: "POST",
      token,
      body: { amount: 1_000, accountId: account.id },
    });

    const res = await api(`/goals/${goal.id}?refundAccountId=${archivedAccount.id}`, {
      method: "DELETE",
      token,
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("ACCOUNT_ARCHIVED");
  });
});

// ─── RN-GOAL-08 — Prazo deve ser data futura ─────────────────────────────────

describe("RN-GOAL-08 — Prazo deve ser data futura", () => {
  it("rejeita deadline no passado", async () => {
    const user = await createUser();
    const token = await getToken(user.id);

    const res = await api("/goals", {
      method: "POST",
      token,
      body: {
        name: "Meta passada",
        targetAmount: 10_000,
        color: "#8B5CF6",
        icon: "🎯",
        deadline: "2020-01-01",
      },
    });

    expect(res.status).toBe(400);
  });

  it("aceita meta sem deadline", async () => {
    const user = await createUser();
    const token = await getToken(user.id);

    const res = await api("/goals", {
      method: "POST",
      token,
      body: { name: "Meta sem prazo", targetAmount: 10_000, color: "#8B5CF6", icon: "🎯" },
    });

    expect(res.status).toBe(201);
  });

  it("aceita deadline no futuro", async () => {
    const user = await createUser();
    const token = await getToken(user.id);

    const res = await api("/goals", {
      method: "POST",
      token,
      body: {
        name: "Meta futura",
        targetAmount: 10_000,
        color: "#8B5CF6",
        icon: "🎯",
        deadline: "2030-12-31",
      },
    });

    expect(res.status).toBe(201);
  });
});

// ─── RN-GOAL-09 — Meta cancelada não aceita depósitos ───────────────────────

describe("RN-GOAL-09 — Meta cancelada não aceita depósitos", () => {
  it("rejeita depósito em meta cancelada", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });

    // Cria meta e cancela via PUT
    const goal = await createGoal(token);
    await api(`/goals/${goal.id}`, {
      method: "PUT",
      token,
      body: { status: "cancelled" },
    });

    const res = await api(`/goals/${goal.id}/deposit`, {
      method: "POST",
      token,
      body: { amount: 1_000, accountId: account.id },
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("GOAL_NOT_ACTIVE");
  });

  it("permite depósito em meta ativa", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const goal = await createGoal(token);

    const res = await api(`/goals/${goal.id}/deposit`, {
      method: "POST",
      token,
      body: { amount: 1_000, accountId: account.id },
    });

    expect(res.status).toBe(200);
  });
});
