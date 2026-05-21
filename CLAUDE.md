# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Leitura obrigatória no início de cada sessão

Leia `PROJECT.md` antes de qualquer tarefa. Ele contém:

- Status atual de cada fase do projeto
- Estado da VM Oracle Cloud e pendências de infra
- Log de todas as sessões anteriores (o que foi feito, o que ficou em aberto)
- Próximos passos priorizados

Ao final de cada sessão, atualize a seção **Log de Sessões** do `PROJECT.md` com o que foi feito e o que ficou pendente.

## Oracle Cloud A1.Flex — verificação obrigatória a cada sessão

**Enquanto o app não estiver concluído**, execute este comando via SSH no início de cada sessão (após ler o PROJECT.md) para verificar se a instância A1.Flex já foi criada:

```bash
ssh oracle-ctrl-custos 'tail -20 ~/oci-create-a1.log'
```

**O que observar:**

- Se o log mostrar apenas linhas `"Sem capacidade. Próxima tentativa em 60s..."` → ainda aguardando, nada a fazer.
- Se o log mostrar `"=== SUCESSO! Instância criada: ocid1.instance..."` → A1.Flex criada! Informar o usuário imediatamente com o IP público e os próximos passos:
  1. `sudo systemctl disable --now oci-create-a1` (na VM atual)
  2. Re-executar `deploy/setup.sh` na nova A1.Flex
  3. Transferir dados do PostgreSQL
  4. Atualizar GitHub Secrets com o novo IP

**Remova esta seção do CLAUDE.md quando a migração para A1.Flex estiver concluída.**

## Dependências — consulta obrigatória antes de adicionar ou usar qualquer pacote

**Regra:** Antes de escrever qualquer `import`, `require`, ou especificar uma versão de pacote, consulte esta seção. Nunca assuma versões de cabeça.

### Fonte de verdade para versões compatíveis com Expo SDK 54

```bash
# Versão correta de qualquer expo-* ou pacote nativo para o SDK atual:
cat node_modules/expo/bundledNativeModules.json | grep "nome-do-pacote"
```

**Isso é obrigatório para qualquer pacote nativo móvel.** O erro de usar a versão errada causa re-resolução massiva do lockfile e quebra o CI.

### Inventário de dependências por workspace

#### Root (pnpm.overrides — versões fixas para todo o monorepo)

| Pacote             | Versão fixada |
| ------------------ | ------------- |
| `react`            | `19.2.6`      |
| `react-dom`        | `19.2.6`      |
| `react-native`     | `~0.81.0`     |
| `react-native-svg` | `~15.12.0`    |
| `@types/react`     | `~19.1.4`     |

#### apps/api — Hono + Drizzle + PostgreSQL

| Pacote                | Versão    | Uso                  |
| --------------------- | --------- | -------------------- |
| `hono`                | `^4.6.0`  | Framework HTTP       |
| `@hono/node-server`   | `^1.13.0` | Adapter Node.js      |
| `@hono/zod-validator` | `^0.4.1`  | Validação de body    |
| `drizzle-orm`         | `^0.41.0` | ORM                  |
| `drizzle-kit`         | `^0.30.0` | Migrations (dev)     |
| `postgres`            | `^3.4.5`  | Driver PostgreSQL    |
| `zod`                 | `^3.23.8` | Schemas de validação |
| `argon2`              | `^0.41.1` | Hash de senhas       |
| `nodemailer`          | `^8.0.7`  | Envio de e-mail      |
| `tsx`                 | `^4.19.0` | Runtime TS (dev)     |
| `vitest`              | `^3.2.4`  | Testes de integração |

#### apps/web — React + Vite + TailwindCSS

