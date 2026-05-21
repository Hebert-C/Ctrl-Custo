/**
 * RN-PAY-05 a PAY-11 — Pagamentos Recorrentes: operações de pagamento
 *
 * STATUS: ❌ Não implementado — estes testes são TDD.
 * Todos devem FALHAR até que as rotas e as tabelas existam.
 *
 * Cobre:
 *   PAY-05 — conta inativa não pode ser paga
 *   PAY-06 — mesmo mês não pode ser pago duas vezes
 *   PAY-07 — valor do pagamento deve ser > 0
 *   PAY-08 — saldo insuficiente bloqueia pagamento
 *   PAY-09 — pagamento é atômico
 *   PAY-10 — /due retorna próximos e atrasados
 *   PAY-11 — desativar preserva histórico; deletar preserva transações
 */

import { describe, it, expect } from "vitest";
import {
  createUser,
  getToken,
  createAccount,
  createCategory,
  createRecurringBill,
  api,
  getBalance,
} from "./helpers";

/** Retorna o mês corrente no formato "YYYY-MM". */
function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

// ─── PAY-05 — conta inativa não pode ser paga ────────────────────────────────

describe("RN-PAY-05 — conta inativa não pode ser paga", () => {
  it("rejeita pagamento de conta recorrente inativa", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id);
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id, { amountCents: 5_000 });

    await api(`/recurring-bills/${bill.id}`, {
      method: "PUT",
      token,
      body: { isActive: false },
    });

    const res = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth() },
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("BILL_INACTIVE");
  });
});

// ─── PAY-06 — mesmo mês não pode ser pago duas vezes ─────────────────────────

describe("RN-PAY-06 — mesmo mês não pode ser pago duas vezes", () => {
  it("rejeita segundo pagamento no mesmo mês", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 50_000 });
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id, { amountCents: 5_000 });

    const first = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth() },
    });
    expect(first.status).toBe(201);

    const second = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth() },
    });

    expect(second.status).toBe(409);
    const body = await second.json();
    expect(body.code).toBe("ALREADY_PAID");
  });

  it("permite pagamento em meses distintos", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 50_000 });
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id, { amountCents: 5_000 });

    const prevDate = new Date();
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonth = prevDate.toISOString().slice(0, 7);

    const first = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: prevMonth },
    });
    expect(first.status).toBe(201);

    const second = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth() },
    });
    expect(second.status).toBe(201);
  });
});

// ─── PAY-07 — valor do pagamento deve ser > 0 ────────────────────────────────

describe("RN-PAY-07 — valor do pagamento deve ser > 0", () => {
  it("rejeita pagamento com amountCents = 0", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id);
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id);

    const res = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth(), amountCents: 0 },
    });

    expect(res.status).toBe(400);
  });

  it("rejeita pagamento com amountCents negativo", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id);
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id);

    const res = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth(), amountCents: -100 },
    });

    expect(res.status).toBe(400);
  });

  it("rejeita pagamento sem valor quando a conta não tem amountCents fixo", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id);
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id); // sem amountCents

    const res = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth() }, // nenhum amountCents
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("AMOUNT_REQUIRED");
  });

  it("aceita pagamento com amountCents fornecido para boleto variável", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 50_000 });
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id); // sem amountCents

    const res = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth(), amountCents: 8_990 },
    });

    expect(res.status).toBe(201);
  });
});

// ─── PAY-08 — saldo insuficiente bloqueia pagamento ──────────────────────────

describe("RN-PAY-08 — saldo insuficiente bloqueia pagamento", () => {
  it("rejeita pagamento quando saldo é insuficiente", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 1_000 }); // R$ 10
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id, {
      amountCents: 50_000, // R$ 500 > R$ 10
    });

    const res = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth() },
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("INSUFFICIENT_BALANCE");
  });

  it("permite pagamento quando saldo é exatamente suficiente", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 5_000 }); // R$ 50
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id, {
      amountCents: 5_000,
    });

    const res = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth() },
    });

    expect(res.status).toBe(201);
  });
});

