# Ctrl+Custo — Documento Central do Projeto

> **Este arquivo é a fonte única de verdade do projeto.**
> Substitui `CONTEXT.md` e `DEPLOY.md` como referência de consulta.
> Serve como log de tudo que foi alterado, precisa ser criado, status do desenvolvimento e planejamento.
> Atualize este arquivo ao final de cada sessão de trabalho.

---

## Status das Fases

| Fase | Descrição                                   | Branch                                      | Status      |
| ---- | ------------------------------------------- | ------------------------------------------- | ----------- |
| 0    | Monorepo & estrutura                        | `main`                                      | ✅          |
| 1    | packages/core (lógica + banco + testes)     | `main`                                      | ✅          |
| 2    | packages/ui (design system)                 | `main`                                      | ✅          |
| 3    | apps/web (versão desktop)                   | `main`                                      | ✅          |
| 4    | apps/mobile                                 | `feature/mobile`                            | ✅          |
| 5    | Backend API com segurança (apps/api)        | `feature/phase-5-api`                       | ✅          |
| 6    | Migrations PostgreSQL                       | `feature/phase-6-pg-migration`              | ✅          |
| 7    | Web app consome API (remove sql.js)         | `feature/phase-7-web-api`                   | ✅          |
| 8    | Mobile app consome API (remove expo-sqlite) | `feature/phase-8-mobile-api`                | ✅          |
| 9    | Oracle Cloud: infra, deploy e hardening     | `feature/phase-9-cloud-deploy`              | ✅          |
| 10   | CI/CD (GitHub Actions + EAS Build)          | `feature/phase-10-cicd`                     | ✅          |
| 11   | Desktop Windows (Tauri — executável .exe)   | `feature/phase-11-tauri`                    | ✅          |
| —    | Security fixes + verificação de e-mail      | `feature/security-fixes-email-verification` | ✅ mergeado |
| 12   | Reorganização DB em 7 schemas de domínio    | `feature/phase-12-db-schemas`               | ✅ mergeado |

---

## Convenção de Branches

Cada fase usa branch dedicada, criada sempre a partir da fase anterior (nunca de `main` diretamente).

**Fluxo ao iniciar cada fase:**

1. `git checkout main && git checkout -b feature/phase-N-nome`
2. Implementar conforme checklist
3. Commitar e abrir PR
4. Atualizar este arquivo: marcar fase como ✅, registrar o que foi feito no log de sessões

---

## Arquitetura

### Monorepo

```
apps/web/        — React 19 + Vite + TailwindCSS
apps/mobile/     — Expo SDK 54 + Expo Router v5
apps/api/        — Hono + Drizzle (PostgreSQL) + JWT
packages/core/   — Tipos, schema, services (lógica compartilhada)
packages/ui/     — Design system (React Native primitives + Victory Native)
packages/config/ — tsconfig bases
```

### Decisões técnicas

- Turborepo + pnpm workspaces
- TypeScript strict em todo o projeto
- Drizzle ORM — valores monetários em **centavos (integer, nunca float)**
- Zustand para estado global
- Victory Native para gráficos
- Expo Router v5 (file-based routing)
- Vitest para testes unitários; Playwright para e2e
- ESLint 8 + Prettier 3 + Husky 9 (pre-commit com lint-staged)
- **Backend:** Hono + Drizzle (PG) + JWT (15min) + Argon2id + Zod
- **Banco compartilhado:** PostgreSQL na Oracle Cloud VM
- **Sem suporte offline:** web e mobile dependem de internet
- **Token mobile:** access token em `expo-secure-store`; refresh token em httpOnly cookie
- **Isolamento de dados:** `userId` sempre extraído do JWT, nunca do body
- **Desktop:** Tauri dentro de `apps/web/src-tauri/` (~5–15 MB executável)

---

## Infraestrutura — Oracle Cloud VM

### Dados da VM

