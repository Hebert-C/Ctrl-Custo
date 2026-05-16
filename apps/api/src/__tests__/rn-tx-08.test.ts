/**
 * RN-TX-08 — Data deve ser válida (não apenas bem formatada)
 *
 * STATUS: ❌ TDD — estes testes devem FALHAR até a implementação.
 */

import { describe, it, expect } from "vitest";
import { createUser, getToken, createAccount, createCategory, api } from "./helpers";

async function postTx(token: string, accountId: string, categoryId: string, date: string) {
  return api("/transactions", {
    method: "POST",
    token,
    body: {
      description: "Teste",
      amount: 1_000,
      type: "expense",
      status: "confirmed",
      date,
      accountId,
      categoryId,
    },
  });
}

describe("RN-TX-08 — Data deve ser válida", () => {
  it("rejeita 2024-02-30 (fevereiro não tem dia 30)", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id);

    const res = await postTx(token, account.id, category.id, "2024-02-30");
    expect(res.status).toBe(400);
  });

  it("rejeita 2023-02-29 (2023 não é ano bissexto)", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id);

    const res = await postTx(token, account.id, category.id, "2023-02-29");
    expect(res.status).toBe(400);
  });

  it("rejeita 2024-04-31 (abril tem só 30 dias)", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id);

    const res = await postTx(token, account.id, category.id, "2024-04-31");
    expect(res.status).toBe(400);
  });

  it("aceita 2024-02-29 (2024 é ano bissexto)", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id);

    const res = await postTx(token, account.id, category.id, "2024-02-29");
    expect(res.status).toBe(201);
  });

  it("aceita datas válidas normais", async () => {
    const user = await createUser();
    const token = await getToken(user.id);
    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id);

    const res = await postTx(token, account.id, category.id, "2026-01-15");
    expect(res.status).toBe(201);
  });
});
