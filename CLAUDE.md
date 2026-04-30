# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ctrl-Custo** is a personal finance app (Brazilian Portuguese) with a web version (React) and a planned mobile version (Expo). Business logic, the SQLite database, and TypeScript types live in a shared `packages/core` package.

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

## On Session Start — Check for Blocking Issue

**Before doing anything else, run this check:**

```bash
test -f .npmrc && echo "OK" || echo "MISSING"
```

If `.npmrc` is **MISSING**, the mobile app has a blocking Metro bundling error. Execute the fix
immediately (no confirmation needed — the plan is fully approved):

1. Create `.npmrc` at the repo root with exactly this content:

   ```
   node-linker=hoisted
   ```

2. Run in PowerShell (user is on Windows):

   ```powershell
   Remove-Item -Recurse -Force node_modules, pnpm-lock.yaml -ErrorAction SilentlyContinue
   pnpm install
   npx expo install --fix
   npx expo-doctor
   ```

3. Clear Metro cache:

   ```powershell
   Remove-Item -Recurse -Force $env:TEMP\metro-cache, $env:TEMP\haste-map-* -ErrorAction SilentlyContinue
   ```

4. Show the `expo-doctor` output and explain any remaining warnings.

**Constraints for this fix:** do NOT edit any application code (components, screens, logic),
do NOT run `expo prebuild`, do NOT use `--force` or `--legacy-peer-deps`.

If `.npmrc` already exists with `node-linker=hoisted`, the fix has been applied — proceed normally.

---

## Architecture

### Monorepo layout

```
apps/web/      — React 19 + Vite + TailwindCSS (browser app)
apps/mobile/   — Expo SDK 54 + Expo Router v5 (Phase 4, structure complete)
packages/core/ — Business logic, Drizzle schema, services, types
packages/ui/   — Shared design system (React Native primitives + Victory Native charts)
packages/config/ — Shared tsconfig bases (base, react, react-native)
```

Build orchestration: **Turborepo** with `pnpm workspaces`. `turbo.json` defines `build → test → lint/typecheck` pipeline with `^build` dependencies.

### packages/core

The entire data layer. All services are factory functions that receive a `CoreDatabase` instance:

- `createDatabase(config?)` — initialises sql.js WASM, runs inline SQL migrations, returns a Drizzle instance
- Services: `createTransactionService`, `createCategoryService`, `createAccountService`, `createReportService`, `createExportService`
- `CoreDatabase` type = `Awaited<ReturnType<typeof createDatabase>>`

**Critical convention:** All monetary amounts are stored as **integers in centavos (BRL cents)** — never floats. Convert with `formatCurrency(cents)` / `parseCurrencyInput(raw)` from `apps/web/src/hooks/useCurrency.ts`.

**IDs** use `crypto.randomUUID()` (Web Crypto API, available in browser and Node 18+). `packages/core/tsconfig.json` includes `"lib": ["ES2022", "DOM"]` to expose the global `crypto`.

### apps/web — database singleton

`apps/web/src/db/index.ts` wraps `createDatabase` as a **lazy singleton** via `getDatabase()`. It passes `locateFile: (file) => '/${file}'` so sql.js finds the WASM file at `apps/web/public/sql-wasm.wasm`. The WASM file must be present in `public/` — it is copied there at setup, not bundled by Vite.

### apps/web — Zustand stores

Every store (`useTransactionStore`, `useAccountStore`, etc.) takes the `CoreDatabase` as a parameter on each action — there is no global DB reference inside the store itself. Pages call `getDatabase()` and pass the result to store actions. `useThemeStore` is the exception: it uses `zustand/middleware persist` and reads `localStorage`.

### apps/web — routing

React Router v6, declared in `App.tsx`. Routes: `/dashboard`, `/transactions`, `/cards`, `/goals`, `/reports`, `/settings`. Default redirect `/` → `/dashboard`.

### packages/ui

Uses React Native primitives (works on web via `react-native-web`). Charts use Victory Native. Design tokens are in `tokens/colors.ts`, `tokens/typography.ts`, `tokens/spacing.ts`.

## Key constraints

- `react-hooks/exhaustive-deps` warnings in web pages are **intentional** — Zustand store references are stable so omitting them from deps is safe.
- The web database is **in-memory only** (no persistence across page reloads). localStorage persistence is stubbed but not implemented.
- ESLint 8 + Prettier 3 run via `lint-staged` on pre-commit (Husky 9). Do not bypass with `--no-verify`.
- Vitest tests are in `packages/core/src/__tests__/` and test services against a real in-memory sql.js database.