| Item         | Valor                                                                                                     |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| IP público   | `163.176.42.49`                                                                                           |
| Domínio      | `ctrlcusto.duckdns.org`                                                                                   |
| Alias SSH    | `oracle-ctrl-custos`                                                                                      |
| Chave SSH    | `C:/Users/Hebert-PC/.ssh/oci_ctrl_custos`                                                                 |
| Usuário app  | `deploy`                                                                                                  |
| App dir      | `/home/deploy/ctrl-custo`                                                                                 |
| DATABASE_URL | `postgresql://ctrl_custo_user:38fff4eeb9dc1230beeb4cccd58ead6405796bcbd3b80f29@localhost:5432/ctrl_custo` |

### Arquitetura Nginx

- `location /api/` → proxy para `http://127.0.0.1:3000/` (trailing slash remove o prefixo)
- `location /` → arquivos estáticos em `/home/deploy/ctrl-custo/apps/web/dist/`
- **VITE_API_URL correto:** `https://ctrlcusto.duckdns.org/api`

### Scripts de deploy

| Arquivo             | Finalidade                                               |
| ------------------- | -------------------------------------------------------- |
| `deploy/setup.sh`   | Roda **uma vez** como root — instala tudo na VM          |
| `deploy/deploy.sh`  | Roda a cada deploy — pull, install, migrate, restart PM2 |
| `deploy/backup.sh`  | Backup diário do PostgreSQL (cron 03:00 UTC)             |
| `deploy/nginx.conf` | Configuração do proxy reverso                            |

### CI/CD — GitHub Actions

| Workflow         | Trigger               | O que faz                           |
| ---------------- | --------------------- | ----------------------------------- |
| `ci.yml`         | Todo push/PR          | typecheck + lint + testes Vitest    |
| `deploy-api.yml` | CI verde na `main`    | SSH na VM → `deploy/deploy.sh`      |
| `deploy-web.yml` | CI verde na `main`    | Build React + rsync `dist/` para VM |
| `eas.yml`        | Manual / tag `v*.*.*` | Build Android APK/AAB via EAS       |
| `tauri.yml`      | Manual / tag `v*.*.*` | Build Windows `.msi`/`.exe`         |

### GitHub Secrets necessários

| Secret           | Valor                              | Status         |
| ---------------- | ---------------------------------- | -------------- |
| `VITE_API_URL`   | `http://ctrlcusto.duckdns.org/api` | ✅ configurado |
| `ORACLE_HOST`    | `163.176.42.49`                    | ✅ configurado |
| `ORACLE_USER`    | `deploy`                           | ✅ configurado |
| `ORACLE_SSH_KEY` | chave privada ed25519              | ✅ configurado |
| `EXPO_TOKEN`     | token expo.dev                     | ✅ configurado |

---

## Status Atual da VM

| Item                 | Status | Observação                                                                 |
| -------------------- | ------ | -------------------------------------------------------------------------- |
| Nginx                | ✅     | rodando                                                                    |
| PostgreSQL 16        | ✅     | rodando                                                                    |
| PM2 `ctrl-custo-api` | ✅     | online em fork mode — logs em `/home/deploy/logs/api-out.log`              |
| Frontend acessível   | ✅     | `https://ctrlcusto.duckdns.org`                                            |
| API health           | ✅     | `http://ctrlcusto.duckdns.org/api/health`                                  |
| CORS                 | ✅     | resolvido                                                                  |
| Migração 0000        | ✅     | aplicada                                                                   |
| Migração 0001        | ✅     | aplicada manualmente (colunas adicionadas a `auth.users`)                  |
| Migração 0002        | ✅     | aplicada (7 schemas + 6 views em `reports.*`)                              |
| Cadastro de conta    | ✅     | funcionando                                                                |
| HTTPS/SSL            | ✅     | Certificado Let's Encrypt ativo — expira 2026-08-04 (renovação automática) |
| CI/CD automático     | ✅     | CI + Deploy API + Deploy Web funcionando                                   |

---

## Pendências Prioritárias

1. **Reabrir cadastro** quando encerrar fase de testes — alterar `REGISTRATION_ENABLED = true` em `apps/web/src/pages/Login/index.tsx`

---

## Backlog de Melhorias — Feedback de Usuários

### Feedback — Danilo (PB) — 2026-05-06

Coletado via WhatsApp após primeira sessão de uso real.

---

