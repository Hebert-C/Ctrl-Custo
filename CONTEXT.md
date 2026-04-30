# Ctrl-Custo — Contexto do Projeto

## Status Atual

- [x] Fase 0 — Monorepo & estrutura
- [x] Fase 1 — packages/core (lógica + banco + testes)
- [x] Fase 2 — packages/ui (design system)
- [x] Fase 3 — apps/web (versão desktop)
- [x] Fase 4 — apps/mobile (versão celular) ← flows de criação implementados
- [ ] Fase 5 — Backend API com segurança (apps/api)
- [ ] Fase 6 — Migração do banco para PostgreSQL
- [ ] Fase 7 — Web app consome API (remove sql.js)
- [ ] Fase 8 — Mobile app consome API (remove expo-sqlite)
- [ ] Fase 9 — Oracle Cloud: infra, deploy e hardening
- [ ] Fase 10 — CI/CD (GitHub Actions + EAS Build)
- [ ] Fase 11 — Desktop Windows (Tauri — executável .exe)

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

## Decisão arquitetural — sincronização entre dispositivos

Decidido adicionar backend próprio na Oracle Cloud Free Tier para que os dados sejam
compartilhados entre web e mobile. **Sem suporte offline** — ambos os apps dependem de
conexão com a internet e consomem a API diretamente.

Motivação: banco local (sql.js no web e expo-sqlite no mobile) não compartilha dados entre
dispositivos. A solução é um servidor HTTP com PostgreSQL centralizado.

---

## Próximo passo — Fase 5: Backend API (`apps/api`)

### Contexto para iniciar a Fase 5

Criar `apps/api` no monorepo: servidor HTTP Node.js com Hono, conectado a PostgreSQL via
Drizzle, com autenticação JWT e todas as medidas de segurança definidas abaixo.

**Stack decidida:**

- Runtime: Node.js 20
- Framework HTTP: Hono (leve, suporte nativo a middleware)
- ORM: Drizzle (já usado no projeto, adicionar dialect PostgreSQL)
- Autenticação: JWT (access token 15min + refresh token 7 dias via httpOnly cookie)
- Hash de senha: Argon2id
- Validação de input: Zod via `@hono/zod-validator`

### Checklist Fase 5

#### Estrutura do app

- [ ] Criar `apps/api/package.json` e `apps/api/tsconfig.json`
- [ ] Configurar entrada `apps/api/src/index.ts` com Hono
- [ ] Adicionar `apps/api` ao pipeline do Turborepo

#### Segurança — Transporte

- [ ] Middleware de security headers (`hono/secure-headers`):
  - `Strict-Transport-Security` (HSTS, max-age 1 ano)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Content-Security-Policy`
- [ ] CORS restrito aos domínios do app (não `*`)
- [ ] Limite de tamanho de body (ex: 1 MB)

#### Segurança — Autenticação

- [ ] `POST /auth/register` — email + senha (hash Argon2id, salt automático)
- [ ] `POST /auth/login` — valida senha, emite access token (JWT 15min) + refresh token (httpOnly cookie, 7 dias)
- [ ] `POST /auth/refresh` — renova access token via refresh token
- [ ] `POST /auth/logout` — invalida refresh token
- [ ] Rate limiting nos endpoints de auth (máx. 10 tentativas por IP em 15min)
- [ ] Bloqueio de conta após 10 falhas consecutivas (cooldown de 30min)

#### Segurança — Autorização

- [ ] Middleware `requireAuth` que valida JWT e injeta `userId` no contexto
- [ ] Todo endpoint de dados aplica `WHERE userId = ?` — usuário só acessa seus próprios dados
- [ ] `userId` sempre vem do JWT, nunca do body da requisição

#### Endpoints REST

- [ ] `GET/POST /transactions`, `PUT/DELETE /transactions/:id`
- [ ] `GET/POST /accounts`, `PUT/DELETE /accounts/:id`
- [ ] `GET/POST /categories`, `PUT/DELETE /categories/:id`
- [ ] `GET/POST /cards`, `PUT/DELETE /cards/:id`
- [ ] `GET/POST /goals`, `PUT/DELETE /goals/:id`
- [ ] `POST /goals/:id/deposit` — aporte em meta
- [ ] `GET /reports/summary` — resumo mensal

#### Validação de input

- [ ] Schema Zod para cada endpoint (rejeita campos extras, valida tipos e ranges)
- [ ] Valores monetários: sempre inteiros (centavos), nunca floats
- [ ] IDs: validar formato UUID antes de consultar o banco

#### Logs e auditoria

- [ ] Logar eventos de auth (login, logout, falha) com IP + timestamp
- [ ] **Nunca logar valores financeiros** nos logs
- [ ] Rotação de logs configurada (7 dias de retenção)

#### Configuração

- [ ] `.env.example` com todas as variáveis necessárias (sem valores reais)
- [ ] `.env` no `.gitignore` (nunca comitar)
- [ ] Variáveis: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`, `ALLOWED_ORIGINS`

