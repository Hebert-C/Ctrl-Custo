import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index";
import { transactions, accounts } from "../db/schema";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const transactionBody = z.object({
  description: z.string().min(1).max(255),
  amount: z.number().int().positive(),
  type: z.enum(["income", "expense", "transfer"]),
  status: z.enum(["confirmed", "pending", "cancelled"]).default("confirmed"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  categoryId: z.string().uuid(),
  accountId: z.string().uuid(),
  cardId: z.string().uuid().optional(),
  installmentTotal: z.number().int().positive().optional(),
  installmentCurrent: z.number().int().positive().optional(),
  installmentGroupId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});

function balanceDelta(type: string, amount: number): number {
  if (type === "income") return amount;
  if (type === "expense") return -amount;
  return 0;
}

export const transactionsRouter = new Hono<AuthEnv>();

transactionsRouter.use(requireAuth);

transactionsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(sql`${transactions.date} DESC, ${transactions.createdAt} DESC`);
  return c.json(rows);
});

transactionsRouter.post("/", zValidator("json", transactionBody), async (c) => {
  const userId = c.get("userId");
  const body = c.req.valid("json");

  const [row] = await db.transaction(async (trx) => {
    const inserted = await trx
      .insert(transactions)
      .values({ ...body, userId })
      .returning();
    if (body.status === "confirmed") {
      const delta = balanceDelta(body.type, body.amount);
      if (delta !== 0) {
        await trx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} + ${delta}`, updatedAt: new Date() })
          .where(and(eq(accounts.id, body.accountId), eq(accounts.userId, userId)));
      }
    }
    return inserted;
  });

  return c.json(row, 201);
});

transactionsRouter.put("/:id", zValidator("json", transactionBody.partial()), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);
  if (!existing) return c.json({ error: "Not found" }, 404);

  const [row] = await db.transaction(async (trx) => {
    if (existing.status === "confirmed") {
      const oldDelta = balanceDelta(existing.type, existing.amount);
      if (oldDelta !== 0) {
        await trx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${oldDelta}`, updatedAt: new Date() })
          .where(eq(accounts.id, existing.accountId));
      }
    }

    const merged = { ...existing, ...body };
    if (merged.status === "confirmed") {
      const newDelta = balanceDelta(merged.type, merged.amount);
      if (newDelta !== 0) {
        await trx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} + ${newDelta}`, updatedAt: new Date() })
          .where(eq(accounts.id, merged.accountId));
      }
    }

    return trx
      .update(transactions)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(transactions.id, id))
      .returning();
  });

  return c.json(row);
});

transactionsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);
  if (!existing) return c.json({ error: "Not found" }, 404);

  await db.transaction(async (trx) => {
    if (existing.status === "confirmed") {
      const delta = balanceDelta(existing.type, existing.amount);
      if (delta !== 0) {
        await trx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${delta}`, updatedAt: new Date() })
          .where(eq(accounts.id, existing.accountId));
      }
    }
    await trx.delete(transactions).where(eq(transactions.id, id));
  });

  return c.json({ ok: true });
});