| Pacote                | Versão     | Uso             |
| --------------------- | ---------- | --------------- |
| `react` / `react-dom` | `19.2.6`   | UI              |
| `react-router-dom`    | `^6.28.0`  | Roteamento      |
| `zustand`             | `^5.0.0`   | Estado global   |
| `react-native-web`    | `^0.19.13` | Compat RN → web |
| `react-native-svg`    | `~15.12.1` | SVG             |
| `xlsx`                | `^0.18.5`  | Export Excel    |
| `vite`                | `^5.3.0`   | Build           |
| `tailwindcss`         | `^3.4.4`   | Estilos         |
| `@tauri-apps/cli`     | `^2.11.0`  | Desktop (dev)   |
| `@playwright/test`    | `^1.59.1`  | E2E (dev)       |

#### apps/mobile — Expo SDK 54

| Pacote                                      | Versão     | Uso                     |
| ------------------------------------------- | ---------- | ----------------------- |
| `expo`                                      | `~54.0.0`  | SDK base                |
| `expo-router`                               | `~6.0.23`  | Roteamento file-based   |
| `expo-constants`                            | `~18.0.13` | Constantes nativas      |
| `expo-font`                                 | `~14.0.11` | Fontes                  |
| `expo-linking`                              | `~8.0.11`  | Deep links              |
| `expo-file-system`                          | `~18.0.12` | Sistema de arquivos     |
| `expo-secure-store`                         | `~15.0.8`  | Token JWT (SecureStore) |
| `expo-sharing`                              | `~13.0.1`  | Compartilhamento nativo |
| `expo-status-bar`                           | `~3.0.9`   | Status bar              |
| `expo-system-ui`                            | `~6.0.9`   | Cor do sistema          |
| `expo-local-authentication`                 | `~17.0.8`  | Biometria/PIN           |
| `expo-notifications`                        | `~0.32.17` | Notificações locais     |
| `@expo/metro-runtime`                       | `~6.1.2`   | Metro                   |
| `@expo/vector-icons`                        | `^15.1.1`  | Ionicons etc.           |
| `@react-native-async-storage/async-storage` | `~2.2.0`   | Persistência            |
| `react-native`                              | `~0.81.5`  | Core RN                 |
| `react-native-gesture-handler`              | `~2.28.0`  | Gestos                  |
| `react-native-reanimated`                   | `~4.1.7`   | Animações               |
| `react-native-safe-area-context`            | `~5.6.2`   | Safe area               |
| `react-native-screens`                      | `~4.16.0`  | Screens nativas         |
| `react-native-svg`                          | `~15.12.1` | SVG                     |
| `zustand`                                   | `^5.0.0`   | Estado global           |
| `xlsx`                                      | `^0.18.5`  | Export                  |
| `jest-expo`                                 | `~54.0.0`  | Testes (dev)            |

#### packages/core — Lógica de negócio compartilhada

| Pacote        | Versão    | Uso               |
| ------------- | --------- | ----------------- |
| `drizzle-orm` | `^0.41.0` | Schema + queries  |
| `sql.js`      | `^1.12.0` | SQLite WASM (web) |
| `vitest`      | `^3.0.0`  | Testes unitários  |

#### packages/ui — Design system

| Pacote           | Versão    | Uso                                      |
| ---------------- | --------- | ---------------------------------------- |
| `victory-native` | `^36.9.2` | Gráficos (BarChart, LineChart, PieChart) |

### Componentes do packages/ui disponíveis

```ts
import { Button, Input, Card, Badge, Modal, CurrencyInput } from "@ctrl-custo/ui";
import { BarChart, LineChart, PieChart } from "@ctrl-custo/ui";
import { lightColors, darkColors } from "@ctrl-custo/ui";
import type { Colors } from "@ctrl-custo/ui";
// Tokens:
import { colors, typography, spacing } from "@ctrl-custo/ui";
```

### Regras obrigatórias ao adicionar dependências

