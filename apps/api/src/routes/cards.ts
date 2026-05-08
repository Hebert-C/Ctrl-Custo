import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index";
import { cards, transactions } from "../db/schema";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const cardBody = z.object({
  name: z.string().min(1).max(100),
  brand: z.enum(["visa", "mastercard", "elo", "amex", "hipercard", "other"]),
  lastFourDigits: z.string().length(4).optional(),
  creditLimit: z.number().int().min(0),
  billingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  accountId: z.string().uuid(),
  color: z.string().min(1).max(20),
  isArchived: z.boolean().optional(),
});

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

  const txs = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.cardId, id),
        sql`${transactions.date} LIKE ${month + "-%"}`
      )
    )
    .orderBy(sql`${transactions.date} DESC, ${transactions.createdAt} DESC`);

  const totalSpent = txs.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

  return c.json({
    card,
    transactions: txs,
    totalSpent,
    availableLimit: card.creditLimit - totalSpent,
  });
});

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
