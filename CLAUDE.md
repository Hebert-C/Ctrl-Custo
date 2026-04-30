# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ctrl-Custo** is a personal finance app (Brazilian Portuguese) with a web version (React) and a mobile version (Expo). Business logic, the SQLite database, and TypeScript types live in a shared `packages/core` package.

## Commands

```bash
# Install dependencies
pnpm install

# Run web dev server
pnpm dev:web

# Run mobile dev server (Expo)
pnpm dev:mobile

# Run all unit tests (packages/core only)
pnpm test

# Watch mode for tests
pnpm --filter @ctrl-custo/core test:watch

# Run a single test file
pnpm --filter @ctrl-custo/core vitest run src/__tests__/TransactionService.test.ts

# Type-check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Format code
pnpm format
```

## Architecture

### Monorepo layout

```
apps/web/        — React 19 + Vite + TailwindCSS (browser app)
apps/mobile/     — Expo SDK 54 + Expo Router v5
packages/core/   — Business logic, Drizzle schema, services, types
packages/ui/     — Shared design system (React Native primitives + Victory Native charts)
packages/config/ — Shared tsconfig bases (base, react, react-native)
```

Build orchestration: **Turborepo** with `pnpm workspaces`. `turbo.json` defines `build → test → lint/typecheck` pipeline with `^build` dependencies.

### packages/core

The entire data layer. All services are factory functions that receive a `CoreDatabase` instance:

- `createDatabase(config?)` — initialises sql.js WASM, runs inline SQL migrations, returns a Drizzle instance
- Services: `createTransactionService`, `createCategoryService`, `createAccountService`, `createReportService`, `createExportService`
- `CoreDatabase` type = `BaseSQLiteDatabase<'sync', any, typeof schema>`

**Schema tables:** `categories`, `accounts`, `cards`, `transactions`, `goals`, `investments`. All defined in `packages/core/src/db/schema.ts` via Drizzle.

**Critical convention:** All monetary amounts are stored as **integers in centavos (BRL cents)** — never floats. Both `apps/web` and `apps/mobile` have a `src/hooks/useCurrency.ts` that exports `formatCurrency(cents)` and `parseCurrencyInput(raw)` with identical APIs.

**IDs** use `crypto.randomUUID()` (Web Crypto API). `packages/core/tsconfig.json` includes `"lib": ["ES2022", "DOM"]` to expose the global `crypto`.

**Vitest tests** in `packages/core/src/__tests__/` run against a real in-memory sql.js database (no mocks). Each test creates a fresh db in `beforeEach`.

### apps/web — database singleton

`apps/web/src/db/index.ts` wraps `createDatabase` as a **lazy singleton** via `getDatabase()`. It passes `locateFile: (file) => '/${file}'` so sql.js finds the WASM file at `apps/web/public/sql-wasm.wasm`. The WASM file must be present in `public/` — it is copied there at setup, not bundled by Vite.

**Vite config** adds CORS headers (`Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`) required by sql.js for `SharedArrayBuffer`, aliases `react-native` → `react-native-web`, and sets `global = globalThis` as a shim.

### apps/web — Zustand stores

Every store (`useTransactionStore`, `useAccountStore`, `useCategoryStore`, `useCardStore`, `useGoalStore`) takes the `CoreDatabase` as a parameter on each action — there is no global DB reference inside the store itself. Pages call `getDatabase()` and pass the result to store actions. `useThemeStore` is the exception: it uses `zustand/middleware persist` and reads `localStorage`.

### apps/web — routing

React Router v6, declared in `App.tsx`. Routes: `/dashboard`, `/transactions`, `/cards`, `/goals`, `/reports`, `/settings`. Default redirect `/` → `/dashboard`.

### apps/mobile — database

`apps/mobile/src/db/index.ts` exposes a **synchronous** `getDatabase()` using `expo-sqlite.openDatabaseSync("ctrl-custo.db")` wrapped with Drizzle. Returns the same `CoreDatabase` type — all core services work with it without modification. Data persists on-device (SQLite file).

### apps/mobile — routing & screens

Expo Router v5 with **file-based routing** under `app/`:

```
app/_layout.tsx         — Root layout (GestureHandlerRootView, StatusBar, Stack)
app/(tabs)/_layout.tsx  — Tab bar with 5 screens
app/(tabs)/index.tsx    — Dashboard (balance, monthly summary, recent transactions)
app/(tabs)/transactions.tsx
app/(tabs)/cards.tsx
app/(tabs)/goals.tsx
app/(tabs)/settings.tsx
```

### apps/mobile — stores

Same store pattern as web (all accept `db: CoreDatabase`). Additional stores unique to mobile:

- `useThemeStore` — persists via AsyncStorage instead of localStorage
- `useUiStore` — manages "hide mode" (obscures sensitive values on screen) and biometry/PIN state (expo-local-authentication)

Metro bundler (`metro.config.js`) resolves the monorepo via `watchFolders` at the workspace root and stubs sql.js to an empty module (`{ type: "empty" }`) since mobile uses expo-sqlite.

### packages/ui

Shared design system built on React Native primitives (works on web via `react-native-web`).

**Components:** `Button`, `Input`, `Card`, `Badge`, `Modal`, `CurrencyInput`

**Charts** (Victory Native): `BarChart`, `LineChart`, `PieChart`

**Design tokens:**

- `tokens/colors.ts` — light/dark palettes, semantic colors (income = green, expense = red, transfer = blue, investment = purple, pending = yellow), 10 fixed category colors, surface/text/state tokens
- `tokens/typography.ts` — font sizes, weights, line heights
- `tokens/spacing.ts` — space scale

## Key constraints

- `react-hooks/exhaustive-deps` warnings in web pages are **intentional** — Zustand store references are stable so omitting them from deps is safe.
- The web database is **in-memory only** (no persistence across page reloads). localStorage persistence is stubbed but not implemented.
- ESLint 8 + Prettier 3 run via `lint-staged` on pre-commit (Husky 9). Do not bypass with `--no-verify`.
- Prettier config: double quotes, 100-char line width, semi, LF line endings, ES5 trailing commas.