1. **Pacote nativo Expo:** SEMPRE verificar `node_modules/expo/bundledNativeModules.json` primeiro. Usar a versão exata listada ali.
2. **Novo pacote qualquer:** verificar se já existe algo equivalente no inventário acima antes de adicionar.
3. **Nunca especificar versão de pacote sem verificar** — sempre consultar o `package.json` do workspace alvo ou o `bundledNativeModules.json`.
4. **Depois de `pnpm install`:** verificar se `Packages: +N -M` tem remoções grandes (>20). Se tiver, algo está errado — não commitar o lockfile antes de investigar.
5. **CI usa `--frozen-lockfile`:** o `pnpm-lock.yaml` commitado é o que o CI usa. Nunca commitar um lockfile quebrado.
6. **Novo pacote adicionado:** atualizar obrigatoriamente a tabela do workspace correspondente neste inventário com nome, versão e uso.
7. **Versão de pacote alterada:** atualizar obrigatoriamente a versão na tabela do inventário no mesmo commit da alteração do `package.json`.

---

## Regras de Negócio — obrigatório antes de implementar

Antes de implementar qualquer feature nova ou corrigir lógica de negócio, leia `BUSINESS_RULES.md`. Ele contém:

- Todas as RNs documentadas por domínio (Auth, Accounts, Cards, Categories, Transactions, Goals, Investments, Reports)
- Status de cada regra (✅ implementada · ⚠️ parcial · ❌ ausente)
- Template para documentar RNs de novas features

**Fluxo obrigatório para qualquer nova feature:**

1. Escrever as RNs no `BUSINESS_RULES.md` (seção do domínio afetado)
2. Revisar se alguma RN existente é impactada
3. Só então iniciar a implementação
4. Ao concluir, marcar as RNs implementadas com ✅

## Paridade Web ↔ Mobile — regra obrigatória

Web e mobile são **espelhos**. Toda feature, rota ou comportamento ativo em um lado deve existir no outro.

- Ao implementar algo novo no web → implementar o equivalente no mobile no mesmo PR/sessão.
- Ao implementar algo novo no mobile → implementar o equivalente no web no mesmo PR/sessão.
- Antes de marcar uma tarefa como concluída, verificar se a paridade foi mantida.

**Exceções permitidas:** stores exclusivos do mobile (`useUiStore`, `useThemeStore` com AsyncStorage), funcionalidades nativas sem equivalente web (biometria, notificações push, compartilhamento de arquivo).

## Deploy — regras de CI/CD

- **Deploy da API e do Web disparam automaticamente** via GitHub Actions a cada push em `main`. Nunca usar `gh workflow run` neles — causaria double-deploy.
- **EAS Build** (APK Android) deve ser disparado manualmente pelo usuário quando necessário — não há trigger automático de APK.
- Migrations PostgreSQL são aplicadas automaticamente pelo CI (`deploy.sh → db:migrate`) — nunca rodar `db:migrate` manualmente em produção sem tunnel SSH ativo.

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

# Run API dev server
pnpm dev:api

# Run all unit tests (packages/core only)
pnpm test

# Run API integration tests (requer .env.test com DATABASE_URL apontando para banco de teste)
pnpm --filter @ctrl-custo/api test

# Watch mode para testes (core)
pnpm --filter @ctrl-custo/core test:watch

# Watch mode para testes (api)
pnpm --filter @ctrl-custo/api test:watch

# Run a single test file (core)
pnpm --filter @ctrl-custo/core vitest run src/__tests__/TransactionService.test.ts

# Run a single test file (api)
pnpm --filter @ctrl-custo/api vitest run src/__tests__/rn-pay-bills.test.ts

# Aplicar migrations (requer tunnel SSH ativo se apontar para produção)
pnpm --filter @ctrl-custo/api db:migrate

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

Schema Drizzle compartilhado e tipos TypeScript. Hoje web e mobile consomem a API REST (`apps/api`) — o `packages/core` não é mais o data layer principal, mas continua sendo a fonte de verdade para schema e tipos.

- `CoreDatabase` type = `BaseSQLiteDatabase<'sync', any, typeof schema>`
- Serviços de conveniência (usados nos testes): `createTransactionService`, `createCategoryService`, `createAccountService`, `createReportService`, `createExportService`

**Schema tables** (definidas em `packages/core/src/db/schema.ts` via Drizzle): `categories`, `accounts`, `cards`, `transactions`, `goals`, `investments`. As tabelas `recurringBills` e `recurringPayments` ficam em `apps/api/src/db/schema.ts` (schema PostgreSQL separado).

