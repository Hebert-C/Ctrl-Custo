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
  const [row] = await db
    .delete(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning({ id: goals.id });
  if (!row) return c.json({ error: "Meta não encontrada." }, 404);
  return c.json({ ok: true });
});

goalsRouter.post("/:id/deposit", zValidator("json", depositBody), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const { amount, accountId } = c.req.valid("json");

  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);
  if (!account) return c.json({ error: "Conta não encontrada." }, 404);

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
