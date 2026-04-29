# Ctrl-Custo — Contexto do Projeto

## Status Atual

- [x] Fase 0 — Monorepo & estrutura
- [x] Fase 1 — packages/core (lógica + banco + testes)
- [x] Fase 2 — packages/ui (design system)
- [x] Fase 3 — apps/web (versão desktop)
- [ ] Fase 4 — apps/mobile (versão celular)
- [ ] Fase 5 — CI/CD e deploy

## Última tarefa concluída

> Fase 3 completa: apps/web com Dashboard, Transactions, Cards, Goals, Reports, Layout, Stores Zustand e hooks

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
- Prettier + ESLint + Husky para qualidade de código (configuração pendente em packages/config)
- Playwright para testes e2e (Fase 5)

## O que foi feito em cada fase

### Fase 0 — Monorepo & estrutura

- `package.json` raiz com scripts turbo, packageManager pnpm@9
- `pnpm-workspace.yaml` com apps/_ e packages/_
- `turbo.json` com pipeline de build/test/lint
- `tsconfig.json` raiz
- `.gitignore`
- Pastas criadas: `apps/web`, `apps/mobile` (vazia), `packages/core`, `packages/ui`, `packages/config` (vazia)
- **Pendência:** `packages/config` está vazio — tsconfig base e eslint base ainda não criados

### Fase 1 — packages/core

- **Tipos TypeScript:** `transaction.ts`, `category.ts`, `account.ts`, `card.ts`, `goal.ts`, `investment.ts`
- **Schema Drizzle:** `schema.ts` com tabelas categories, accounts, cards, transactions, goals, investments
- **Banco:** `db/index.ts` com createDatabase usando better-sqlite3 em memória para testes
- **Services:**
  - `TransactionService` — CRUD + filtros + parcelas (createInstallments)
  - `CategoryService` — CRUD de categorias com suporte a subcategorias
  - `AccountService` — CRUD de contas bancárias
  - `ReportService` — getPeriodSummary, getExpensesByCategory, getMonthlyEvolution
  - `ExportService` — exportação para CSV e JSON
- **Testes Vitest:** cobertura para todos os services (5 arquivos de teste)
- `index.ts` exportando tudo

### Fase 2 — packages/ui

- **Design tokens:**
  - `colors.ts` — paleta base + lightColors + darkColors + categoryColors
  - `typography.ts` — fontSizes, fontWeights, lineHeights
  - `spacing.ts` — escala de espaçamento + borderRadius
  - `tokens/index.ts` exportando tudo
- **Componentes:** Button, Input, Card, Badge, Modal, CurrencyInput (máscara R$ brasileira)
- **Gráficos Victory Native:** BarChart, LineChart, PieChart
- `index.ts` exportando components + charts + tokens

### Fase 3 — apps/web

- **Infra:** Vite + React 19 + TypeScript + TailwindCSS + PostCSS
- **Banco web:** `src/db/index.ts` com SQLite via wa-sqlite (WASM)
- **Stores Zustand:** useTransactionStore, useAccountStore, useCategoryStore, useCardStore, useGoalStore, useThemeStore
- **Hooks:** useCurrency (formatação BRL), useReport (cálculos de período/mês)
- **Layout:** Header, Sidebar, Layout wrapper
- **Páginas:**
  - `Dashboard` — BalanceCard, SummaryCards, RecentTransactions
  - `Transactions` — lista com filtros (TransactionFilters) + formulário (TransactionForm)
  - `Cards` — gestão de cartões de crédito
  - `Goals` — metas com barra de progresso
  - `Reports` — relatórios históricos
- **Pendências Fase 3:** Configurações (contas/categorias/tema), exportação PDF, formulário de Goals e Cards completo

## Problemas conhecidos / pendências

- `packages/config` vazio — tsconfig base e eslint compartilhados ainda não foram criados
- `apps/mobile` vazio — Fase 4 não iniciada
- Não há `.git` na raiz do monorepo (existe apenas em `Ctrl-Custo/` que é um repositório separado e vazio)
- Falta inicializar git na raiz: `git init && git add . && git commit -m "chore: initial monorepo setup"`
- Husky não configurado (hooks de pre-commit pendentes)
- ESLint e Prettier não configurados no packages/config
