import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "../db/index";
import {
  recurringBills,
  recurringPayments,
  accounts,
  categories,
  transactions,
} from "../db/schema";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const createBillBody = z.object({
  name: z.string().min(1).max(100),
  dueDay: z.number().int().min(1).max(28),
  amountCents: z.number().int().positive().nullable().optional(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
});

const updateBillBody = createBillBody.extend({ isActive: z.boolean().optional() }).partial();

const payBody = z
  .object({
    month: z.string().regex(/^\d{4}-\d{2}$/, "month deve ser YYYY-MM"),
    amountCents: z.number().int().optional(),
  })
  .refine((d) => d.amountCents === undefined || d.amountCents > 0, {
    message: "amountCents deve ser maior que zero.",
    path: ["amountCents"],
  });

export const recurringBillsRouter = new Hono<AuthEnv>();

recurringBillsRouter.use(requireAuth);

// ─── GET /recurring-bills/due ─────────────────────────────────────────────────
// Deve ser registrado antes de /:id para não ser capturado como param.

recurringBillsRouter.get("/due", async (c) => {
  const userId = c.get("userId");
  const today = new Date();
  const todayDay = today.getDate();
  const currentMonth = today.toISOString().slice(0, 7);

  const rows = await db
    .select({
      id: recurringBills.id,
      name: recurringBills.name,
      dueDay: recurringBills.dueDay,
      amountCents: recurringBills.amountCents,
      accountId: recurringBills.accountId,
      categoryId: recurringBills.categoryId,
      isActive: recurringBills.isActive,
      createdAt: recurringBills.createdAt,
      updatedAt: recurringBills.updatedAt,
      status: sql<"upcoming" | "overdue">`
        CASE WHEN ${recurringBills.dueDay} < ${todayDay}
          THEN 'overdue'
          ELSE 'upcoming'
        END
      `,
    })
    .from(recurringBills)
    .leftJoin(
      recurringPayments,
      and(
        eq(recurringPayments.recurringBillId, recurringBills.id),
        eq(recurringPayments.dueDate, currentMonth)
      )
    )
    .where(
      and(
        eq(recurringBills.userId, userId),
        eq(recurringBills.isActive, true),
        isNull(recurringPayments.id)
      )
    );

  return c.json(rows);
});

// ─── GET /recurring-bills ─────────────────────────────────────────────────────

recurringBillsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const rows = await db
    .select()
    .from(recurringBills)
    .where(eq(recurringBills.userId, userId))
    .orderBy(recurringBills.dueDay);
  return c.json(rows);
});

// ─── POST /recurring-bills ────────────────────────────────────────────────────

recurringBillsRouter.post("/", zValidator("json", createBillBody), async (c) => {
  const userId = c.get("userId");
  const body = c.req.valid("json");

  // PAY-04: conta de débito não pode estar arquivada
  const [account] = await db
    .select({ isArchived: accounts.isArchived })
    .from(accounts)
    .where(and(eq(accounts.id, body.accountId), eq(accounts.userId, userId)))
    .limit(1);
  if (!account) return c.json({ error: "Conta não encontrada." }, 404);
  if (account.isArchived) return c.json({ code: "ACCOUNT_ARCHIVED" }, 422);

  // PAY-03: ownership da categoria
  const [cat] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, body.categoryId), eq(categories.userId, userId)))
    .limit(1);
  if (!cat) return c.json({ error: "Categoria não encontrada." }, 404);

  const [row] = await db
    .insert(recurringBills)
    .values({ ...body, userId })
    .returning();
  return c.json(row, 201);
});

// ─── GET /recurring-bills/:id ─────────────────────────────────────────────────

recurringBillsRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(recurringBills)
    .where(and(eq(recurringBills.id, id), eq(recurringBills.userId, userId)))
    .limit(1);
  if (!row) return c.json({ error: "Conta recorrente não encontrada." }, 404);
  return c.json(row);
});

// ─── PUT /recurring-bills/:id ─────────────────────────────────────────────────

