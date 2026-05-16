/**
 * RN-GOAL-05 — Depósito não pode exceder o valor alvo da meta
 *
 * STATUS: ❌ TDD — estes testes devem FALHAR até a implementação.
 */

import { describe, it, expect } from "vitest";
import { createUser, getToken, createAccount, api } from "./helpers";

async function createGoal(token: string, overrides: Record<string, unknown> = {}) {
  const res = await api("/goals", {
    method: "POST",
    token,
    body: {
      name: "Meta Teste",
      targetAmount: 10_000, // R$ 100
      color: "#8B5CF6",
      icon: "🎯",
      ...overrides,
    },
  });
  return res.json();
}

describe("RN-GOAL-05 — Depósito não pode exceder o valor alvo", () => {
  it("rejeita depósito que excede targetAmount do zero", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 200_000 });
    const goal = await createGoal(token, { targetAmount: 10_000 });

    const res = await api(`/goals/${goal.id}/deposit`, {
      method: "POST",
      token,
      body: { amount: 15_000, accountId: account.id }, // R$ 150 > R$ 100
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("DEPOSIT_EXCEEDS_TARGET");
  });

  it("rejeita depósito que excede o restante após depósitos parciais", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 200_000 });
    const goal = await createGoal(token, { targetAmount: 10_000 });

    // Primeiro depósito de R$ 80 (ok)
    await api(`/goals/${goal.id}/deposit`, {
      method: "POST",
      token,
      body: { amount: 8_000, accountId: account.id },
    });

    // Segundo depósito de R$ 30 — excederia (80+30=110 > 100)
    const res = await api(`/goals/${goal.id}/deposit`, {
      method: "POST",
      token,
      body: { amount: 3_000, accountId: account.id },
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("DEPOSIT_EXCEEDS_TARGET");
  });

  it("permite depósito que atinge exatamente targetAmount (completa a meta)", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 200_000 });
    const goal = await createGoal(token, { targetAmount: 10_000 });

    const res = await api(`/goals/${goal.id}/deposit`, {
      method: "POST",
      token,
      body: { amount: 10_000, accountId: account.id }, // exatamente o alvo
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("completed");
  });

  it("permite depósito parcial abaixo do restante", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 200_000 });
    const goal = await createGoal(token, { targetAmount: 10_000 });

    const res = await api(`/goals/${goal.id}/deposit`, {
      method: "POST",
      token,
      body: { amount: 5_000, accountId: account.id }, // R$ 50 de R$ 100
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.currentAmount).toBe(5_000);
    expect(body.status).toBe("active");
  });
});
