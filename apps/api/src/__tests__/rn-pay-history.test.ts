/**
 * RN-PAY-13 — Histórico de pagamentos por conta recorrente
 *
 * STATUS: ❌ Não implementado — estes testes são TDD.
 * Todos devem FALHAR até que a rota exista.
 *
 * Cobre:
 *   PAY-13 — GET /recurring-bills/:id/payments retorna histórico ordenado
 */

import { describe, it, expect } from "vitest";
import {
  createUser,
  getToken,
  createAccount,
  createCategory,
  createRecurringBill,
  api,
} from "./helpers";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function prevMonth() {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  return `${year}-${String(month).padStart(2, "0")}`;
}

// ─── PAY-13 — histórico de pagamentos ────────────────────────────────────────

describe("RN-PAY-13 — histórico de pagamentos por conta recorrente", () => {
  it("retorna array vazio quando nenhum pagamento foi feito", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id);
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id);

    const res = await api(`/recurring-bills/${bill.id}/payments`, { token });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("retorna pagamentos com campos corretos", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 50_000 });
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id, { amountCents: 9_990 });

    await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth() },
    });

    const res = await api(`/recurring-bills/${bill.id}/payments`, { token });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      id: string;
      dueDate: string;
      amountCents: number;
      transactionId: string;
      createdAt: string;
    }[];

    expect(body).toHaveLength(1);
    expect(body[0].dueDate).toBe(currentMonth());
    expect(body[0].amountCents).toBe(9_990);
    expect(body[0].transactionId).toBeDefined();
    expect(body[0].createdAt).toBeDefined();
  });

  it("retorna múltiplos pagamentos ordenados por dueDate ascendente", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id, { amountCents: 5_000 });

    await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: prevMonth() },
    });
    await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth() },
    });

    const res = await api(`/recurring-bills/${bill.id}/payments`, { token });
    expect(res.status).toBe(200);

    const body = (await res.json()) as { dueDate: string }[];
    expect(body).toHaveLength(2);
    expect(body[0].dueDate).toBe(prevMonth());
    expect(body[1].dueDate).toBe(currentMonth());
  });

  it("armazena o valor real pago para contas de valor variável", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id);
    const bill = await createRecurringBill(token, account.id, category.id); // sem amountCents fixo

    await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token,
      body: { month: currentMonth(), amountCents: 18_750 }, // valor variável informado na hora
    });

    const res = await api(`/recurring-bills/${bill.id}/payments`, { token });
    expect(res.status).toBe(200);

    const body = (await res.json()) as { amountCents: number }[];
    expect(body[0].amountCents).toBe(18_750);
  });

  it("retorna 404 para conta recorrente inexistente", async () => {
    const user = await createUser();
    const token = await getToken(user.id);

    const res = await api("/recurring-bills/00000000-0000-0000-0000-000000000000/payments", {
      token,
    });

    expect(res.status).toBe(404);
  });

  it("não retorna pagamentos de conta de outro usuário", async () => {
    const owner = await createUser();
    const ownerToken = await getToken(owner.id);
    const account = await createAccount(owner.id, { balance: 50_000 });
    const category = await createCategory(owner.id);
    const bill = await createRecurringBill(ownerToken, account.id, category.id, {
      amountCents: 5_000,
    });

    await api(`/recurring-bills/${bill.id}/pay`, {
      method: "POST",
      token: ownerToken,
      body: { month: currentMonth() },
    });

    const other = await createUser();
    const otherToken = await getToken(other.id);

    const res = await api(`/recurring-bills/${bill.id}/payments`, { token: otherToken });
    expect(res.status).toBe(404);
  });

  it("exige autenticação", async () => {
    const res = await api("/recurring-bills/00000000-0000-0000-0000-000000000000/payments");
    expect(res.status).toBe(401);
  });
});
