# Ctrl-Custo — Contexto do Projeto

## Status Atual

- [x] Fase 0 — Monorepo & estrutura
- [x] Fase 1 — packages/core (lógica + banco + testes)
- [x] Fase 2 — packages/ui (design system)
- [x] Fase 3 — apps/web (versão desktop)
- [x] Fase 4 — apps/mobile (versão celular) ← estrutura completa criada
- [ ] Fase 5 — CI/CD e deploy

## Última tarefa concluída

> Fase 4 implementada: estrutura completa do `apps/mobile` com Expo SDK 54 + Expo Router v5.
> `packages/core` teve `CoreDatabase` generalizado para `BaseSQLiteDatabase<'sync', any, typeof schema>`,
> compatível com sql.js (testes/web) e expo-sqlite (mobile). Todos os 31 testes seguem passando.
>
> **Pendência bloqueante:** erro de bundling no Metro (veja seção abaixo). A correção está diagnosticada
> mas ainda não aplicada — nenhum arquivo de configuração foi alterado.

## Próximo passo — Fase 4: corrigir bundling e testar

### Erro de bundling (BLOQUEANTE)

**Erro:**

```
Android Bundling failed
ERROR Error: ...VirtualViewExperimentalNativeComponent.js:
Unable to determine event arguments for "onModeChange"
at throwIfArgumentPropsAreNull (@react-native/codegen/...)
```

**Causa raiz diagnosticada:**
O pnpm com `autoInstallPeers: true` instalou `react-native@0.85.2` como peer implícito em
`apps/web` (via `react-native-svg`) e `packages/core` (via `drizzle-orm` → `expo-sqlite`).
Isso gerou três versões simultâneas de `@react-native/codegen` (0.79.7, 0.81.5, 0.85.2)
no lockfile. O Metro, ao traversar os symlinks do pnpm pelo monorepo, encontra versões
incompatíveis e falha no codegen.

**Dois problemas encadeados:**

1. **Ausência de `.npmrc`** com `node-linker=hoisted` — sem isso o pnpm usa symlinks que o Metro não resolve corretamente
2. **Lockfile desatualizado** — o override `react-native: ~0.79.0` já está no `package.json` raiz mas nunca foi aplicado via `pnpm install`

**Plano de correção (aguardando execução):**

Passo 1 — Criar `.npmrc` na raiz:

```
node-linker=hoisted
```

Passo 2 — Reinstalar dependências (PowerShell):

```powershell
Remove-Item -Recurse -Force node_modules, pnpm-lock.yaml -ErrorAction SilentlyContinue
pnpm install
npx expo install --fix
npx expo-doctor
```

Passo 3 — Limpar cache do Metro:

```powershell
Remove-Item -Recurse -Force $env:TEMP\metro-cache, $env:TEMP\haste-map-* -ErrorAction SilentlyContinue
```

Nenhuma alteração de código de aplicação é necessária. Apenas configuração e reinstalação.

### Checklist restante Fase 4

- [x] Criar `apps/mobile` com Expo SDK 54 + Expo Router v5
- [x] Configurar tab bar: Dashboard, Transações, Cartões, Metas, Configurações
- [x] Banco de dados: expo-sqlite + Drizzle ORM (substituiu sql.js)
- [x] `packages/core` compatível com expo-sqlite (CoreDatabase genérico)
- [x] Reutilizar stores Zustand (lógica idêntica ao web)
- [x] Bottom sheet (Modal nativo) para entrada rápida de transação
- [x] Tema claro/escuro via `useThemeStore` + `AsyncStorage`
- [x] Modo oculto (esconder valores) via `useUiStore`
- [x] Biometria + PIN via `expo-local-authentication` (Settings)
- [ ] **BLOQUEANTE: corrigir erro de bundling Metro** (ver acima)
- [ ] Assets de ícone e splash screen
- [ ] Teste em emulador Android / simulador iOS
- [ ] Ajustes de UI após testes visuais

## Decisões técnicas tomadas

- Monorepo com Turborepo + pnpm workspaces
- TypeScript strict em todo o projeto
- Drizzle ORM + SQLite (web e mobile) — valores monetários em centavos (integer)
- Zustand para estado global (stores: transaction, account, category, card, goal, theme, ui)
- Victory Native para gráficos (BarChart, LineChart, PieChart em packages/ui)
- Expo Router v4 para navegação mobile (file-based routing)
- Vitest para testes unitários
- ESLint 8 + Prettier 3 + Husky 9 (pre-commit com lint-staged)
- Playwright para testes e2e (Fase 5)
- `crypto.randomUUID()` via Web Crypto API (browser, Node.js 18+, Hermes/RN 0.74+)
- `packages/core/tsconfig.json` inclui `"lib": ["ES2022", "DOM"]` para acesso ao global `crypto`
- `CoreDatabase` usa `BaseSQLiteDatabase<'sync', any, typeof schema>` para ser agnóstico ao driver
- Mobile usa `expo-sqlite openDatabaseSync` (síncrono, compatível com o tipo CoreDatabase)
- Persist de tema e UI no mobile via Zustand + AsyncStorage

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

### Fase 4 — apps/mobile ⚠️ (estrutura pronta, bundling bloqueado)

- **Infra:** Expo SDK 54 + Expo Router v5 + TypeScript
- **Banco mobile:** expo-sqlite (openDatabaseSync) + Drizzle ORM — persistência nativa em arquivo
- **Stores Zustand:** idênticos ao web + useUiStore (modo oculto + biometria)
- **Navegação:** Tab bar com 5 telas (Expo Router file-based)
- **Telas:** Dashboard, Transactions (com bottom sheet), Cards, Goals, Settings
- **Funcionalidades:** modo oculto, biometria (expo-local-authentication), tema claro/escuro persistido

### packages/config ✅

- `tsconfig.base.json`, `tsconfig.react.json`, `tsconfig.react-native.json`

### Qualidade de código ✅

- `.eslintrc.cjs` raiz com suporte a TypeScript e React
- `.prettierrc` com configurações padrão (printWidth 100, trailing comma ES5, LF)
- `.husky/pre-commit` rodando lint-staged antes de cada commit

## Problemas conhecidos / pendências

- **[BLOQUEANTE] Erro de bundling Metro no mobile** — causa raiz e plano de correção documentados na seção "Próximo passo". Correção: criar `.npmrc` com `node-linker=hoisted` + reinstalar dependências. Nenhum código de aplicação precisa mudar.
- 6 warnings de `react-hooks/exhaustive-deps` em páginas do web (padrão intencional — stores Zustand são referências estáveis)
- Banco web em memória: resets ao recarregar a página (persistência via localStorage não implementada)
- `apps/mobile/assets/` precisa ser criado com ícones/splash antes de rodar o Expo
- CI/CD (GitHub Actions) não configurado (Fase 5)
- Testes e2e Playwright não implementados (Fase 5)