// ─── PAY-09 — pagamento é atômico ────────────────────────────────────────────

describe("RN-PAY-09 — pagamento é atômico", () => {
  it("cria transação, debita saldo e registra pagamento numa única operação", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 }); // R$ 1.000
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id, {
      name: "Internet Fibra",
      amountCents: 9_990, // R$ 99,90
    });

    const balanceBefore = await getBalance(account.id);

    const res = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth() },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { transactionId: string };

    // Saldo foi debitado
    const balanceAfter = await getBalance(account.id);
    expect(balanceAfter).toBe(balanceBefore - 9_990);

    // Transação aparece no extrato
    expect(body.transactionId).toBeDefined();
    const txRes = await api(`/transactions/${body.transactionId}`, { token });
    expect(txRes.status).toBe(200);
    const txBody = (await txRes.json()) as { amount: number };
    expect(txBody.amount).toBe(9_990);

    // Segundo pagamento no mesmo mês confirma que recurring_payment foi criado
    const duplicate = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth() },
    });
    expect(duplicate.status).toBe(409);
  });

  it("reverte saldo e não cria recurring_payment quando débito falha", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 500 }); // R$ 5
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id); // sem amountCents fixo

    const balanceBefore = await getBalance(account.id);

    // Pagamento que excede o saldo
    const res = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth(), amountCents: 50_000 }, // R$ 500 > R$ 5
    });
    expect(res.status).toBe(422);

    // Saldo intacto após falha
    const balanceAfter = await getBalance(account.id);
    expect(balanceAfter).toBe(balanceBefore);

    // Sem recurring_payment criado — pagamento dentro do saldo deve funcionar
    const retry = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth(), amountCents: 500 }, // R$ 5 = saldo exato
    });
    expect(retry.status).toBe(201);
  });
});

// ─── PAY-10 — /due retorna próximos e atrasados ──────────────────────────────

describe("RN-PAY-10 — /due retorna próximos e atrasados", () => {
  it("retorna conta com vencimento nos próximos 7 dias como 'upcoming'", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id);
    const category = await createCategory(user.id);

    const today = new Date();
    const upcomingDay = Math.min(today.getDate() + 3, 28);

    await createRecurringBill(token, account.id, category.id, {
      name: "Conta Futura",
      dueDay: upcomingDay,
    });

    const res = await api("/recurring-bills/due", { token });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; status: string }[];

    const found = body.find((b) => b.name === "Conta Futura");
    expect(found).toBeDefined();
    expect(found?.status).toBe("upcoming");
  });

  it("retorna conta com vencimento passado e não paga como 'overdue'", async () => {
    const today = new Date();
    if (today.getDate() <= 1) return; // borda: sem dias passados no mês corrente

    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id);
    const category = await createCategory(user.id);

    await createRecurringBill(token, account.id, category.id, {
      name: "Conta Atrasada",
      dueDay: 1, // dia 1 já passou se hoje >= 2
    });

    const res = await api("/recurring-bills/due", { token });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; status: string }[];

    const found = body.find((b) => b.name === "Conta Atrasada");
    expect(found).toBeDefined();
    expect(found?.status).toBe("overdue");
  });

  it("não inclui conta já paga no mês corrente", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 50_000 });
    const category = await createCategory(user.id);

    const today = new Date();
    const upcomingDay = Math.min(today.getDate() + 2, 28);

    const bill = await createRecurringBill(token, account.id, category.id, {
      name: "Conta Já Paga",
      dueDay: upcomingDay,
      amountCents: 5_000,
    });

    await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth() },
    });

    const res = await api("/recurring-bills/due", { token });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string }[];

    expect(body.find((b) => b.name === "Conta Já Paga")).toBeUndefined();
  });

  it("não inclui conta inativa", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id);
    const category = await createCategory(user.id);

    const today = new Date();
    const upcomingDay = Math.min(today.getDate() + 2, 28);

    const bill = await createRecurringBill(token, account.id, category.id, {
      name: "Conta Inativa",
      dueDay: upcomingDay,
    });

    await api(`/recurring-bills/${bill.id}`, {
      method: "PUT",
      token,
      body: { isActive: false },
    });

    const res = await api("/recurring-bills/due", { token });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string }[];

    expect(body.find((b) => b.name === "Conta Inativa")).toBeUndefined();
  });

  it("não retorna contas de outro usuário", async () => {
    const owner = await createUser();
    const ownerToken = await getToken(owner.id);
    const account = await createAccount(owner.id);
    const category = await createCategory(owner.id);

    const today = new Date();
    const upcomingDay = Math.min(today.getDate() + 2, 28);

    await createRecurringBill(ownerToken, account.id, category.id, {
      name: "Conta do Owner",
      dueDay: upcomingDay,
    });

    const other = await createUser();
    const otherToken = await getToken(other.id);

    const res = await api("/recurring-bills/due", { token: otherToken });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string }[];

    expect(body.find((b) => b.name === "Conta do Owner")).toBeUndefined();
  });

  it("exige autenticação", async () => {
    const res = await api("/recurring-bills/due");
    expect(res.status).toBe(401);
  });
});