recurringBillsRouter.put("/:id", zValidator("json", updateBillBody), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const [existing] = await db
    .select()
    .from(recurringBills)
    .where(and(eq(recurringBills.id, id), eq(recurringBills.userId, userId)))
    .limit(1);
  if (!existing) return c.json({ error: "Conta recorrente não encontrada." }, 404);

  // PAY-04: nova conta de débito não pode estar arquivada
  if (body.accountId && body.accountId !== existing.accountId) {
    const [acct] = await db
      .select({ isArchived: accounts.isArchived })
      .from(accounts)
      .where(and(eq(accounts.id, body.accountId), eq(accounts.userId, userId)))
      .limit(1);
    if (!acct) return c.json({ error: "Conta não encontrada." }, 404);
    if (acct.isArchived) return c.json({ code: "ACCOUNT_ARCHIVED" }, 422);
  }

  const [row] = await db
    .update(recurringBills)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(recurringBills.id, id), eq(recurringBills.userId, userId)))
    .returning();
  return c.json(row);
});

// ─── DELETE /recurring-bills/:id ──────────────────────────────────────────────
// PAY-11: cascata para recurring_payments, transações preservadas (ON DELETE SET NULL).

recurringBillsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const [row] = await db
    .delete(recurringBills)
    .where(and(eq(recurringBills.id, id), eq(recurringBills.userId, userId)))
    .returning({ id: recurringBills.id });
  if (!row) return c.json({ error: "Conta recorrente não encontrada." }, 404);
  return c.body(null, 204);
});

// ─── POST /recurring-bills/:id/pay ───────────────────────────────────────────

recurringBillsRouter.post(
  "/:id/pay",
  zValidator("json", payBody, (result, c) => {
    if (!result.success) {
      return c.json({ error: result.error.issues[0]?.message ?? "Dados inválidos." }, 400);
    }
  }),
  async (c) => {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const [bill] = await db
      .select()
      .from(recurringBills)
      .where(and(eq(recurringBills.id, id), eq(recurringBills.userId, userId)))
      .limit(1);
    if (!bill) return c.json({ error: "Conta recorrente não encontrada." }, 404);

    // PAY-05: conta inativa não pode ser paga
    if (!bill.isActive) return c.json({ code: "BILL_INACTIVE" }, 422);

    // PAY-06: mesmo mês não pode ser pago duas vezes
    const [existingPayment] = await db
      .select({ id: recurringPayments.id })
      .from(recurringPayments)
      .where(
        and(eq(recurringPayments.recurringBillId, id), eq(recurringPayments.dueDate, body.month))
      )
      .limit(1);
    if (existingPayment) return c.json({ code: "ALREADY_PAID" }, 409);

    // PAY-07: determinar valor efetivo do pagamento
    let effectiveAmount: number;
    if (body.amountCents !== undefined) {
      effectiveAmount = body.amountCents; // Zod já validou > 0
    } else if (bill.amountCents !== null && bill.amountCents !== undefined) {
      effectiveAmount = bill.amountCents;
    } else {
      return c.json({ code: "AMOUNT_REQUIRED" }, 400);
    }

    // PAY-08: saldo suficiente (delega lógica de RN-ACC-06)
    const [acct] = await db
      .select({ balance: accounts.balance })
      .from(accounts)
      .where(and(eq(accounts.id, bill.accountId), eq(accounts.userId, userId)))
      .limit(1);
    if (!acct || acct.balance < effectiveAmount) {
      return c.json({ code: "INSUFFICIENT_BALANCE" }, 422);
    }

    // PAY-09: operação atômica — transação + débito + registro de pagamento
    const today = new Date().toISOString().split("T")[0];
    const monthLabel = body.month.replace("-", "/");

    const result = await db.transaction(async (trx) => {
      const [tx] = await trx
        .insert(transactions)
        .values({
          userId,
          description: `${bill.name} — ${monthLabel}`,
          amount: effectiveAmount,
          type: "expense",
          status: "confirmed",
          date: today,
          categoryId: bill.categoryId,
          accountId: bill.accountId,
        })
        .returning();

      await trx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} - ${effectiveAmount}`, updatedAt: new Date() })
        .where(eq(accounts.id, bill.accountId));

      const [payment] = await trx
        .insert(recurringPayments)
        .values({
          recurringBillId: id,
          transactionId: tx.id,
          dueDate: body.month,
          amountCents: effectiveAmount,
        })
        .returning();

      return { transaction: tx, payment };
    });

    return c.json({ transactionId: result.transaction.id, payment: result.payment }, 201);
  }
);
