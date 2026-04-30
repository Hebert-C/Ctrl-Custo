# Ctrl-Custo — Contexto do Projeto

## Status Atual

- [x] Fase 0 — Monorepo & estrutura
- [x] Fase 1 — packages/core (lógica + banco + testes)
- [x] Fase 2 — packages/ui (design system)
- [x] Fase 3 — apps/web (versão desktop)
- [x] Fase 4 — apps/mobile (versão celular) ← flows de criação implementados
- [ ] Fase 5 — CI/CD e deploy

## Última tarefa concluída

> Fase 4 — flows de criação de entidades no mobile implementados.
>
> Criados 4 formulários bottom sheet (`src/components/`):
>
> - `AccountForm.tsx` — nova conta/banco (nome, tipo, banco, saldo inicial, ícone, cor)
> - `CategoryForm.tsx` — nova categoria (nome, tipo, ícone, cor)
> - `CardForm.tsx` — novo cartão (nome, bandeira, dígitos, limite, dias, conta, cor)
> - `GoalForm.tsx` — nova meta (nome, valor alvo, prazo, ícone, cor, notas)
>
> Telas atualizadas:
>
> - `cards.tsx` — FAB "+" abre CardForm
> - `goals.tsx` — FAB "+" abre GoalForm
> - `settings.tsx` — botões "Nova conta" e "Nova categoria" nos cabeçalhos das seções
>
> Todos os formulários seguem o padrão do `TransactionForm` existente. TypeCheck passa sem erros.
>
> Correção de bundling Metro também aplicada: `.npmrc` com `node-linker=hoisted` criado na raiz,
> dependências reinstaladas, assets de ícone/splash presentes em `apps/mobile/assets/`.

## Próximo passo — Fase 4: testar no emulador

### Checklist restante Fase 4

- [x] Criar `apps/mobile` com Expo SDK 54 + Expo Router v5
- [x] Configurar tab bar: Dashboard, Transações, Cartões, Metas, Configurações
- [x] Banco de dados: expo-sqlite + Drizzle ORM (substituiu sql.js)
- [x] `packages/core` compatível com expo-sqlite (CoreDatabase genérico)
- [x] Reutilizar stores Zustand (lógica idêntica ao web)
- [x] Bottom sheet para nova transação (`TransactionForm`)
- [x] Bottom sheet para novo cartão (`CardForm`)
- [x] Bottom sheet para nova conta (`AccountForm`)
- [x] Bottom sheet para nova categoria (`CategoryForm`)
- [x] Bottom sheet para nova meta (`GoalForm`)
- [x] Tema claro/escuro via `useThemeStore` + `AsyncStorage`
- [x] Modo oculto (esconder valores) via `useUiStore`
- [x] Biometria + PIN via `expo-local-authentication` (Settings)
- [x] Correção do erro de bundling Metro (`.npmrc` + reinstall)
- [x] Assets de ícone e splash screen (`apps/mobile/assets/`)
- [ ] **Teste em emulador Android / simulador iOS**
- [ ] Ajustes de UI após testes visuais

## Decisões técnicas tomadas

- Monorepo com Turborepo + pnpm workspaces
- TypeScript strict em todo o projeto
- Drizzle ORM + SQLite (web e mobile) — valores monetários em centavos (integer)
- Zustand para estado global (stores: transaction, account, category, card, goal, theme, ui)
- Victory Native para gráficos (BarChart, LineChart, PieChart em packages/ui)
- Expo Router v5 para navegação mobile (file-based routing)
- Vitest para testes unitários
- ESLint 8 + Prettier 3 + Husky 9 (pre-commit com lint-staged)
- Playwright para testes e2e (Fase 5)
- `crypto.randomUUID()` via Web Crypto API (browser, Node.js 18+, Hermes/RN 0.74+)
- `packages/core/tsconfig.json` inclui `"lib": ["ES2022", "DOM"]` para acesso ao global `crypto`
- `CoreDatabase` usa `BaseSQLiteDatabase<'sync', any, typeof schema>` para ser agnóstico ao driver
- Mobile usa `expo-sqlite openDatabaseSync` (síncrono, compatível com o tipo CoreDatabase)
- Persist de tema e UI no mobile via Zustand + AsyncStorage
- `.npmrc` com `node-linker=hoisted` na raiz — obrigatório para o Metro resolver o monorepo corretamente