### Prompt de início de sessão (Fase 5)

> "Vamos iniciar a Fase 5 do Ctrl-Custo. O objetivo é criar `apps/api` no monorepo: servidor
> Hono + Drizzle (PostgreSQL) + JWT + Argon2id. Sem suporte offline — web e mobile consumirão
> a API diretamente. Implemente com todas as medidas de segurança do checklist do CONTEXT.md
> (security headers, CORS restrito, rate limiting, bloqueio de conta, userId sempre do JWT).
> Comece pela estrutura base do app e o módulo de autenticação."

---

## Fase 6 — Migração do banco para PostgreSQL

### Checklist Fase 6

- [ ] Adicionar `drizzle-orm/postgres-js` e `postgres` ao `packages/core`
- [ ] Criar variante do schema compatível com PG (tipos: `uuid`, `text`, `integer`, `timestamp`)
- [ ] Criar arquivo de migrations Drizzle para PG (`packages/core/src/db/migrations/`)
- [ ] Remover dependência do `sql.js` do `packages/core` (mover para `apps/web` como devDependency, ou remover)
- [ ] Adaptar `CoreDatabase` para aceitar tanto PG quanto SQLite (para testes)
- [ ] Atualizar testes Vitest para usar PG in-memory (ex: `pg-mem`) ou manter SQLite só em testes

---

## Fase 7 — Web app consome API

### Checklist Fase 7

- [ ] Remover `sql.js` e `apps/web/src/db/index.ts`
- [ ] Remover CORS headers do `vite.config.ts` (não são mais necessários)
- [ ] Criar `apps/web/src/lib/api.ts` — cliente HTTP com interceptor de token JWT
- [ ] Criar `apps/web/src/hooks/useAuth.ts` — login, logout, estado de autenticação
- [ ] Adicionar tela de login/registro antes do layout principal
- [ ] Atualizar todos os Zustand stores para chamar `api.ts` em vez do banco local
- [ ] Tratar erros de auth (401 → redirecionar para login, refresh automático)
- [ ] Remover `locateFile` WASM e arquivos `public/sql-wasm.*`

---

## Fase 8 — Mobile app consome API

### Checklist Fase 8

- [ ] Remover `expo-sqlite` e `apps/mobile/src/db/index.ts`
- [ ] Criar `apps/mobile/src/lib/api.ts` — mesmo cliente HTTP da web (adaptado para RN)
- [ ] Armazenar access token em `expo-secure-store` (keychain/keystore nativo — nunca AsyncStorage)
- [ ] Refresh token em httpOnly cookie (gerenciado pelo servidor)
- [ ] Criar tela de login/registro (`app/login.tsx`)
- [ ] Atualizar todos os Zustand stores para chamar `api.ts`
- [ ] Atualizar Metro stub: remover entrada `sql.js` do `metro.config.js`

---

## Fase 9 — Oracle Cloud: infra, deploy e hardening

### Checklist Fase 9

#### Provisionamento

- [ ] Criar VM ARM (Ampere A1 — 4 OCPUs, 24 GB RAM, sempre gratuita)
- [ ] Ubuntu Server 22.04 LTS como OS
- [ ] Criar usuário não-root `deploy` para rodar os processos

#### Banco de dados

- [ ] Instalar PostgreSQL 16
- [ ] Criar database `ctrl_custo` e usuário DB sem permissão de DDL (só DML)
- [ ] PostgreSQL escutando apenas `127.0.0.1` (nunca exposto à internet)
- [ ] Configurar backup automático: `pg_dump` diário via cron → Oracle Object Storage (10 GB gratuito)

#### Aplicação

- [ ] Instalar Node.js 20 via `nvm`
- [ ] Instalar PM2 para gerenciar o processo da API
- [ ] Deploy via `git pull` + `pnpm install --prod` + `pm2 restart`
- [ ] Variáveis de ambiente em `/etc/environment` ou arquivo `.env` protegido (chmod 600)

#### Nginx + SSL

- [ ] Instalar nginx como reverse proxy (porta 80/443 → porta local da API)
- [ ] Configurar SSL com Let's Encrypt via `certbot` (requer domínio próprio)
- [ ] TLS 1.2+ apenas; desabilitar TLS 1.0/1.1
- [ ] HSTS habilitado no nginx
- [ ] Servir o build do `apps/web/dist/` via nginx (static files)

#### Hardening

