import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index";
import { categories } from "../db/schema";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const categoryBody = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["income", "expense", "both"]),
  color: z.string().min(1).max(20),
  icon: z.string().min(1).max(50),
  parentId: z.string().uuid().optional(),
});

export const categoriesRouter = new Hono<AuthEnv>();

categoriesRouter.use(requireAuth);

categoriesRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const rows = await db.select().from(categories).where(eq(categories.userId, userId));
  return c.json(rows);
});

categoriesRouter.post("/", zValidator("json", categoryBody), async (c) => {
  const userId = c.get("userId");
  const body = c.req.valid("json");
  const [row] = await db
    .insert(categories)
    .values({ ...body, userId })
    .returning();
  return c.json(row, 201);
});

categoriesRouter.put("/:id", zValidator("json", categoryBody.partial()), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const [row] = await db
    .update(categories)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

categoriesRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const [row] = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning({ id: categories.id });
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});
