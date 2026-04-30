import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const categoryTypeEnum = pgEnum("category_type", ["income", "expense", "both"]);
export const accountTypeEnum = pgEnum("account_type", [
  "checking",
  "savings",
  "investment",
  "cash",
  "wallet",
]);
export const cardBrandEnum = pgEnum("card_brand", [
  "visa",
  "mastercard",
  "elo",
  "amex",
  "hipercard",
  "other",
]);
export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense", "transfer"]);
export const transactionStatusEnum = pgEnum("transaction_status", [
  "confirmed",
  "pending",
  "cancelled",
]);
export const goalStatusEnum = pgEnum("goal_status", ["active", "completed", "cancelled"]);
export const investmentTypeEnum = pgEnum("investment_type", [
  "stock",
  "fund",
  "crypto",
  "fixed_income",
  "real_estate",
  "other",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: categoryTypeEnum("type").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull(),
  balance: integer("balance").notNull().default(0),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  bankName: text("bank_name"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cards = pgTable("cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  brand: cardBrandEnum("brand").notNull(),
  lastFourDigits: text("last_four_digits"),
  creditLimit: integer("credit_limit").notNull().default(0),
  billingDay: integer("billing_day").notNull(),
  dueDay: integer("due_day").notNull(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  color: text("color").notNull(),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").notNull().default("confirmed"),
  date: text("date").notNull(), // YYYY-MM-DD
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  cardId: uuid("card_id").references(() => cards.id),
  installmentTotal: integer("installment_total"),
  installmentCurrent: integer("installment_current"),
  installmentGroupId: uuid("installment_group_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetAmount: integer("target_amount").notNull(),
  currentAmount: integer("current_amount").notNull().default(0),
  deadline: text("deadline"),
  status: goalStatusEnum("status").notNull().default("active"),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const investments = pgTable("investments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: investmentTypeEnum("type").notNull(),
  ticker: text("ticker"),
  quantity: doublePrecision("quantity").notNull(),
  purchasePrice: integer("purchase_price").notNull(),
  currentPrice: integer("current_price").notNull(),
  purchaseDate: text("purchase_date").notNull(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
