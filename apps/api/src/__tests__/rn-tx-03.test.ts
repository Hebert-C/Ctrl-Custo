/**
 * RN-TX-03 — Transferência não pode ser entre a mesma conta
 *
 * STATUS: ❌ Não implementado no backend — este teste vai FALHAR até a regra ser adicionada.
 * O frontend já valida, mas a API aceita accountId === destinationAccountId.
 * Implementar em: apps/api/src/routes/transactions.ts (schema Zod, transactionBody.refine)
 */

import { describe, it, expect } from "vitest";
import { createUser, getToken, createAccount, createCategory, getBalance, api } from "./helpers";

describe("RN-TX-03 — Transferência não pode ser entre a mesma conta", () => {
  it("rejeita transferência quando accountId é igual a destinationAccountId", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id, { type: "both" });

    const res = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Transferência para si mesmo",
        amount: 10_000,
        type: "transfer",
        status: "confirmed",
        date: "2026-01-01",
        accountId: account.id,
        destinationAccountId: account.id, // ← mesma conta
        categoryId: category.id,
      },
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/mesma conta/i);
  });

  it("não altera nenhum saldo em caso de rejeição", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id, { type: "both" });

    const balanceBefore = await getBalance(account.id);

    await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Transferência inválida",
        amount: 50_000,
        type: "transfer",
        status: "confirmed",
        date: "2026-01-01",
        accountId: account.id,
        destinationAccountId: account.id,
        categoryId: category.id,
      },
    });

    expect(await getBalance(account.id)).toBe(balanceBefore); // saldo intacto
  });

  it("permite transferência entre contas diferentes do mesmo usuário", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const origin = await createAccount(user.id, { balance: 100_000 });
    const dest = await createAccount(user.id, { balance: 0 });
    const category = await createCategory(user.id, { type: "both" });

    const res = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Transferência válida",
        amount: 10_000,
        type: "transfer",
        status: "confirmed",
        date: "2026-01-01",
        accountId: origin.id,
        destinationAccountId: dest.id,
        categoryId: category.id,
      },
    });

    expect(res.status).toBe(201);
    expect(await getBalance(origin.id)).toBe(90_000);
    expect(await getBalance(dest.id)).toBe(10_000);
  });
});
