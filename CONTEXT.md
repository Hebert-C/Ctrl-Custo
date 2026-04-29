# Ctrl-Custo — Contexto do Projeto

## Status Atual

- [x] Fase 0 — Monorepo & estrutura
- [x] Fase 1 — packages/core (lógica + banco + testes)
- [x] Fase 2 — packages/ui (design system)
- [x] Fase 3 — apps/web (versão desktop)
- [ ] Fase 4 — apps/mobile (versão celular)
- [ ] Fase 5 — CI/CD e deploy

## Última tarefa concluída

> Pendências resolvidas: git configurado na raiz, packages/config criado, ESLint + Prettier + Husky configurados, bugs de typecheck corrigidos, push feito para GitHub

## Próximo passo

> Iniciar Fase 4 — apps/mobile com Expo SDK 52 + Expo Router

## Decisões técnicas tomadas

- Monorepo com Turborepo + pnpm workspaces
- TypeScript strict em todo o projeto
- Drizzle ORM + SQLite (web e mobile) — valores monetários em centavos (integer)
- Zustand para estado global (stores: transaction, account, category, card, goal, theme)
- Victory Native para gráficos (BarChart, LineChart, PieChart em packages/ui)
- Expo Router para navegação mobile
- Vitest para testes unitários
- ESLint 8 + Prettier 3 + Husky 9 (pre-commit com lint-staged)
- Playwright para testes e2e (Fase 5)
- `crypto.randomUUID()` via Web Crypto API (funciona em browser e Node.js 18+)
- `packages/core/tsconfig.json` inclui `"lib": ["ES2022", "DOM"]` para acesso ao global `crypto`

## O que foi feito em cada fase

### Fase 0 — Monorepo & estrutura ✅

- `package.json` raiz com scripts turbo, packageManager pnpm@9
- `pnpm-workspace.yaml` com apps/_ e packages/_
- `turbo.json` com pipeline de build/test/lint
- `tsconfig.json` raiz (strict, ES2022)
- `.gitignore` completo
- Git inicializado na raiz, remote apontando para https://github.com/Hebert-C/Ctrl-Custo

### Fase 1 — packages/core ✅

- **Tipos TypeScript:** `transaction.ts`, `category.ts`, `account.ts`, `card.ts`, `goal.ts`, `investment.ts`
- **Schema Drizzle:** `schema.ts` com tabelas categories, accounts, cards, transactions, goals, investments
- **Banco:** `db/index.ts` com createDatabase usando sql.js (WASM — funciona em browser e Node.js)
- **Services:**
  - `TransactionService` — CRUD + filtros + parcelas (createInstallments)
  - `CategoryService` — CRUD de categorias com suporte a subcategorias
  - `AccountService` — CRUD de contas bancárias + getTotalBalance
  - `ReportService` — getPeriodSummary, getExpensesByCategory, getMonthlyEvolution
  - `ExportService` — exportação para CSV e JSON
- **Testes Vitest:** 31 testes, todos passando (5 arquivos de teste)
- `index.ts` exportando tipos, schema tables, services e tipos dos reports

### Fase 2 — packages/ui ✅

- **Design tokens:** `colors.ts` (light/dark), `typography.ts`, `spacing.ts`
- **Componentes:** Button, Input, Card, Badge, Modal, CurrencyInput (máscara R$ brasileira)
- **Gráficos Victory Native:** BarChart, LineChart, PieChart

### Fase 3 — apps/web ✅

- **Infra:** Vite + React 19 + TypeScript + TailwindCSS
- **Banco web:** sql.js via WASM (mesmo engine do core)
- **Stores Zustand:** useTransactionStore, useAccountStore, useCategoryStore, useCardStore, useGoalStore, useThemeStore
- **Hooks:** useCurrency (formatação BRL), useReport (cálculos de período/mês)
- **Layout:** Header, Sidebar, Layout wrapper, App.tsx com React Router
- **Páginas:** Dashboard, Transactions (filtros + formulário), Cards, Goals, Reports

### packages/config ✅

- `tsconfig.base.json` — TypeScript strict base
- `tsconfig.react.json` — estende base, adiciona React/DOM
- `tsconfig.react-native.json` — estende base, adiciona configurações React Native

### Qualidade de código ✅

- `.eslintrc.cjs` raiz com suporte a TypeScript e React
- `.prettierrc` com configurações padrão (printWidth 100, trailing comma ES5, LF)
- `.husky/pre-commit` rodando lint-staged antes de cada commit
- `lint-staged` formatando `.ts/.tsx` com ESLint + Prettier

## Problemas conhecidos / pendências

- 5 warnings de `react-hooks/exhaustive-deps` em páginas do web (padrão intencional — stores Zustand são referências estáveis)
- `apps/mobile` vazio — Fase 4 não iniciada
- Não há testes e2e (Playwright — Fase 5)
- CI/CD (GitHub Actions) não configurado (Fase 5)
