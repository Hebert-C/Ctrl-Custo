/**
 * Testes de regressão para as 4 vulnerabilidades críticas corrigidas em 2026-05-31.
 *
 * C-01 — PUT /transactions/:id sem ownership check de destinationAccountId
 * C-02 — Pagamento de fatura com saldo não-atômico (race condition)
 * C-03 — DELETE /categories?transferTo sem ownership check da categoria destino
 */

import { describe, it, expect } from "vitest";
import {
  createUser,
  getToken,
  createAccount,
  createCategory,
  createCard,
  getBalance,
  api,
} from "./helpers";

// ─── C-01 ─────────────────────────────────────────────────────────────────────

describe("C-01 — PUT /transactions/:id: ownership check de destinationAccountId", () => {
  it("rejeita destinationAccountId de outro usuário ao editar transferência", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const attackerToken = await getToken(attacker.id);

    // owner tem conta com saldo
    const ownerAccount = await createAccount(owner.id, { balance: 500_000 });

    // attacker tem conta origem, conta destino e categoria
    const attackerOrigin = await createAccount(attacker.id, { balance: 100_000 });
    const attackerDest = await createAccount(attacker.id, { balance: 0 });
    const attackerCategory = await createCategory(attacker.id, { type: "both" });

    // attacker cria uma transferência legítima entre suas próprias contas
    const createRes = await api("/transactions", {
      method: "POST",
      token: attackerToken,
      body: {
        description: "Transferência legítima",
        amount: 10_000,
        type: "transfer",
        status: "confirmed",
        date: "2026-01-01",
        accountId: attackerOrigin.id,
        destinationAccountId: attackerDest.id,
        categoryId: attackerCategory.id,
      },
    });
    expect(createRes.status).toBe(201);
    const tx = await createRes.json();

    // attacker tenta redirecionar o destino para a conta do owner
    const editRes = await api(`/transactions/${tx.id}`, {
      method: "PUT",
      token: attackerToken,
      body: { destinationAccountId: ownerAccount.id },
    });

    expect(editRes.status).toBe(404);

    // saldo do owner não deve ter sido alterado
    expect(await getBalance(ownerAccount.id)).toBe(500_000);
  });

  it("aceita destinationAccountId do próprio usuário ao editar transferência", async () => {
    const user = await createUser();
    const token = await getToken(user.id);

    const origin = await createAccount(user.id, { balance: 100_000 });
    const dest1 = await createAccount(user.id, { balance: 0 });
    const dest2 = await createAccount(user.id, { balance: 0 });
    const category = await createCategory(user.id, { type: "both" });

    const createRes = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Transferência",
        amount: 10_000,
        type: "transfer",
        status: "confirmed",
        date: "2026-01-01",
        accountId: origin.id,
        destinationAccountId: dest1.id,
        categoryId: category.id,
      },
    });
    expect(createRes.status).toBe(201);
    const tx = await createRes.json();

    // redireciona para dest2 (do mesmo usuário) — deve ser aceito
    const editRes = await api(`/transactions/${tx.id}`, {
      method: "PUT",
      token,
      body: { destinationAccountId: dest2.id },
    });

    expect(editRes.status).toBe(200);
  });
});

// ─── C-02 ─────────────────────────────────────────────────────────────────────

describe("C-02 — POST /cards/:id/pay: saldo atômico no pagamento de fatura", () => {
  it("debita o saldo corretamente ao pagar a fatura", async () => {
    const user = await createUser();
    const token = await getToken(user.id);

    const account = await createAccount(user.id, { balance: 200_000 }); // R$ 2000
    // billingDay 28: período de "2026-01" vai de 2025-12-29 a 2026-01-28
    const card = await createCard(user.id, account.id, { creditLimit: 100_000, billingDay: 28 });
    const category = await createCategory(user.id);

    // data dentro do período da fatura de 2026-01 (billingDay 28)
    await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Compra no cartão",
        amount: 50_000, // R$ 500
        type: "expense",
        status: "confirmed",
        date: "2026-01-15",
        accountId: account.id,
        categoryId: category.id,
        cardId: card.id,
      },
    });

    const balanceBefore = await getBalance(account.id);

    const payRes = await api(`/cards/${card.id}/pay`, {
      method: "POST",
      token,
      body: { month: "2026-01", categoryId: category.id },
    });

    expect(payRes.status).toBe(201);

    const balanceAfter = await getBalance(account.id);

    // saldo deve ter diminuído exatamente 50_000 centavos
    expect(balanceBefore - balanceAfter).toBe(50_000);
  });

  it("rejeita pagamento quando saldo é insuficiente", async () => {
    const user = await createUser();
    const token = await getToken(user.id);

    const account = await createAccount(user.id, { balance: 10_000 }); // R$ 100
    // billingDay 28: período de "2026-01" vai de 2025-12-29 a 2026-01-28
    const card = await createCard(user.id, account.id, { creditLimit: 500_000, billingDay: 28 });
    const category = await createCategory(user.id);

    // insere gasto maior que o saldo diretamente (bypass da verificação de saldo em POST)
    const { db } = await import("../db/index");
    const { transactions } = await import("../db/schema");
    await db.insert(transactions).values({
      userId: user.id,
      accountId: account.id,
      categoryId: category.id,
      cardId: card.id,
      description: "Gasto alto",
      amount: 50_000, // R$ 500 — maior que o saldo de R$ 100
      type: "expense",
      status: "confirmed",
      date: "2026-01-15", // dentro do período billingDay=28 para mês 2026-01
    });

    const payRes = await api(`/cards/${card.id}/pay`, {
      method: "POST",
      token,
      body: { month: "2026-01", categoryId: category.id },
    });

    expect(payRes.status).toBe(422);
    const body = await payRes.json();
    expect(body.code).toBe("INSUFFICIENT_BALANCE");

    // saldo não deve ter sido alterado
    expect(await getBalance(account.id)).toBe(10_000);
  });
});

// ─── C-03 ─────────────────────────────────────────────────────────────────────

describe("C-03 — DELETE /categories?transferTo: ownership check da categoria destino", () => {
  it("rejeita transferTo apontando para categoria de outro usuário", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const attackerToken = await getToken(attacker.id);

    // owner cria uma categoria
    const ownerCategory = await createCategory(owner.id, { name: "Categoria do Owner" });

    // attacker cria e tenta deletar sua categoria transferindo para a do owner
    const attackerCategory = await createCategory(attacker.id, { name: "Categoria do Attacker" });

    const res = await api(`/categories/${attackerCategory.id}?transferTo=${ownerCategory.id}`, {
      method: "DELETE",
      token: attackerToken,
    });

    expect(res.status).toBe(404);
  });

  it("aceita transferTo apontando para categoria do próprio usuário", async () => {
    const user = await createUser();
    const token = await getToken(user.id);

    const catA = await createCategory(user.id, { name: "Categoria A" });
    const catB = await createCategory(user.id, { name: "Categoria B" });

    const res = await api(`/categories/${catA.id}?transferTo=${catB.id}`, {
      method: "DELETE",
      token,
    });

    expect(res.status).toBe(200);
  });

  it("rejeita transferTo igual ao id da categoria sendo deletada", async () => {
    const user = await createUser();
    const token = await getToken(user.id);

    const cat = await createCategory(user.id);

    const res = await api(`/categories/${cat.id}?transferTo=${cat.id}`, {
      method: "DELETE",
      token,
    });

    expect(res.status).toBe(400);
  });
});
