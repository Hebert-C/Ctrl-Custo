import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index";
import { transactions, accounts, cards, categories } from "../db/schema";
import { requireAuth, type AuthEnv } from "../middleware/auth";

// RN-TX-08: valida que a data existe de fato (ex: 2024-02-30 é inválida)
function isValidDate(d: string): boolean {
  const dt = new Date(d + "T00:00:00Z");
  return !isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === d;
}

const transactionBodyBase = z.object({
  // RN-TX-09: trim antes de validar — rejeita descrições só com espaços
  description: z.string().trim().min(1).max(255),
  amount: z.number().int().positive(),
  type: z.enum(["income", "expense", "transfer"]),
  status: z.enum(["confirmed", "pending", "cancelled"]).default("confirmed"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .refine(isValidDate, "Data inválida."),
  categoryId: z.string().uuid(),
  accountId: z.string().uuid(),
  destinationAccountId: z.string().uuid().optional(),
  cardId: z.string().uuid().optional(),
  // RN-TX-12: máximo de 24 parcelas
  installmentTotal: z.number().int().positive().max(24).optional(),
  installmentCurrent: z.number().int().positive().optional(),
  installmentGroupId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});

const transactionBody = transactionBodyBase
  .refine((d) => d.type !== "transfer" || !!d.destinationAccountId, {
    message: "destinationAccountId é obrigatório para transferências.",
    path: ["destinationAccountId"],
  })
  .refine((d) => d.type !== "transfer" || d.accountId !== d.destinationAccountId, {
    message: "Transferência não pode ser para a mesma conta.",
    path: ["destinationAccountId"],
  })
  // RN-TX-13: parcelamento só em despesa com cartão
  .refine((d) => !d.installmentTotal || (d.type === "expense" && !!d.cardId), {
    message: "Parcelamento só é permitido em despesas com cartão.",
    path: ["installmentTotal"],
  });

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

transactionsRouter.post(
  "/",
  zValidator("json", transactionBody, (result, c) => {
    if (!result.success) {
      return c.json({ error: result.error.issues[0]?.message ?? "Dados inválidos." }, 400);
    }
  }),
  async (c) => {
    const userId = c.get("userId");
    const body = c.req.valid("json");

    // RN-TX-10 + RN-ACC-05: ownership e isArchived das contas
    const accountIds = [body.accountId];
    if (body.destinationAccountId) accountIds.push(body.destinationAccountId);
    for (const accId of accountIds) {
      const [acct] = await db
        .select({ isArchived: accounts.isArchived })
        .from(accounts)
        .where(and(eq(accounts.id, accId), eq(accounts.userId, userId)))
        .limit(1);
      if (!acct) return c.json({ error: "Conta não encontrada." }, 404);
      if (acct.isArchived) return c.json({ code: "ACCOUNT_ARCHIVED" }, 422);
    }

    // RN-TX-10: ownership de categoryId
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, body.categoryId), eq(categories.userId, userId)))
      .limit(1);
    if (!cat) return c.json({ error: "Categoria não encontrada." }, 404);

    // RN-TX-10: ownership de cardId
    if (body.cardId) {
      const [card] = await db
        .select({ id: cards.id })
        .from(cards)
        .where(and(eq(cards.id, body.cardId), eq(cards.userId, userId)))
        .limit(1);
      if (!card) return c.json({ error: "Cartão não encontrado." }, 404);
    }

    // RN-ACC-06: saldo insuficiente bloqueia débito confirmado
    if (body.status === "confirmed" && (body.type === "expense" || body.type === "transfer")) {
      const [acct] = await db
        .select({ balance: accounts.balance })
        .from(accounts)
        .where(and(eq(accounts.id, body.accountId), eq(accounts.userId, userId)))
        .limit(1);
      if (!acct || acct.balance < body.amount) {
        return c.json({ code: "INSUFFICIENT_BALANCE" }, 422);
      }
    }

    // RN-CARD-03: limite do cartão não pode ser excedido no mês corrente
    if (body.cardId && body.type === "expense" && body.status === "confirmed") {
      const [cardRow] = await db
        .select({ creditLimit: cards.creditLimit })
        .from(cards)
        .where(and(eq(cards.id, body.cardId), eq(cards.userId, userId)))
        .limit(1);

      if (cardRow) {
        const yearMonth = body.date.slice(0, 7);
        const [spent] = await db
          .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
          .from(transactions)
          .where(
            and(
              eq(transactions.cardId, body.cardId),
              eq(transactions.status, "confirmed"),
              eq(transactions.type, "expense"),
              sql`LEFT(${transactions.date}, 7) = ${yearMonth}`
            )
          );

        const totalSpent = Number(spent?.total ?? 0);
        const availableLimit = cardRow.creditLimit - totalSpent;
        if (totalSpent + body.amount > cardRow.creditLimit) {
          return c.json({ code: "CARD_LIMIT_EXCEEDED", availableLimit }, 422);
        }
      }
    }

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
  }
);

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

  // RN-TX-10: ownership checks no PUT para campos opcionalmente atualizados
  if (body.accountId && body.accountId !== existing.accountId) {
    const [acct] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, body.accountId), eq(accounts.userId, userId)))
      .limit(1);
    if (!acct) return c.json({ error: "Conta não encontrada." }, 404);
  }

  if (body.categoryId && body.categoryId !== existing.categoryId) {
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, body.categoryId), eq(categories.userId, userId)))
      .limit(1);
    if (!cat) return c.json({ error: "Categoria não encontrada." }, 404);
  }

  if (body.cardId && body.cardId !== existing.cardId) {
    const [card] = await db
      .select({ id: cards.id })
      .from(cards)
      .where(and(eq(cards.id, body.cardId), eq(cards.userId, userId)))
      .limit(1);
    if (!card) return c.json({ error: "Cartão não encontrado." }, 404);
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
