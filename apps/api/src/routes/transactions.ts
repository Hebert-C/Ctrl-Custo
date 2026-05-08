import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index";
import { transactions, accounts } from "../db/schema";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const transactionBodyBase = z.object({
  description: z.string().min(1).max(255),
  amount: z.number().int().positive(),
  type: z.enum(["income", "expense", "transfer"]),
  status: z.enum(["confirmed", "pending", "cancelled"]).default("confirmed"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  categoryId: z.string().uuid(),
  accountId: z.string().uuid(),
  destinationAccountId: z.string().uuid().optional(),
  cardId: z.string().uuid().optional(),
  installmentTotal: z.number().int().positive().optional(),
  installmentCurrent: z.number().int().positive().optional(),
  installmentGroupId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});

const transactionBody = transactionBodyBase.refine(
  (d) => d.type !== "transfer" || !!d.destinationAccountId,
  {
    message: "destinationAccountId é obrigatório para transferências.",
    path: ["destinationAccountId"],
  }
);

async function applyTransferBalances(
  trx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  type: string,
  amount: number,
  accountId: string,
  destinationAccountId: string | null | undefined,
  userId: string,
  direction: 1 | -1
) {
  if (type === "income" || type === "expense") {
    const delta = (type === "income" ? amount : -amount) * direction;
    await trx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${delta}`, updatedAt: new Date() })
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  } else if (type === "transfer" && destinationAccountId) {
    // débito na origem, crédito no destino
    await trx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${-amount * direction}`, updatedAt: new Date() })
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
    await trx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${amount * direction}`, updatedAt: new Date() })
      .where(and(eq(accounts.id, destinationAccountId), eq(accounts.userId, userId)));
  }
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
      await applyTransferBalances(
        trx,
        body.type,
        body.amount,
        body.accountId,
        body.destinationAccountId,
        userId,
        1
      );
    }
    return inserted;
  });

  return c.json(row, 201);
});

transactionsRouter.put("/:id", zValidator("json", transactionBodyBase.partial()), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);
  if (!existing) return c.json({ error: "Transação não encontrada." }, 404);

  if (body.accountId && body.accountId !== existing.accountId) {
    const [acct] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, body.accountId), eq(accounts.userId, userId)))
      .limit(1);
    if (!acct) return c.json({ error: "Transação não encontrada." }, 404);
  }

  const [row] = await db.transaction(async (trx) => {
    if (existing.status === "confirmed") {
      await applyTransferBalances(
        trx,
        existing.type,
        existing.amount,
        existing.accountId,
        existing.destinationAccountId,
        userId,
        -1
      );
    }

    const merged = { ...existing, ...body };
    if (merged.status === "confirmed") {
      await applyTransferBalances(
        trx,
        merged.type,
        merged.amount,
        merged.accountId,
        merged.destinationAccountId,
        userId,
        1
      );
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
  if (!existing) return c.json({ error: "Transação não encontrada." }, 404);

  await db.transaction(async (trx) => {
    if (existing.status === "confirmed") {
      await applyTransferBalances(
        trx,
        existing.type,
        existing.amount,
        existing.accountId,
        existing.destinationAccountId,
        userId,
        -1
      );
    }
    await trx.delete(transactions).where(eq(transactions.id, id));
  });

  return c.json({ ok: true });
});