## O que foi feito em cada fase

### Fase 0 — Monorepo & estrutura ✅

- `package.json` raiz com scripts turbo, packageManager pnpm@9
- `pnpm-workspace.yaml` com apps/_ e packages/_
- `turbo.json` com pipeline de build/test/lint
- `tsconfig.json` raiz (strict, ES2022)
- `.gitignore` completo

### Fase 1 — packages/core ✅

- **Tipos TypeScript:** `transaction.ts`, `category.ts`, `account.ts`, `card.ts`, `goal.ts`, `investment.ts`
- **Schema Drizzle:** `schema.ts` com tabelas categories, accounts, cards, transactions, goals, investments
- **Banco:** `db/index.ts` com createDatabase usando sql.js (WASM — funciona em browser e Node.js)
- **Services:** TransactionService, CategoryService, AccountService, ReportService, ExportService
- **Testes Vitest:** 31 testes, todos passando (5 arquivos de teste)

### Fase 2 — packages/ui ✅

- **Design tokens:** `colors.ts` (light/dark), `typography.ts`, `spacing.ts`
- **Componentes:** Button, Input, Card, Badge, Modal, CurrencyInput
- **Gráficos Victory Native:** BarChart, LineChart, PieChart

### Fase 3 — apps/web ✅

- **Infra:** Vite + React 19 + TypeScript + TailwindCSS
- **Banco web:** sql.js via WASM (singleton em `src/db/index.ts`)
- **Stores Zustand:** useTransactionStore, useAccountStore, useCategoryStore, useCardStore, useGoalStore, useThemeStore
- **Layout:** Header, Sidebar, Layout wrapper, App.tsx com React Router
- **Páginas:** Dashboard, Transactions, Cards, Goals, Reports, Settings

### Fase 4 — apps/mobile ✅ (flows completos, aguardando teste em emulador)

- **Infra:** Expo SDK 54 + Expo Router v5 + TypeScript
- **Banco mobile:** expo-sqlite (openDatabaseSync) + Drizzle ORM — persistência nativa em arquivo
- **Stores Zustand:** idênticos ao web + useUiStore (modo oculto + biometria)
- **Navegação:** Tab bar com 5 telas (Expo Router file-based)
- **Telas:** Dashboard, Transactions, Cards, Goals, Settings
- **Formulários (bottom sheet):** TransactionForm, CardForm, AccountForm, CategoryForm, GoalForm
- **Funcionalidades:** modo oculto, biometria (expo-local-authentication), tema claro/escuro persistido
- **Bundling:** `.npmrc` com `node-linker=hoisted` resolve o conflito de versões do Metro no monorepo pnpm

### packages/config ✅

- `tsconfig.base.json`, `tsconfig.react.json`, `tsconfig.react-native.json`

### Qualidade de código ✅

- `.eslintrc.cjs` raiz com suporte a TypeScript e React
- `.prettierrc` com configurações padrão (printWidth 100, trailing comma ES5, LF)
- `.husky/pre-commit` rodando lint-staged antes de cada commit

## Problemas conhecidos / pendências

- 6 warnings de `react-hooks/exhaustive-deps` em páginas do web (padrão intencional — stores Zustand são referências estáveis)
- Banco web em memória: resets ao recarregar a página (persistência via localStorage não implementada)
- CI/CD (GitHub Actions) não configurado (Fase 5)
- Testes e2e Playwright não implementados (Fase 5)
