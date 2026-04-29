import { eq, and, sum } from "drizzle-orm";
import type { CoreDatabase } from "../db/index";
import { accounts, transactions } from "../db/schema";
import type { Account, NewAccount } from "../types/account";

export function createAccountService(db: CoreDatabase) {
  function rowToAccount(row: typeof accounts.$inferSelect): Account {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      balance: row.balance,
      color: row.color,
      icon: row.icon,
      bankName: row.bankName ?? undefined,
      isArchived: row.isArchived,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  return {
    async create(data: NewAccount): Promise<Account> {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();

      await db.insert(accounts).values({ id, ...data, createdAt: now, updatedAt: now });

      const [row] = await db.select().from(accounts).where(eq(accounts.id, id));
      return rowToAccount(row);
    },

    async findById(id: string): Promise<Account | null> {
      const [row] = await db.select().from(accounts).where(eq(accounts.id, id));
      return row ? rowToAccount(row) : null;
    },

    async findAll(includeArchived = false): Promise<Account[]> {
      const rows = includeArchived
        ? await db.select().from(accounts)
        : await db.select().from(accounts).where(eq(accounts.isArchived, false));

      return rows.map(rowToAccount);
    },

    async update(id: string, data: Partial<NewAccount>): Promise<Account | null> {
      const now = new Date().toISOString();

      await db
        .update(accounts)
        .set({ ...data, updatedAt: now })
        .where(eq(accounts.id, id));

      return this.findById(id);
    },

    async archive(id: string): Promise<Account | null> {
      return this.update(id, { isArchived: true });
    },

    async delete(id: string): Promise<boolean> {
      const existing = await this.findById(id);
      if (!existing) return false;
      await db.delete(accounts).where(eq(accounts.id, id));
      return true;
    },

    // Calcula o saldo real da conta somando todas as transações confirmadas
    async calculateBalance(accountId: string): Promise<number> {
      const [incomeResult] = await db
        .select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, accountId),
            eq(transactions.type, "income"),
            eq(transactions.status, "confirmed")
          )
        );

      const [expenseResult] = await db
        .select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, accountId),
            eq(transactions.type, "expense"),
            eq(transactions.status, "confirmed")
          )
        );

      const totalIncome = Number(incomeResult?.total ?? 0);
      const totalExpense = Number(expenseResult?.total ?? 0);

      return totalIncome - totalExpense;
    },

    // Retorna o saldo total de todas as contas ativas
    async getTotalBalance(): Promise<number> {
      const activeAccounts = await this.findAll(false);
      let total = 0;

      for (const account of activeAccounts) {
        total += await this.calculateBalance(account.id);
      }

      return total;
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;