#### 1. Dashboard: mostrar fluxo mensal em vez de saldo bancário

**Prioridade:** Alta
**Origem:** "Como é um relatório mensal, acho que você deveria ter receitas e saídas. Em vez de ele tirar do saldo da conta, tirar da sua receita mensal."
**O que fazer:**

- Mover o resumo mensal (Receitas / Saídas / Saldo do mês) para o topo do Dashboard como card principal
- O saldo bancário das contas passa a ser informação secundária, visível em "Carteiras"
- Não altera a lógica de negócio — transações continuam afetando o saldo das contas. Apenas a hierarquia visual muda.

**Gráficos interativos no card de resumo (dois níveis):**

- **Nível 1 — clicar no total do mês:** abre gráfico de pizza com Entradas vs Saídas do mês atual (ex: 40% entradas · 60% saídas)
- **Nível 2 — clicar na fatia de Saídas:** detalha as saídas por categoria (ex: 35% Aluguel · 20% Alimentação · 15% Transporte · …)
- **Nível 2 — clicar na fatia de Entradas:** detalha as entradas por categoria (ex: 70% Salário · 20% Freelance · 10% Outros)
- Ambos os detalhamentos usam as categorias reais criadas pelo usuário
- Gráficos usam o `PieChart` já disponível em `packages/ui` — dados calculados das transações do mês já carregadas no Dashboard
- Clicar fora ou no card novamente fecha o gráfico e volta ao nível anterior

---

#### 2. Renomear "Contas" para "Carteiras"

**Prioridade:** Alta (junto com item 1)
**Origem:** "Acho que a 'conta' não deveria se chamar 'conta'. A conta ser algo separado."
**O que fazer:**

- Renomear o item de navegação "Contas" → "Carteiras" no Sidebar
- Renomear labels na página de Settings onde aparece "Conta"
- Ajuste apenas de texto/label, sem alteração de schema ou lógica

---

#### 3. Gráficos no Dashboard e Relatórios

**Prioridade:** Média
**Origem:** "Gráficos vai ser legal."
**O que fazer:**

- Dashboard: gráfico de pizza com gastos por categoria do mês atual
- Relatórios: gráfico de barras comparando receitas vs despesas dos últimos 6 meses
- Relatórios: gráfico de linha com evolução do saldo ao longo do ano
- `packages/ui` já tem `BarChart`, `LineChart` e `PieChart` (Victory Native) — só integrar

---

#### 4. Seção de Investimentos

**Prioridade:** Média
**Origem:** "Sinto falta de uma parte de investimentos."
**O que fazer:**

- Criar rota `GET/POST/PUT/DELETE /investments` na API (schema `investments` já existe no banco)
- Criar página `/investments` no web com listagem e formulário
- Adicionar item "Investimentos" na navegação
- Categorias de investimento já existem no seed (tipo `income` — "Investimentos")
- Ver schema `portfolioSchema` no banco — tabela `investments` já está criada na migration 0002

---

#### Feedback positivo registrado

- "Gostei demais da UI" — validação da direção visual atual.

---

### Feedback — Iramaya — 2026-05-06

Coletado após primeira sessão de uso real.

---

#### 1. Cartão pede conta duas vezes

**Prioridade:** Alta
**Origem:** "Quando adiciona cartão já pede conta para pagamento, mas quando vai colocar a despesa e seleciona cartão pede conta novamente."
**O que fazer:**

- Ao selecionar um cartão no formulário de transação, preencher/ocultar o campo de conta automaticamente usando a conta vinculada ao cartão
- O campo "conta" não deve aparecer quando um cartão já está selecionado (a conta é implícita)

---

#### 2. Depósito de meta não gera transação

**Prioridade:** Alta
**Origem:** "Depósito da meta não está entrando na transação."
**O que fazer:**

- Verificar o endpoint `POST /goals/:id/deposit` — ao depositar deve criar uma transação do tipo `expense` na conta vinculada com categoria "Metas"
- Confirmar se a lógica existe na API ou se foi omitida

---

#### 3. Detalhamento ao clicar no cartão