**IDs** use `crypto.randomUUID()` (Web Crypto API). `packages/core/tsconfig.json` includes `"lib": ["ES2022", "DOM"]` to expose the global `crypto`.

**Vitest tests** in `packages/core/src/__tests__/` run against a real in-memory sql.js database (no mocks). Each test creates a fresh db in `beforeEach`.

### apps/web — database singleton

`apps/web/src/db/index.ts` wraps `createDatabase` as a **lazy singleton** via `getDatabase()`. It passes `locateFile: (file) => '/${file}'` so sql.js finds the WASM file at `apps/web/public/sql-wasm.wasm`. The WASM file must be present in `public/` — it is copied there at setup, not bundled by Vite.

**Vite config** adds CORS headers (`Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`) required by sql.js for `SharedArrayBuffer`, aliases `react-native` → `react-native-web`, and sets `global = globalThis` as a shim.

### apps/web — Zustand stores

Stores: `useTransactionStore`, `useAccountStore`, `useCategoryStore`, `useCardStore`, `useGoalStore`, `useRecurringBillStore`, `useInvestmentStore`. `useThemeStore` usa `zustand/middleware persist` com `localStorage`.

### apps/web — routing

React Router v6, declared in `App.tsx`. Routes: `/dashboard`, `/transactions`, `/cards`, `/goals`, `/recurring`, `/reports`, `/settings`. Default redirect `/` → `/dashboard`.

### apps/mobile — database

`apps/mobile/src/db/index.ts` exposes a **synchronous** `getDatabase()` using `expo-sqlite.openDatabaseSync("ctrl-custo.db")` wrapped with Drizzle. Returns the same `CoreDatabase` type — all core services work with it without modification. Data persists on-device (SQLite file).

### apps/mobile — routing & screens

Expo Router v5 with **file-based routing** under `app/`:

```
app/_layout.tsx         — Root layout (GestureHandlerRootView, StatusBar, Stack)
app/(tabs)/_layout.tsx  — Tab bar com 6 telas
app/(tabs)/index.tsx    — Dashboard (balance, monthly summary, recent transactions)
app/(tabs)/transactions.tsx
app/(tabs)/cards.tsx
app/(tabs)/goals.tsx
app/(tabs)/recurring.tsx — Contas recorrentes (PAY-12 + notificações)
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

## Commits

- **Nunca adicionar `Co-Authored-By: Claude...`** nas mensagens de commit. Omitir completamente essa linha em todos os commits deste projeto.

## Key constraints

**Valores monetários — regra crítica:**

- Todos os valores são **inteiros em centavos** (BRL). Nunca use float para dinheiro.
- Inputs de dinheiro usam `<input type="text" inputMode="numeric">` + `parseCurrencyInput()` / `formatCurrency()` de `src/hooks/useCurrency.ts`. **Nunca `<input type="number">`** para campos monetários — causa erros de float e UX inconsistente.
- Essa convenção existe em web e mobile com API idêntica.

**Padrão de store (Zustand):**

- Toda nova store que acessa dados via API deve usar `api.*` diretamente nas actions — não armazenar instância de db ou cliente como estado da store.
- Stores que consomem a REST API (web e mobile) seguem o padrão: `set` para atualizar estado local após resposta, otimismo apenas onde explicitamente necessário.

**Rotas Hono — ordenação obrigatória:**

- Rotas específicas devem ser registradas **antes** das rotas parametrizadas. Ex: `GET /recurring-bills/due` deve vir antes de `GET /recurring-bills/:id`, senão `"due"` é capturado como parâmetro `:id`.

**Outros:**

- `react-hooks/exhaustive-deps` warnings in web pages are **intentional** — Zustand store references are stable so omitting them from deps is safe.
- ESLint 8 + Prettier 3 run via `lint-staged` on pre-commit (Husky 9). Do not bypass with `--no-verify`.
- Prettier config: double quotes, 100-char line width, semi, LF line endings, ES5 trailing commas.
