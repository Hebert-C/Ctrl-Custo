/**
 * RN-TX-06 — Cancelar transação confirmada reverte o saldo
 * RN-TX-07 — Confirmar transação pendente aplica o saldo
 *
 * STATUS: ✅ Já implementado — estes testes são de REGRESSÃO.
 * Garantem que o comportamento correto não seja quebrado no futuro.
 */

import { describe, it, expect } from "vitest";
import { createUser, getToken, createAccount, createCategory, getBalance, api } from "./helpers";

describe("RN-TX-06 — Cancelar transação confirmada reverte o saldo", () => {
  it("restaura o saldo ao cancelar uma despesa confirmada", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 }); // R$ 1000
    const category = await createCategory(user.id);

    // Cria via API para que o saldo seja debitado corretamente
    const createRes = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Despesa a cancelar",
        amount: 10_000, // R$ 100
        type: "expense",
        status: "confirmed",
        date: "2026-01-01",
        accountId: account.id,
        categoryId: category.id,
      },
    });
    expect(createRes.status).toBe(201);
    const tx = await createRes.json();

    expect(await getBalance(account.id)).toBe(90_000); // R$ 1000 - R$ 100

    // Cancela via PUT
    const cancelRes = await api(`/transactions/${tx.id}`, {
      method: "PUT",
      token,
      body: { status: "cancelled" },
    });
    expect(cancelRes.status).toBe(200);

    // Saldo deve voltar ao original
    expect(await getBalance(account.id)).toBe(100_000);
  });

  it("restaura o saldo ao cancelar uma receita confirmada", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 50_000 });
    const category = await createCategory(user.id, { type: "income" });

    const createRes = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Receita a cancelar",
        amount: 20_000,
        type: "income",
        status: "confirmed",
        date: "2026-01-01",
        accountId: account.id,
        categoryId: category.id,
      },
    });
    expect(createRes.status).toBe(201);
    const tx = await createRes.json();

    expect(await getBalance(account.id)).toBe(70_000); // R$ 500 + R$ 200

    const cancelRes = await api(`/transactions/${tx.id}`, {
      method: "PUT",
      token,
      body: { status: "cancelled" },
    });
    expect(cancelRes.status).toBe(200);

    expect(await getBalance(account.id)).toBe(50_000); // revertido
  });

  it("restaura ambas as contas ao cancelar uma transferência confirmada", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const origin = await createAccount(user.id, { balance: 100_000 });
    const dest = await createAccount(user.id, { balance: 20_000 });
    const category = await createCategory(user.id, { type: "both" });

    const createRes = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Transferência a cancelar",
        amount: 30_000,
        type: "transfer",
        status: "confirmed",
        date: "2026-01-01",
        accountId: origin.id,
        destinationAccountId: dest.id,
        categoryId: category.id,
      },
    });
    expect(createRes.status).toBe(201);
    const tx = await createRes.json();

    expect(await getBalance(origin.id)).toBe(70_000); // debitou
    expect(await getBalance(dest.id)).toBe(50_000); // creditou

    const cancelRes = await api(`/transactions/${tx.id}`, {
      method: "PUT",
      token,
      body: { status: "cancelled" },
    });
    expect(cancelRes.status).toBe(200);

    expect(await getBalance(origin.id)).toBe(100_000); // restaurado
    expect(await getBalance(dest.id)).toBe(20_000); // restaurado
  });
});

describe("RN-TX-07 — Confirmar transação pendente aplica o saldo", () => {
  it("debita o saldo ao confirmar uma despesa pendente", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id);

    // Cria como pendente (não mexe no saldo)
    const createRes = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Boleto pendente",
        amount: 20_000,
        type: "expense",
        status: "pending",
        date: "2026-01-01",
        accountId: account.id,
        categoryId: category.id,
      },
    });
    expect(createRes.status).toBe(201);
    const tx = await createRes.json();

    expect(await getBalance(account.id)).toBe(100_000); // pendente não mexeu

    // Confirma via PUT
    const confirmRes = await api(`/transactions/${tx.id}`, {
      method: "PUT",
      token,
      body: { status: "confirmed" },
    });
    expect(confirmRes.status).toBe(200);

    expect(await getBalance(account.id)).toBe(80_000); // R$ 1000 - R$ 200
  });

  it("credita o saldo ao confirmar uma receita pendente", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 50_000 });
    const category = await createCategory(user.id, { type: "income" });

    const createRes = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Salário pendente",
        amount: 150_000,
        type: "income",
        status: "pending",
        date: "2026-01-01",
        accountId: account.id,
        categoryId: category.id,
      },
    });
    expect(createRes.status).toBe(201);
    const tx = await createRes.json();

    expect(await getBalance(account.id)).toBe(50_000); // não creditou ainda

    const confirmRes = await api(`/transactions/${tx.id}`, {
      method: "PUT",
      token,
      body: { status: "confirmed" },
    });
    expect(confirmRes.status).toBe(200);

    expect(await getBalance(account.id)).toBe(200_000); // R$ 500 + R$ 1500
  });

  it("transação que já é confirmed não duplica o saldo ao ser salva novamente", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id);

    const createRes = await api("/transactions", {
      method: "POST",
      token,
      body: {
        description: "Despesa",
        amount: 10_000,
        type: "expense",
        status: "confirmed",
        date: "2026-01-01",
        accountId: account.id,
        categoryId: category.id,
      },
    });
    const tx = await createRes.json();

    expect(await getBalance(account.id)).toBe(90_000);

    // PUT sem mudar status (apenas descrição) — não deve alterar saldo novamente
    await api(`/transactions/${tx.id}`, {
      method: "PUT",
      token,
      body: { description: "Despesa editada" },
    });

    expect(await getBalance(account.id)).toBe(90_000); // saldo inalterado
  });
});
