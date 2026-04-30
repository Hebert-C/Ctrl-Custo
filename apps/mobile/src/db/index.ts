import { drizzle } from "drizzle-orm/expo-sqlite";
import * as SQLite from "expo-sqlite";
import { categories, accounts, cards, transactions, goals, investments } from "@ctrl-custo/core";
import type { CoreDatabase } from "@ctrl-custo/core";

const schema = { categories, accounts, cards, transactions, goals, investments };

let instance: CoreDatabase | null = null;

function runMigrations(client: SQLite.SQLiteDatabase): void {
  client.execSync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income','expense','both')),
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      parent_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('checking','savings','investment','cash','wallet')),
      balance INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      bank_name TEXT,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT NOT NULL CHECK(brand IN ('visa','mastercard','elo','amex','hipercard','other')),
      last_four_digits TEXT,
      credit_limit INTEGER NOT NULL DEFAULT 0,
      billing_day INTEGER NOT NULL,
      due_day INTEGER NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      color TEXT NOT NULL,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income','expense','transfer')),
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','pending','cancelled')),
      date TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id),
      account_id TEXT NOT NULL REFERENCES accounts(id),
      card_id TEXT REFERENCES cards(id),
      installment_total INTEGER,
      installment_current INTEGER,
      installment_group_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_amount INTEGER NOT NULL,
      current_amount INTEGER NOT NULL DEFAULT 0,
      deadline TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','cancelled')),
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS investments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('stock','fund','crypto','fixed_income','real_estate','other')),
      ticker TEXT,
      quantity REAL NOT NULL,
      purchase_price INTEGER NOT NULL,
      current_price INTEGER NOT NULL,
      purchase_date TEXT NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    PRAGMA foreign_keys = ON;
  `);
}

// Singleton síncrono — abre o banco uma vez e reutiliza
export function getDatabase(): CoreDatabase {
  if (instance) return instance;
  const client = SQLite.openDatabaseSync("ctrl-custo.db");
  runMigrations(client);
  instance = drizzle(client, { schema }) as unknown as CoreDatabase;
  return instance;
}
