import { Hono } from "hono";
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "../db/index";
import { transactions } from "../db/schema";
import { requireAuth, type AuthEnv } from "../middleware/auth";

export const reportsRouter = new Hono<AuthEnv>();

reportsRouter.use(requireAuth);

reportsRouter.get("/summary", async (c) => {
  const userId = c.get("userId");
  const month = c.req.query("month");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return c.json({ error: "Query param 'month' required in format YYYY-MM" }, 400);
  }

  const from = `${month}-01`;
  const to = `${month}-31`;

  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, from),
        lte(transactions.date, to),
        eq(transactions.status, "confirmed")
      )
    );

  let income = 0;
  let expenses = 0;
  const byCategory: Record<string, { categoryId: string; total: number; type: string }> = {};

  for (const tx of rows) {
    if (tx.type === "income") income += tx.amount;
    if (tx.type === "expense") expenses += tx.amount;

    if (!byCategory[tx.categoryId]) {
      byCategory[tx.categoryId] = { categoryId: tx.categoryId, total: 0, type: tx.type };
    }
    byCategory[tx.categoryId].total += tx.amount;
  }

  return c.json({
    month,
    income,
    expenses,
    balance: income - expenses,
    byCategory: Object.values(byCategory),
  });
});
