import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { users, accounts, categories, cards, transactions } from "../db/schema";
import { hashPassword } from "../lib/password";
import { signAccessToken } from "../lib/token";
import app from "../app";

// ─── Factories ────────────────────────────────────────────────────────────────

/** Cria usuário diretamente no banco com e-mail já verificado (bypassa o fluxo de e-mail). */
export async function createUser(email = `u${Date.now()}@test.com`) {
  const passwordHash = await hashPassword("Test@1234");
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, emailVerified: true })
    .returning();
  return user;
}

/** Gera um access token JWT válido para o userId informado. */
export async function getToken(userId: string) {
  return signAccessToken(userId);
}

/** Cria conta bancária com saldo padrão de R$ 1.000 (100.000 centavos). */
export async function createAccount(userId: string, overrides: Record<string, unknown> = {}) {
  const [account] = await db
    .insert(accounts)
    .values({
      userId,
      name: "Test Account",
      type: "checking" as const,
      balance: 100_000,
      color: "#2563EB",
      icon: "🏦",
      ...overrides,
    })
    .returning();
  return account;
}

/** Cria categoria de despesa. */
export async function createCategory(userId: string, overrides: Record<string, unknown> = {}) {
  const [cat] = await db
    .insert(categories)
    .values({
      userId,
      name: "Test Category",
      type: "expense" as const,
      color: "#EF4444",
      icon: "💸",
      ...overrides,
    })
    .returning();
  return cat;
}

/** Cria cartão de crédito com limite padrão de R$ 500 (50.000 centavos). */
export async function createCard(
  userId: string,
  accountId: string,
  overrides: Record<string, unknown> = {}
) {
  const [card] = await db
    .insert(cards)
    .values({
      userId,
      accountId,
      name: "Test Card",
      brand: "visa" as const,
      creditLimit: 50_000,
      billingDay: 1,
      dueDay: 10,
      color: "#7C3AED",
      ...overrides,
    })
    .returning();
  return card;
}

/**
 * Insere transação DIRETAMENTE no banco sem atualizar saldo da conta.
 * Use apenas para configurar estado em testes que não dependem do saldo.
 * Para testes de saldo, crie a transação via `api()`.
 */
export async function createTransaction(
  userId: string,
  accountId: string,
  categoryId: string,
  overrides: Record<string, unknown> = {}
) {
  const today = new Date().toISOString().slice(0, 10);
  const [tx] = await db
    .insert(transactions)
    .values({
      userId,
      accountId,
      categoryId,
      description: "Test Tx",
      amount: 1_000,
      type: "expense" as const,
      status: "confirmed" as const,
      date: today,
      ...overrides,
    })
    .returning();
  return tx;
}

/** Lê o saldo atual de uma conta diretamente do banco. */
export async function getBalance(accountId: string): Promise<number> {
  const [row] = await db
    .select({ balance: accounts.balance })
    .from(accounts)
    .where(eq(accounts.id, accountId));
  return row?.balance ?? 0;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

/**
 * Faz uma requisição ao app Hono sem servidor HTTP real.
 * Equivale a um fetch() direto para o handler da aplicação.
 */
export async function api(
  path: string,
  opts: { method?: string; token?: string; body?: unknown } = {}
) {
  const headers: Record<string, string> = {};
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  return app.request(path, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}