// ─── PAY-11 — desativar preserva histórico; deletar preserva transações ───────

describe("RN-PAY-11 — desativar preserva histórico; deletar preserva transações", () => {
  it("desativar (isActive=false) mantém a conta e seus pagamentos acessíveis", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 50_000 });
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id, { amountCents: 5_000 });

    await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth() },
    });

    const deactivate = await api(`/recurring-bills/${bill.id}`, {
      method: "PUT",
      token,
      body: { isActive: false },
    });
    expect(deactivate.status).toBe(200);

    // Conta ainda existe como inativa
    const get = await api(`/recurring-bills/${bill.id}`, { token });
    expect(get.status).toBe(200);
    const getBody = (await get.json()) as { isActive: boolean };
    expect(getBody.isActive).toBe(false);
  });

  it("conta inativa retorna BILL_INACTIVE ao tentar pagar (não 404)", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id);
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id, { amountCents: 5_000 });

    await api(`/recurring-bills/${bill.id}`, {
      method: "PUT",
      token,
      body: { isActive: false },
    });

    const pay = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: "2026-01" },
    });

    expect(pay.status).toBe(422);
    const body = await pay.json();
    expect(body.code).toBe("BILL_INACTIVE");
  });

  it("deletar remove a conta recorrente mas preserva as transações no extrato", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 50_000 });
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id, { amountCents: 5_000 });

    const payRes = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth() },
    });
    expect(payRes.status).toBe(201);
    const payBody = (await payRes.json()) as { transactionId: string };
    const txId = payBody.transactionId;

    const deleteRes = await api(`/recurring-bills/${bill.id}`, {
      method: "DELETE",
      token,
    });
    expect(deleteRes.status).toBe(204);

    // Conta recorrente removida
    const getBill = await api(`/recurring-bills/${bill.id}`, { token });
    expect(getBill.status).toBe(404);

    // Transação no extrato preservada
    const getTx = await api(`/transactions/${txId}`, { token });
    expect(getTx.status).toBe(200);
  });

  it("reativar conta (isActive=true) permite novos pagamentos", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 50_000 });
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id, { amountCents: 5_000 });

    await api(`/recurring-bills/${bill.id}`, {
      method: "PUT",
      token,
      body: { isActive: false },
    });

    const reactivate = await api(`/recurring-bills/${bill.id}`, {
      method: "PUT",
      token,
      body: { isActive: true },
    });
    expect(reactivate.status).toBe(200);
    const body = (await reactivate.json()) as { isActive: boolean };
    expect(body.isActive).toBe(true);

    const pay = await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth() },
    });
    expect(pay.status).toBe(201);
  });
});