**Prioridade:** Média
**Origem:** "Tem como clicar no cartão e ver o detalhamento do cartão?"
**O que fazer:**

- Criar página/modal de detalhe do cartão com: transações do mês, fatura atual, limite disponível
- Na listagem de cartões, tornar cada card clicável

---

#### 4. Personalização de cor dos cartões

**Prioridade:** Baixa
**Origem:** "Tem como personalizar as cores dos cartões igual personaliza para as contas?"
**O que fazer:**

- Verificar se o formulário de cartão já expõe o campo `color` — se não, adicionar seletor de cor igual ao de contas

---

#### 5. Editar transação ao invés de só excluir

**Prioridade:** Alta
**Origem:** "Ao invés de excluir totalmente uma transação, tem como editar ela?"
**O que fazer:**

- Adicionar botão "Editar" nas transações (endpoint `PUT /transactions/:id` já existe na API)
- Abrir o formulário pré-preenchido com os dados da transação selecionada

---

#### 6. Saldo negativo em vermelho

**Prioridade:** Média
**Origem:** "Quando o saldo total fica negativo, dá para mudar de verde para vermelho?"
**O que fazer:**

- No Dashboard (BalanceCard) e em qualquer lugar que exiba saldo total, aplicar cor condicional: verde se ≥ 0, vermelho se < 0

---

## Novas Features Planejadas

---

### 1. Contas Família — acesso compartilhado entre múltiplos usuários

**Prioridade:** Média
**Ideia:** Dois ou mais e-mails acessam as mesmas informações financeiras (transações, contas, metas, cartões). Útil para casais ou famílias que gerenciam o orçamento juntos.

#### Como implementar

**Banco de dados** — o schema `household` já existe (criado na migration 0002, vazio, reservado para essa feature):

- `household.groups` — id, name, owner_id, created_at
- `household.members` — group_id, user_id, role (`owner` | `member`), invited_at, accepted_at
- `household.invites` — id, group_id, invited_email, token (UUID), expires_at, accepted_at

**API (`apps/api`):**

- `POST /family/create` — cria grupo, adiciona o próprio usuário como owner
- `POST /family/invite` — gera token de convite, envia e-mail com link de aceitação
- `GET /family/accept?token=xxx` — valida token, adiciona usuário ao grupo
- `GET /family/members` — lista membros do grupo
- `DELETE /family/members/:userId` — remove membro (só owner pode)
- Todas as rotas de dados (`/transactions`, `/accounts`, etc.) precisam aceitar `groupId` extraído do JWT ou do membership — escopo muda de `userId` para `groupId`

**Web (`apps/web`):**

- Aba **"Família"** em Configurações
- Listar membros com e-mail e papel (dono / membro)
- Botão "Convidar" abre campo de e-mail e dispara convite
- Botão "Remover" para o owner excluir membros
- Página `/family/accept?token=xxx` para o convidado confirmar o ingresso

**Complexidade:** Alta — a mudança de escopo `userId → groupId` afeta todas as queries da API. Melhor implementar em branch dedicada (`feature/family-accounts`) e fazer migration separada.

---

### 2. Seção de Investimentos — Carteira

**Prioridade:** Média
**Ideia:** Página dedicada para o usuário registrar seus aportes em ações, FIIs e ETFs da B3. O foco é facilitar o cadastro — o usuário digita o ticker e o nome do ativo é preenchido automaticamente, sem depender de API externa.

#### Como implementar

**Autocomplete de tickers — lista estática embutida no app**

- Criar um arquivo JSON em `apps/web/src/data/b3-tickers.json` com todos os ativos da B3 (~500 itens): ticker + nome completo + tipo (ação, FII, ETF)
- Sem API, sem rate limit, funciona offline, sempre disponível
- Lista muda raramente (novos IPOs e delistings ocasionais) — atualização manual algumas vezes por ano
- Exemplo de entrada: `{ "ticker": "PETR4", "name": "Petróleo Brasileiro S.A. — Petrobras PN", "type": "stock" }`

**Fluxo de cadastro:**

