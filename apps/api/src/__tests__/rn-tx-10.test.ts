/**
 * RN-TX-10 — Propriedade dos recursos vinculados (categoryId, cardId)
 *
 * STATUS: ❌ TDD — estes testes devem FALHAR até a implementação.
 */

import { describe, it, expect } from "vitest";
import { createUser, getToken, createAccount, createCategory, createCard, api } from "./helpers";

describe("RN-TX-10 — Ownership de recursos vinculados", () => {
  it("rejeita transação com categoryId de outro usuário", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const attackerToken = await getToken(attacker.id);

    // categoria pertence ao owner, não ao attacker
    const ownerAccount = await createAccount(owner.id);
    const ownerCategory = await createCategory(owner.id);

    const attackerAccount = await createAccount(attacker.id, { balance: 100_000 });

    const res = await api("/transactions", {
      method: "POST",
      token: attackerToken,
      body: {
        description: "Compra",
        amount: 1_000,
        type: "expense",
        status: "confirmed",
        date: "2026-01-01",
        accountId: attackerAccount.id,
        categoryId: ownerCategory.id, // categoria de outro usuário
      },
    });

    expect(res.status).toBe(404);
    // suprimir warning de variáveis não usadas
    void ownerAccount;
  });

  it("rejeita transação com cardId de outro usuário", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const attackerToken = await getToken(attacker.id);

    const ownerAccount = await createAccount(owner.id);
    const ownerCard = await createCard(owner.id, ownerAccount.id);

    const attackerAccount = await createAccount(attacker.id, { balance: 100_000 });
    const attackerCategory = await createCategory(attacker.id);

    const res = await api("/transactions", {
      method: "POST",
      token: attackerToken,
      body: {
        description: "Compra no cartão alheio",
        amount: 1_000,
        type: "expense",
        status: "confirmed",
        date: "2026-01-01",
        accountId: attackerAccount.id,
        categoryId: attackerCategory.id,
        cardId: ownerCard.id, // cartão de outro usuário
      },
    });

    expect(res.status).toBe(404);
  });

  it("aceita transação com categoryId e cardId do próprio usuário", async () => {
    const user = await createUser();
    const token = await getToken(user.id);

    const account = await createAccount(user.id, { balance: 100_000 });
    const category = await createCategory(user.id);
    const card = await createCard(user.id, account.id);

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
        cardId: card.id,
      },
    });

    expect(res.status).toBe(201);
  });

  it("rejeita accountId de outro usuário no POST", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const attackerToken = await getToken(attacker.id);

    const ownerAccount = await createAccount(owner.id, { balance: 100_000 });
    const attackerCategory = await createCategory(attacker.id);

    const res = await api("/transactions", {
      method: "POST",
      token: attackerToken,
      body: {
        description: "IDOR attempt",
        amount: 1_000,
        type: "expense",
        status: "confirmed",
        date: "2026-01-01",
        accountId: ownerAccount.id, // conta de outro usuário
        categoryId: attackerCategory.id,
      },
    });

    expect(res.status).toBe(404);
  });
});
