import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index";
import { investments } from "../db/schema";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const investmentBody = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["stock", "fund", "crypto", "fixed_income", "real_estate", "other"]),
  ticker: z.string().max(20).optional(),
  quantity: z.number().positive(),
  purchasePrice: z.number().int().positive(),
  currentPrice: z.number().int().positive(),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)."),
  accountId: z.string().uuid(),
  notes: z.string().max(1000).optional(),
});

export const investmentsRouter = new Hono<AuthEnv>();

investmentsRouter.use(requireAuth);

investmentsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const rows = await db.select().from(investments).where(eq(investments.userId, userId));
  return c.json(rows);
});

investmentsRouter.post("/", zValidator("json", investmentBody), async (c) => {
  const userId = c.get("userId");
  const body = c.req.valid("json");
  const [row] = await db
    .insert(investments)
    .values({ ...body, userId })
    .returning();
  return c.json(row, 201);
});

investmentsRouter.put("/:id", zValidator("json", investmentBody.partial()), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const [row] = await db
    .update(investments)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(investments.id, id), eq(investments.userId, userId)))
    .returning();
  if (!row) return c.json({ error: "Investimento não encontrado." }, 404);
  return c.json(row);
});

investmentsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const [row] = await db
    .delete(investments)
    .where(and(eq(investments.id, id), eq(investments.userId, userId)))
    .returning({ id: investments.id });
  if (!row) return c.json({ error: "Investimento não encontrado." }, 404);
  return c.json({ ok: true });
});