1. Usuário digita o ticker (ex: "PETR") → autocomplete sugere os ativos correspondentes
2. Seleciona o ativo → nome preenchido automaticamente
3. Informa quantidade e preço médio de compra — o app calcula o valor total do aporte
4. Para ativos não listados (renda fixa, cripto, exterior) → preenchimento manual livre

**Backend (`apps/api`):**

- Rotas `GET/POST/PUT/DELETE /investments` (tabela `portfolio.investments` já existe na migration 0002)
- Campos: `ticker` (opcional), `name`, `quantity`, `averagePrice` (centavos), `type` (stock | fii | etf | other)

**Web (`apps/web`):**

- Página `/investments` com listagem dos aportes cadastrados
- Formulário com autocomplete de ticker via lista estática
- Exibição: ticker, nome, quantidade, preço médio, valor total do aporte
- Adicionar item "Carteira" na navegação (Sidebar)
- **Card de total investido clicável:** exibe o valor total da carteira; ao clicar, abre um gráfico de pizza com a distribuição percentual por tipo de ativo (ex: 60% FII · 30% Ações · 10% ETF). O gráfico usa o `PieChart` já disponível em `packages/ui`. Clicar fora ou no card novamente fecha o gráfico.

**Complexidade:** Média — o maior trabalho é criar as rotas na API e a página web. O autocomplete com lista estática é simples de implementar.

---

## Log de Sessões

### 2026-05-06 — Hotfixes pós-testes com usuários reais

#### O que foi feito

- **fix(api):** rate limit movido de `authRouter.use("*")` para por rota — `/refresh` não contava mais para o limite, causando "too many requests" no uso normal
- **fix(web):** erro de senha incorreta no login não aparecia na tela — `req()` interceptava o 401 e fazia `window.location.replace("/login")` antes do `catch` setar o erro; corrigido com flag `hadToken`
- **fix(web):** cadastro de novas contas desabilitado temporariamente via `REGISTRATION_ENABLED = false` em `Login/index.tsx` — só usuários tester por enquanto
- **fix(deploy):** `ecosystem.config.cjs` trocado de `instances: 1` (cluster mode) para `exec_mode: fork` — resolve logs vazios (PM2 adicionava sufixo `-0` nos arquivos de log divergindo do caminho configurado)
- **chore:** deploy manual corrigido — comando de build é `pnpm --filter web build` (não `@ctrl-custo/web`)
- **ops:** conta `iramaya@teste.com` desbloqueada via SQL (failed_attempts zerado)

#### Pendências em aberto

- PM2 ainda roda em cluster mode na VM — `exec_mode: fork` commitado mas precisa de `pm2 delete + pm2 start` para vigorar (não urgente)
- CI/CD automático ainda sem secrets SSH configurados
- Reabrir cadastro (`REGISTRATION_ENABLED = true`) quando encerrar fase de testes

---

### 2026-05-06 — Reorganização do banco em schemas de domínio (Fase 12)

#### O que foi implementado (PR #8 — mergeado)

- **feat(db):** migration `0002_db_schemas.sql` — cria 7 schemas (`auth`, `banking`, `ledger`, `planning`, `portfolio`, `household`, `reports`)
- Move todas as tabelas e enums do schema `public` para seus schemas de domínio
- Reconfigura permissões do `ctrl_custo_user` em todos os schemas
- Cria 6 views analíticas em `reports.*`: `monthly_cashflow`, `category_spending`, `goal_progress`, `portfolio_performance`, `net_worth`, `card_statement`
- **refactor(api):** `apps/api/src/db/schema.ts` atualizado com `pgSchema` — queries Drizzle usam nomes totalmente qualificados (ex: `banking.accounts`)
- **docs:** `CLAUDE.md` documentada regra de não adicionar Co-Authored-By nos commits
- Schema `household` criado (vazio) — reservado para feature família futura

#### Pendências em aberto (herdadas)

- GitHub Secrets para CI/CD ainda não configurados (`ORACLE_HOST`, `ORACLE_USER`, `ORACLE_SSH_KEY`, `EXPO_TOKEN`)
- ⚠️ `VITE_API_URL` atualizado para `https` no GitHub Secret — próximo deploy do web rebuilda o frontend com a URL correta
- ⚠️ Migration `0001` foi aplicada **manualmente** (não via `pnpm db:migrate`) — hash registrado em `drizzle.__drizzle_migrations` para evitar reaplicação futura

