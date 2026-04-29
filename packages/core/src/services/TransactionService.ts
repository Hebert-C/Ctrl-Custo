import { eq, and, gte, lte, like, desc } from "drizzle-orm";
import type { CoreDatabase } from "../db/index";
import { transactions } from "../db/schema";
import type { NewTransaction, Transaction, TransactionFilters } from "../types/transaction";

export function createTransactionService(db: CoreDatabase) {
  function rowToTransaction(row: typeof transactions.$inferSelect): Transaction {
    return {
      id: row.id,
      description: row.description,
      amount: row.amount,
      type: row.type,
      status: row.status,
      date: row.date,
      categoryId: row.categoryId,
      accountId: row.accountId,
      cardId: row.cardId ?? undefined,
      installment:
        row.installmentTotal != null &&
        row.installmentCurrent != null &&
        row.installmentGroupId != null
          ? {
              total: row.installmentTotal,
              current: row.installmentCurrent,
              groupId: row.installmentGroupId,
            }
          : undefined,
      notes: row.notes ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  return {
    async create(data: NewTransaction): Promise<Transaction> {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();

      await db.insert(transactions).values({
        id,
        description: data.description,
        amount: data.amount,
        type: data.type,
        status: data.status,
        date: data.date,
        categoryId: data.categoryId,
        accountId: data.accountId,
        cardId: data.cardId,
        installmentTotal: data.installment?.total,
        installmentCurrent: data.installment?.current,
        installmentGroupId: data.installment?.groupId,
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
      });

      const [row] = await db.select().from(transactions).where(eq(transactions.id, id));

      return rowToTransaction(row);
    },

    async findById(id: string): Promise<Transaction | null> {
      const [row] = await db.select().from(transactions).where(eq(transactions.id, id));

      return row ? rowToTransaction(row) : null;
    },

    async findAll(filters: TransactionFilters = {}): Promise<Transaction[]> {
      const conditions = [];

      if (filters.startDate) conditions.push(gte(transactions.date, filters.startDate));
      if (filters.endDate) conditions.push(lte(transactions.date, filters.endDate));
      if (filters.type) conditions.push(eq(transactions.type, filters.type));
      if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
      if (filters.accountId) conditions.push(eq(transactions.accountId, filters.accountId));
      if (filters.cardId) conditions.push(eq(transactions.cardId, filters.cardId));
      if (filters.status) conditions.push(eq(transactions.status, filters.status));
      if (filters.search) conditions.push(like(transactions.description, `%${filters.search}%`));

      const rows = await db
        .select()
        .from(transactions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(transactions.date));

      return rows.map(rowToTransaction);
    },

    async update(id: string, data: Partial<NewTransaction>): Promise<Transaction | null> {
      const now = new Date().toISOString();

      await db
        .update(transactions)
        .set({
          ...(data.description !== undefined && { description: data.description }),
          ...(data.amount !== undefined && { amount: data.amount }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.date !== undefined && { date: data.date }),
          ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
          ...(data.accountId !== undefined && { accountId: data.accountId }),
          ...(data.cardId !== undefined && { cardId: data.cardId }),
          ...(data.notes !== undefined && { notes: data.notes }),
          updatedAt: now,
        })
        .where(eq(transactions.id, id));

      return this.findById(id);
    },

    async delete(id: string): Promise<boolean> {
      const existing = await this.findById(id);
      if (!existing) return false;
      await db.delete(transactions).where(eq(transactions.id, id));
      return true;
    },

    // Cria múltiplas parcelas de uma só vez
    async createInstallments(
      data: Omit<NewTransaction, "installment">,
      totalInstallments: number
    ): Promise<Transaction[]> {
      const groupId = crypto.randomUUID();
      const amountPerInstallment = Math.round(data.amount / totalInstallments);
      const created: Transaction[] = [];

      const baseDate = new Date(data.date);

      for (let i = 1; i <= totalInstallments; i++) {
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(installmentDate.getMonth() + (i - 1));

        const tx = await this.create({
          ...data,
          amount: amountPerInstallment,
          date: installmentDate.toISOString().split("T")[0],
          installment: {
            total: totalInstallments,
            current: i,
            groupId,
          },
        });
        created.push(tx);
      }

      return created;
    },
  };
}

export type TransactionService = ReturnType<typeof createTransactionService>;
