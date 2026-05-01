import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index";
import { accounts } from "../db/schema";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const accountBody = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["checking", "savings", "investment", "cash", "wallet"]),
  balance: z.number().int().default(0),
  color: z.string().min(1).max(20),
  icon: z.string().min(1).max(50),
  bankName: z.string().max(100).optional(),
  isArchived: z.boolean().optional(),
});

export const accountsRouter = new Hono<AuthEnv>();

accountsRouter.use(requireAuth);

accountsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const rows = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.isArchived, false)));
  return c.json(rows);
});

accountsRouter.post("/", zValidator("json", accountBody), async (c) => {
  const userId = c.get("userId");
  const body = c.req.valid("json");
  const [row] = await db
    .insert(accounts)
    .values({ ...body, userId })
    .returning();
  return c.json(row, 201);
});

accountsRouter.put("/:id", zValidator("json", accountBody.partial()), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const [row] = await db
    .update(accounts)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

accountsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const [row] = await db
    .delete(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .returning({ id: accounts.id });
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});