- [ ] SSH somente por chave (desabilitar `PasswordAuthentication`)
- [ ] Firewall Oracle (NSG): apenas portas 22, 80, 443
- [ ] Instalar e configurar `fail2ban` (SSH + tentativas de login na API)
- [ ] `ufw` habilitado como segunda camada de firewall

---

## Fase 10 — CI/CD (GitHub Actions + EAS Build)

### Checklist Fase 10

#### CI — GitHub Actions (`ci.yml`)

- [ ] Rodar em todo push e PR para `main`:
  - `pnpm install --frozen-lockfile`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test` (Vitest — packages/core)
  - Cache de pnpm store via hash do `pnpm-lock.yaml`
  - Node.js 20, runner `ubuntu-latest`

#### CD — Deploy da API (`deploy-api.yml`)

- [ ] Acionado após CI verde no `main`
- [ ] SSH na VM Oracle → `git pull` + `pnpm install --prod` + `pm2 restart api`
- [ ] Secrets: `ORACLE_SSH_KEY`, `ORACLE_HOST`, `ORACLE_USER`

#### CD — Deploy Web (`deploy-web.yml`)

- [ ] Build `apps/web` e rsync do `dist/` para pasta nginx na VM Oracle
- [ ] Alternativa: Vercel (deploy automático, zero config)

#### CD — Mobile (`eas.yml`)

- [ ] Criar `apps/mobile/eas.json` com profiles `development`, `preview`, `production`:
  - `development` — build de debug para emulador/dispositivo
  - `preview` — **APK** (`buildType: "apk"`) para instalação direta (sideload) sem Play Store
  - `production` — **AAB** (`buildType: "aab"`) para publicar na Play Store
- [ ] Workflow acionado por `workflow_dispatch` ou tags `v*.*.*`
- [ ] `eas build --platform android --profile preview --non-interactive` (gera APK para download)
- [ ] `eas build --platform android --profile production --non-interactive` (gera AAB para Play Store)
- [ ] Secret: `EXPO_TOKEN`
- [ ] Artefato APK disponível para download no painel EAS (expo.dev)

#### Testes E2E — Playwright

- [ ] Instalar Playwright em `apps/web`
- [ ] `playwright.config.ts` com `baseURL` e `webServer` iniciando Vite
- [ ] Smoke tests: login, dashboard, criar transação, criar conta
- [ ] Step de Playwright no workflow CI (após build web)

---

---

## Fase 11 — Desktop Windows (Tauri)

### Contexto

Tauri envolve o `apps/web` (React + Vite) em uma shell Rust nativa, gerando um instalador
`.exe` / `.msi` para Windows. O frontend é exatamente o mesmo do `apps/web` — sem duplicação
de código. O executável final fica entre 5–15 MB (vs ~150 MB do Electron).

Requer Rust instalado localmente e no runner de CI para buildar.

**Decisões:**

- Tauri será adicionado dentro de `apps/web` (`apps/web/src-tauri/`)
- No modo desktop, o app consome a mesma API REST do backend Oracle Cloud
- Sem banco local — idêntico ao comportamento web

### Checklist Fase 11

#### Setup local

- [ ] Instalar Rust via `rustup` (pré-requisito obrigatório)
- [ ] Instalar `@tauri-apps/cli` como devDependency em `apps/web`
- [ ] Executar `pnpm tauri init` dentro de `apps/web` — gera `src-tauri/`
- [ ] Configurar `src-tauri/tauri.conf.json`:
  - `build.frontendDist` apontando para `../dist`
  - `build.devUrl` apontando para `http://localhost:5173`
  - `app.windows[0].title`: "Ctrl-Custo"
  - `app.windows[0].width/height`: 1280 × 800
  - `bundle.identifier`: `com.ctrl-custo.app`

#### Segurança no contexto desktop

