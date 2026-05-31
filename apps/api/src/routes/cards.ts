import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { db } from "../db/index";
import { cards, transactions, accounts, categories } from "../db/schema";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const cardBody = z.object({
  name: z.string().min(1).max(100),
  brand: z.enum(["visa", "mastercard", "elo", "amex", "hipercard", "other"]),
  lastFourDigits: z.string().length(4).optional(),
  creditLimit: z.number().int().min(0),
  billingDay: z.number().int().min(1).max(28),
  dueDay: z.number().int().min(1).max(28),
  accountId: z.string().uuid(),
  color: z.string().min(1).max(20),
  isArchived: z.boolean().optional(),
});

function getBillingPeriod(year: number, month: number, billingDay: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const end = new Date(year, month - 1, billingDay);
  const start = new Date(year, month - 2, billingDay + 1);
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { start: fmt(start), end: fmt(end) };
}

export const cardsRouter = new Hono<AuthEnv>();

cardsRouter.use(requireAuth);

cardsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const rows = await db
    .select()
    .from(cards)
    .where(and(eq(cards.userId, userId), eq(cards.isArchived, false)));
  return c.json(rows);
});

cardsRouter.post("/", zValidator("json", cardBody), async (c) => {
  const userId = c.get("userId");
  const body = c.req.valid("json");
  const [row] = await db
    .insert(cards)
    .values({ ...body, userId })
    .returning();
  return c.json(row, 201);
});

cardsRouter.put("/:id", zValidator("json", cardBody.partial()), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const [row] = await db
    .update(cards)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(cards.id, id), eq(cards.userId, userId)))
    .returning();
  if (!row) return c.json({ error: "Cartão não encontrado." }, 404);
  return c.json(row);
});

cardsRouter.get("/:id/statement", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const month = c.req.query("month") ?? new Date().toISOString().slice(0, 7);

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return c.json({ error: "month deve ser YYYY-MM" }, 400);
  }

  const [card] = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, id), eq(cards.userId, userId)))
    .limit(1);

  if (!card) return c.json({ error: "Cartão não encontrado." }, 404);

  const [year, mon] = month.split("-").map(Number);
  const { start, end } = getBillingPeriod(year, mon, card.billingDay);

  const txs = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.cardId, id),
        gte(transactions.date, start),
        lte(transactions.date, end)
      )
    )
    .orderBy(sql`${transactions.date} DESC, ${transactions.createdAt} DESC`);

  const totalSpent = txs.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

  return c.json({
    card,
    transactions: txs,
    totalSpent,
    availableLimit: card.creditLimit - totalSpent,
    billingStart: start,
    billingEnd: end,
  });
});

// RN-CARD-08: pagamento de fatura
cardsRouter.post(
  "/:id/pay",
  zValidator(
    "json",
    z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/, "month deve ser YYYY-MM"),
      categoryId: z.string().uuid(),
    })
  ),
  async (c) => {
    const userId = c.get("userId");
    const cardId = c.req.param("id");
    const { month, categoryId } = c.req.valid("json");

    const [card] = await db
      .select()
      .from(cards)
      .where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
      .limit(1);
    if (!card) return c.json({ error: "Cartão não encontrado." }, 404);

    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, card.accountId), eq(accounts.userId, userId)))
      .limit(1);
    if (!account) return c.json({ error: "Conta não encontrada." }, 404);
    if (account.isArchived)
      return c.json({ error: "Conta arquivada.", code: "ACCOUNT_ARCHIVED" }, 422);

    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
      .limit(1);
    if (!category) return c.json({ error: "Categoria não encontrada." }, 404);

    const [payYear, payMon] = month.split("-").map(Number);
    const { start: payStart, end: payEnd } = getBillingPeriod(payYear, payMon, card.billingDay);

    const txRows = await db
      .select({ amount: transactions.amount })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.cardId, cardId),
          eq(transactions.type, "expense"),
          eq(transactions.status, "confirmed"),
          gte(transactions.date, payStart),
          lte(transactions.date, payEnd)
        )
      );
    const totalSpent = txRows.reduce((sum, t) => sum + t.amount, 0);

    if (totalSpent === 0) return c.json({ error: "Fatura zerada. Nada a pagar." }, 400);

    if (account.balance < totalSpent)
      return c.json({ error: "Saldo insuficiente.", code: "INSUFFICIENT_BALANCE" }, 422);

    const [y, m] = month.split("-").map(Number);
    const monthLabel = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    const payDate = new Date().toISOString().slice(0, 10);

    const result = await db.transaction(async (trx) => {
      const [newTx] = await trx
        .insert(transactions)
        .values({
          id: crypto.randomUUID(),
          userId,
          description: `Fatura ${card.name} — ${monthLabel}`,
          amount: totalSpent,
          type: "expense",
          status: "confirmed",
          date: payDate,
          categoryId,
          accountId: card.accountId,
        })
        .returning();

      await trx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} - ${totalSpent}`, updatedAt: new Date() })
        .where(and(eq(accounts.id, card.accountId), eq(accounts.userId, userId)));

      return newTx;
    });

    return c.json({ transaction: result }, 201);
  }
);

cardsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const [row] = await db
    .delete(cards)
    .where(and(eq(cards.id, id), eq(cards.userId, userId)))
    .returning({ id: cards.id });
  if (!row) return c.json({ error: "Cartão não encontrado." }, 404);
  return c.json({ ok: true });
});
