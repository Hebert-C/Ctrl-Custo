import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index";
import { goals, transactions, categories, accounts } from "../db/schema";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const goalBody = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().int().positive(),
  currentAmount: z.number().int().min(0).optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z.enum(["active", "completed", "cancelled"]).optional(),
  color: z.string().min(1).max(20),
  icon: z.string().min(1).max(50),
  notes: z.string().max(1000).optional(),
});

const depositBody = z.object({
  amount: z.number().int().positive(),
  accountId: z.string().uuid(),
});

export const goalsRouter = new Hono<AuthEnv>();

goalsRouter.use(requireAuth);

goalsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const rows = await db.select().from(goals).where(eq(goals.userId, userId));
  return c.json(rows);
});

goalsRouter.post("/", zValidator("json", goalBody), async (c) => {
  const userId = c.get("userId");
  const body = c.req.valid("json");
  const [row] = await db
    .insert(goals)
    .values({ ...body, userId })
    .returning();
  return c.json(row, 201);
});

goalsRouter.put("/:id", zValidator("json", goalBody.partial()), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const [row] = await db
    .update(goals)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning();
  if (!row) return c.json({ error: "Meta não encontrada." }, 404);
  return c.json(row);
});

goalsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const refundAccountId = c.req.query("refundAccountId");

  const deposits = await db
    .select({ amount: transactions.amount })
    .from(transactions)
    .where(and(eq(transactions.goalId, id), eq(transactions.userId, userId)));

  if (deposits.length > 0 && !refundAccountId) {
    return c.json({ error: "Escolha uma conta para receber o valor depositado." }, 400);
  }

  const result = await db.transaction(async (trx) => {
    if (deposits.length > 0 && refundAccountId) {
      const total = deposits.reduce((s, d) => s + d.amount, 0);

      await trx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} + ${total}`, updatedAt: new Date() })
        .where(and(eq(accounts.id, refundAccountId), eq(accounts.userId, userId)));

      await trx.delete(transactions).where(eq(transactions.goalId, id));

      // busca ou cria categoria "Metas" para registrar o reembolso
      let [metasCategory] = await trx
        .select()
        .from(categories)
        .where(and(eq(categories.userId, userId), eq(categories.name, "Metas")))
        .limit(1);
      if (!metasCategory) {
        [metasCategory] = await trx
          .insert(categories)
          .values({ userId, name: "Metas", type: "both", color: "#8B5CF6", icon: "🎯" })
          .returning();
      }

      const [goalRow] = await trx
        .select({ name: goals.name })
        .from(goals)
        .where(eq(goals.id, id))
        .limit(1);

      await trx.insert(transactions).values({
        userId,
        description: `Reembolso: ${goalRow?.name ?? "Meta encerrada"}`,
        amount: total,
        type: "income",
        status: "confirmed",
        date: new Date().toISOString().split("T")[0],
        categoryId: metasCategory.id,
        accountId: refundAccountId,
      });
    }

    const [row] = await trx
      .delete(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .returning({ id: goals.id });

    return { row, count: deposits.length };
  });

  if (!result.row) return c.json({ error: "Meta não encontrada." }, 404);
  return c.json({ ok: true, reversedDeposits: result.count });
});

goalsRouter.post("/:id/deposit", zValidator("json", depositBody), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const { amount, accountId } = c.req.valid("json");

  const [account] = await db
    .select({ id: accounts.id, isArchived: accounts.isArchived })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);
  if (!account) return c.json({ error: "Conta não encontrada." }, 404);

  // RN-ACC-05: conta arquivada não pode ser debitada
  if (account.isArchived) return c.json({ code: "ACCOUNT_ARCHIVED" }, 422);

  // RN-GOAL-05: depósito não pode exceder o valor alvo
  const [goalRow] = await db
    .select({ currentAmount: goals.currentAmount, targetAmount: goals.targetAmount })
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .limit(1);
  if (!goalRow) return c.json({ error: "Meta não encontrada." }, 404);
  if (goalRow.currentAmount + amount > goalRow.targetAmount) {
    return c.json({ code: "DEPOSIT_EXCEEDS_TARGET" }, 422);
  }

  let [metasCategory] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.name, "Metas")))
    .limit(1);
  if (!metasCategory) {
    [metasCategory] = await db
      .insert(categories)
      .values({ userId, name: "Metas", type: "expense", color: "#8B5CF6", icon: "🎯" })
      .returning();
  }

  const result = await db.transaction(async (trx) => {
    const [updated] = await trx
      .update(goals)
      .set({ currentAmount: sql`${goals.currentAmount} + ${amount}`, updatedAt: new Date() })
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .returning();
    if (!updated) return null;

    await trx.insert(transactions).values({
      userId,
      description: `Depósito: ${updated.name}`,
      amount,
      type: "expense",
      status: "confirmed",
      date: new Date().toISOString().split("T")[0],
      categoryId: metasCategory.id,
      accountId,
      goalId: id,
    });

    await trx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} - ${amount}`, updatedAt: new Date() })
      .where(eq(accounts.id, accountId));

    if (updated.currentAmount >= updated.targetAmount && updated.status === "active") {
      const [completed] = await trx
        .update(goals)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(goals.id, id))
        .returning();
      return completed ?? updated;
    }

    return updated;
  });

  if (!result) return c.json({ error: "Meta não encontrada." }, 404);
  return c.json(result);
});