- [ ] Configurar `app.security.csp` no `tauri.conf.json` (Content Security Policy)
- [ ] Habilitar apenas as capabilities Tauri necessárias (negar acesso a filesystem, shell, etc.)
- [ ] `dangerousDisableAssetCspModification: false` (manter proteção de assets)
- [ ] Comunicação com a API Oracle via HTTPS (mesmo certificado Let's Encrypt)

#### Ícone e assets

- [ ] Gerar ícones para Windows (`icon.ico`, `icon.png`) via `pnpm tauri icon`
- [ ] Adicionar ícone em `src-tauri/icons/`

#### Build local

- [ ] `pnpm tauri build` dentro de `apps/web` — gera instalador em `src-tauri/target/release/bundle/`
- [ ] Testar instalador `.msi` e executável `.exe`

#### CI — GitHub Actions (`tauri.yml`)

- [ ] Workflow acionado por `workflow_dispatch` ou tags `v*.*.*`
- [ ] Runner: `windows-latest` (obrigatório para gerar `.exe` / `.msi` nativo)
- [ ] Instalar Rust (`dtolnay/rust-toolchain@stable`)
- [ ] Usar `tauri-apps/tauri-action` para build automatizado
- [ ] Fazer upload do instalador como artefato da release GitHub
- [ ] (Opcional) assinar o executável com certificado code signing para evitar alerta do Windows Defender

#### Integração no monorepo

- [ ] Adicionar script `"tauri": "tauri"` ao `package.json` de `apps/web`
- [ ] Adicionar `src-tauri/target/` ao `.gitignore`
- [ ] Atualizar `turbo.json` para excluir o build Tauri do pipeline padrão (build separado)

### Prompt de início de sessão (Fase 11)

> "Vamos iniciar a Fase 11 do Ctrl-Custo: empacotamento desktop com Tauri. O frontend já
> existe em `apps/web` (React + Vite). Rust está instalado localmente. Configure Tauri dentro
> de `apps/web` seguindo o checklist do CONTEXT.md: `tauri.conf.json`, CSP, capabilities
> mínimas, ícones e workflow GitHub Actions com `windows-latest` + `tauri-apps/tauri-action`."

---

## Decisões técnicas tomadas

- Monorepo com Turborepo + pnpm workspaces
- TypeScript strict em todo o projeto
- Drizzle ORM — valores monetários em centavos (integer, nunca float)
- Zustand para estado global (stores: transaction, account, category, card, goal, theme, ui)
- Victory Native para gráficos (BarChart, LineChart, PieChart em packages/ui)
- Expo Router v5 para navegação mobile (file-based routing)
- Vitest para testes unitários
- ESLint 8 + Prettier 3 + Husky 9 (pre-commit com lint-staged)
- Playwright para testes e2e (Fase 10)
- `crypto.randomUUID()` via Web Crypto API (browser, Node.js 18+, Hermes/RN 0.74+)
- `packages/core/tsconfig.json` inclui `"lib": ["ES2022", "DOM"]` para acesso ao global `crypto`
- **Backend:** Hono + Drizzle (PG) + JWT (15min) + Argon2id + Zod
- **Banco compartilhado:** PostgreSQL na Oracle Cloud VM (ARM, gratuita)
- **Sem suporte offline:** web e mobile dependem de internet e consomem a API diretamente
- **Token de auth no mobile:** access token em `expo-secure-store` (keychain/keystore nativo)
- **Refresh token:** httpOnly cookie gerenciado pelo servidor
- **Isolamento de dados:** `userId` sempre extraído do JWT, nunca do body da requisição
- Oracle Cloud Free Tier: VM ARM (4 OCPUs, 24 GB RAM) + Object Storage (10 GB backup)
- **APK Android:** EAS Build profile `preview` com `buildType: "apk"` para sideload; `production` gera AAB para Play Store
- **Desktop Windows:** Tauri dentro de `apps/web` (`src-tauri/`) — shell Rust + frontend React existente, ~5–15 MB de executável

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
- **Banco:** `db/index.ts` com createDatabase usando sql.js (WASM — será removido na Fase 6/7)
- **Services:** TransactionService, CategoryService, AccountService, ReportService, ExportService
- **Testes Vitest:** 31 testes, todos passando (5 arquivos de teste)

### Fase 2 — packages/ui ✅

- **Design tokens:** `colors.ts` (light/dark), `typography.ts`, `spacing.ts`
- **Componentes:** Button, Input, Card, Badge, Modal, CurrencyInput
- **Gráficos Victory Native:** BarChart, LineChart, PieChart

### Fase 3 — apps/web ✅

- **Infra:** Vite + React 19 + TypeScript + TailwindCSS
- **Banco web:** sql.js via WASM (singleton em `src/db/index.ts`) ← será removido na Fase 7
- **Stores Zustand:** useTransactionStore, useAccountStore, useCategoryStore, useCardStore, useGoalStore, useThemeStore
- **Layout:** Header, Sidebar, Layout wrapper, App.tsx com React Router
- **Páginas:** Dashboard, Transactions, Cards, Goals, Reports, Settings

### Fase 4 — apps/mobile ✅ (flows completos, aguardando teste em emulador)

- **Infra:** Expo SDK 54 + Expo Router v5 + TypeScript
- **Banco mobile:** expo-sqlite (openDatabaseSync) + Drizzle ORM ← será removido na Fase 8
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
- Banco web em memória: resets ao recarregar a página (será resolvido na Fase 7 com a API)
- expo-sqlite no mobile: dados isolados por dispositivo (será resolvido na Fase 8 com a API)
- CI/CD (GitHub Actions) não configurado (Fase 10)
- Testes e2e Playwright não implementados (Fase 10)
