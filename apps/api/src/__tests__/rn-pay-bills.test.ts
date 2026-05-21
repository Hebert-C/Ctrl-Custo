/**
 * RN-PAY-01 a PAY-04 — Pagamentos Recorrentes: criação e validação
 *
 * STATUS: ❌ Não implementado — estes testes são TDD.
 * Todos devem FALHAR até que as rotas e as tabelas existam.
 *
 * Cobre:
 *   PAY-01 — due_day limitado a 1–28
 *   PAY-02 — amount_cents é opcional
 *   PAY-03 — conta recorrente pertence ao userId do JWT
 *   PAY-04 — conta de débito não pode estar arquivada ao criar/editar
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

// ─── PAY-01 — due_day limitado a 1–28 ────────────────────────────────────────

describe("RN-PAY-01 — due_day limitado a 1–28", () => {
  it("rejeita due_day = 0", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id);
    const category = await createCategory(user.id);

    const res = await api("/recurring-bills", {
      method: "POST",
      token,
      body: { name: "Luz", dueDay: 0, accountId: account.id, categoryId: category.id },
    });

    expect(res.status).toBe(400);
  });

  it("rejeita due_day = 29", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id);
    const category = await createCategory(user.id);

    const res = await api("/recurring-bills", {
      method: "POST",
      token,
      body: { name: "Luz", dueDay: 29, accountId: account.id, categoryId: category.id },
    });

    expect(res.status).toBe(400);
  });

  it("aceita due_day = 1 (limite inferior)", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id);
    const category = await createCategory(user.id);

    const res = await api("/recurring-bills", {
      method: "POST",
      token,
      body: { name: "Luz", dueDay: 1, accountId: account.id, categoryId: category.id },
    });

    expect(res.status).toBe(201);
  });

  it("aceita due_day = 28 (limite superior)", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id);
    const category = await createCategory(user.id);

    const res = await api("/recurring-bills", {
      method: "POST",
      token,
      body: { name: "Luz", dueDay: 28, accountId: account.id, categoryId: category.id },
    });

    expect(res.status).toBe(201);
  });
});

// ─── PAY-02 — amount_cents é opcional ────────────────────────────────────────

describe("RN-PAY-02 — amount_cents é opcional", () => {
  it("cria conta recorrente sem amount_cents (boleto variável)", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id);
    const category = await createCategory(user.id);

    const res = await api("/recurring-bills", {
      method: "POST",
      token,
      body: { name: "Água", dueDay: 15, accountId: account.id, categoryId: category.id },
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.amountCents).toBeNull(); // campo presente mas nulo
  });

  it("cria conta recorrente com amount_cents e retorna o valor", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id);
    const category = await createCategory(user.id);

    const res = await api("/recurring-bills", {
      method: "POST",
      token,
      body: {
        name: "Internet",
        dueDay: 5,
        accountId: account.id,
        categoryId: category.id,
        amountCents: 10990, // R$ 109,90
      },
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.amountCents).toBe(10990);
  });

  it("permite editar uma conta recorrente sem amount_cents para definir um valor", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id);
    const category = await createCategory(user.id);

    const bill = await createRecurringBill(token, account.id, category.id);

    const res = await api(`/recurring-bills/${bill.id}`, {
      method: "PUT",
      token,
      body: { amountCents: 5000 },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.amountCents).toBe(5000);
  });
});

// ─── PAY-03 — isolamento por userId do JWT ────────────────────────────────────

describe("RN-PAY-03 — conta recorrente pertence ao userId do JWT", () => {
  it("GET /recurring-bills não lista contas de outro usuário", async () => {
    const owner = await createUser();
    const ownerToken = await getToken(owner.id);
    const account = await createAccount(owner.id);
    const category = await createCategory(owner.id);
    await createRecurringBill(ownerToken, account.id, category.id, { name: "Luz do Owner" });

    const other = await createUser();
    const otherToken = await getToken(other.id);

    const res = await api("/recurring-bills", { token: otherToken });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(0); // outro usuário não vê a conta do owner
  });

  it("GET /recurring-bills/:id de outro usuário retorna 404", async () => {
    const owner = await createUser();
    const ownerToken = await getToken(owner.id);
    const account = await createAccount(owner.id);
    const category = await createCategory(owner.id);
    const bill = await createRecurringBill(ownerToken, account.id, category.id);

    const other = await createUser();
    const otherToken = await getToken(other.id);

    const res = await api(`/recurring-bills/${bill.id}`, { token: otherToken });
    expect(res.status).toBe(404);
  });

  it("PUT /recurring-bills/:id de outro usuário retorna 404", async () => {
    const owner = await createUser();
    const ownerToken = await getToken(owner.id);
    const account = await createAccount(owner.id);
    const category = await createCategory(owner.id);
    const bill = await createRecurringBill(ownerToken, account.id, category.id);

    const other = await createUser();
    const otherToken = await getToken(other.id);

    const res = await api(`/recurring-bills/${bill.id}`, {
      method: "PUT",
      token: otherToken,
      body: { name: "Tentativa maliciosa" },
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /recurring-bills/:id de outro usuário retorna 404", async () => {
    const owner = await createUser();
    const ownerToken = await getToken(owner.id);
    const account = await createAccount(owner.id);
    const category = await createCategory(owner.id);
    const bill = await createRecurringBill(ownerToken, account.id, category.id);

    const other = await createUser();
    const otherToken = await getToken(other.id);

    const res = await api(`/recurring-bills/${bill.id}`, {
      method: "DELETE",
      token: otherToken,
    });
    expect(res.status).toBe(404);
  });

  it("requisição sem token retorna 401", async () => {
    const res = await api("/recurring-bills");
    expect(res.status).toBe(401);
  });
});

// ─── PAY-04 — conta de débito não pode estar arquivada ───────────────────────

describe("RN-PAY-04 — conta de débito não pode estar arquivada", () => {
  it("rejeita criação com conta arquivada", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const archivedAccount = await createAccount(user.id, { isArchived: true });
    const category = await createCategory(user.id);

    const res = await api("/recurring-bills", {
      method: "POST",
      token,
      body: {
        name: "Luz",
        dueDay: 10,
        accountId: archivedAccount.id,
        categoryId: category.id,
      },
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("ACCOUNT_ARCHIVED");
  });

  it("rejeita edição quando a nova conta está arquivada", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const activeAccount = await createAccount(user.id);
    const archivedAccount = await createAccount(user.id, { isArchived: true });
    const category = await createCategory(user.id);

    const bill = await createRecurringBill(token, activeAccount.id, category.id);

    const res = await api(`/recurring-bills/${bill.id}`, {
      method: "PUT",
      token,
      body: { accountId: archivedAccount.id },
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("ACCOUNT_ARCHIVED");
  });

  it("permite criação com conta ativa", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id); // isArchived = false por padrão
    const category = await createCategory(user.id);

    const res = await api("/recurring-bills", {
      method: "POST",
      token,
      body: { name: "Internet", dueDay: 5, accountId: account.id, categoryId: category.id },
    });

    expect(res.status).toBe(201);
  });
});
