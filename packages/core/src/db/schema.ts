import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["income", "expense", "both"] }).notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  parentId: text("parent_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["checking", "savings", "investment", "cash", "wallet"],
  }).notNull(),
  balance: integer("balance").notNull().default(0), // centavos
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  bankName: text("bank_name"),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const cards = sqliteTable("cards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand", {
    enum: ["visa", "mastercard", "elo", "amex", "hipercard", "other"],
  }).notNull(),
  lastFourDigits: text("last_four_digits"),
  creditLimit: integer("credit_limit").notNull().default(0), // centavos
  billingDay: integer("billing_day").notNull(),
  dueDay: integer("due_day").notNull(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  color: text("color").notNull(),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  description: text("description").notNull(),
  amount: integer("amount").notNull(), // centavos
  type: text("type", { enum: ["income", "expense", "transfer"] }).notNull(),
  status: text("status", {
    enum: ["confirmed", "pending", "cancelled"],
  })
    .notNull()
    .default("confirmed"),
  date: text("date").notNull(), // YYYY-MM-DD
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  cardId: text("card_id").references(() => cards.id),
  // campos de parcelamento
  installmentTotal: integer("installment_total"),
  installmentCurrent: integer("installment_current"),
  installmentGroupId: text("installment_group_id"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  targetAmount: integer("target_amount").notNull(), // centavos
  currentAmount: integer("current_amount").notNull().default(0), // centavos
  deadline: text("deadline"), // YYYY-MM-DD
  status: text("status", { enum: ["active", "completed", "cancelled"] })
    .notNull()
    .default("active"),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const investments = sqliteTable("investments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["stock", "fund", "crypto", "fixed_income", "real_estate", "other"],
  }).notNull(),
  ticker: text("ticker"),
  quantity: real("quantity").notNull(), // usa real para suportar frações
  purchasePrice: integer("purchase_price").notNull(), // centavos
  currentPrice: integer("current_price").notNull(), // centavos
  purchaseDate: text("purchase_date").notNull(), // YYYY-MM-DD
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Schema = {
  categories: typeof categories;
  accounts: typeof accounts;
  cards: typeof cards;
  transactions: typeof transactions;
  goals: typeof goals;
  investments: typeof investments;
};