---

### 2026-05-05 — Security fixes + verificação de e-mail + primeiro debug pós-deploy

#### O que foi implementado (PR #7 — mergeado)

- **fix(api):** IDOR em `transactions.ts` — validação de ownership do `accountId`
- **fix(api):** timing side-channel em `auth.ts` — hash dummy para e-mails inexistentes
- **fix(api):** validação de `JWT_SECRET` na inicialização (`token.ts`)
- **feat(api):** migração `0001_email_verification.sql` — colunas `email_verified`, `email_verification_token`, `email_verification_expires_at`
- **feat(api):** `lib/email.ts` com nodemailer (SMTP)
- **feat(api):** `/register` não emite JWT — envia e-mail de confirmação
- **feat(api):** `/login` bloqueia usuários não verificados (403 + code)
- **feat(api):** `GET /auth/verify-email?token=xxx` e `POST /auth/resend-verification`
- **feat(web):** página `/verify-email`, tela de bloqueio no Login, botão "Reenviar"

#### Problemas resolvidos

- **CORS:** frontend buildado sem `VITE_API_URL` usava fallback `localhost:3000`. Rebuiltado com `VITE_API_URL=http://ctrlcusto.duckdns.org/api`. GitHub Secret configurado.
- **Logs PM2 vazios:** `ecosystem.config.cjs` aponta para `api-error.log` mas PM2 cria `api-error-0.log`. Workaround: usar `curl` direto para ver erros.

#### Problema em aberto

- **500 no `POST /api/auth/register`:** migração `0001` não foi aplicada ao banco. `drizzle.__drizzle_migrations` tem só a migration `0000`. Arquivo existe na VM. Motivo ainda não confirmado — sessão encerrada antes de concluir.

---

## O Que Foi Feito em Cada Fase

### Fase 0 — Monorepo & estrutura

- `package.json` raiz, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json`, `.gitignore`

### Fase 1 — packages/core

- Tipos TypeScript, schema Drizzle, services, 31 testes Vitest

### Fase 2 — packages/ui

- Design tokens (colors, typography, spacing), Button/Input/Card/Badge/Modal/CurrencyInput, gráficos Victory Native

### Fase 3 — apps/web

- Vite + React 19 + TailwindCSS, stores Zustand, 6 páginas (Dashboard, Transactions, Cards, Goals, Reports, Settings)

### Fase 4 — apps/mobile

- Expo SDK 54, Expo Router v5, stores Zustand, tab bar com 5 telas, formulários bottom sheet, biometria, modo oculto

### Fase 5 — Backend API

- Hono + Drizzle + JWT + Argon2id + Zod, rotas para todas as entidades, rate limiting, refresh token em httpOnly cookie

### Fase 6 — Migrations PostgreSQL

- `apps/api/drizzle/0000_violet_shriek.sql` com 7 enums e 7 tabelas, script `db:migrate`

### Fase 7 — Web consome API

- Remove sql.js, cria `api.ts` (cliente HTTP com refresh automático), `useAuth.ts`, tela de login, atualiza todos os stores

### Fase 8 — Mobile consome API

- Remove expo-sqlite, cria `api.ts` (adaptado para RN), `expo-secure-store` para tokens, tela de login

### Fase 9 — Oracle Cloud

- `setup.sh` (instala tudo: Nginx, PostgreSQL, PM2, Certbot, fail2ban, UFW), `deploy.sh`, `backup.sh`, `nginx.conf`, `ecosystem.config.cjs`

### Fase 10 — CI/CD

- 5 workflows GitHub Actions (ci, deploy-api, deploy-web, eas, tauri), Playwright smoke tests

### Fase 11 — Desktop Tauri

- `apps/web/src-tauri/` com `tauri.conf.json`, `main.rs`, `Cargo.toml`, capabilities mínimas, workflow `tauri.yml`

### Security fixes (pós Fase 11)

- IDOR fix, timing side-channel fix, JWT validation, verificação de e-mail completa (API + Web)
