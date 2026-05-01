import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index";
import { goals } from "../db/schema";
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
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

goalsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const [row] = await db
    .delete(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning({ id: goals.id });
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

goalsRouter.post("/:id/deposit", zValidator("json", depositBody), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const { amount } = c.req.valid("json");

  const [row] = await db
    .update(goals)
    .set({ currentAmount: sql`${goals.currentAmount} + ${amount}`, updatedAt: new Date() })
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);

  if (row.currentAmount >= row.targetAmount && row.status === "active") {
    const [completed] = await db
      .update(goals)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(goals.id, id))
      .returning();
    return c.json(completed);
  }

  return c.json(row);
});
