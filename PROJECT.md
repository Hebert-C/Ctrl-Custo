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

#### 1. Dashboard: mostrar fluxo mensal em vez de saldo bancário ✅

**Prioridade:** Alta
**Origem:** "Como é um relatório mensal, acho que você deveria ter receitas e saídas. Em vez de ele tirar do saldo da conta, tirar da sua receita mensal."
**O que fazer:**

- Mover o resumo mensal (Receitas / Saídas / Saldo do mês) para o topo do Dashboard como card principal
- O saldo bancário das contas passa a ser informação secundária, visível em "Bancos"
- Não altera a lógica de negócio — transações continuam afetando o saldo das contas. Apenas a hierarquia visual muda.

**✅ Implementado — Gráficos interativos no card de resumo (dois níveis):**

- **Nível 1 — clicar no total do mês:** abre gráfico de pizza com Entradas vs Saídas do mês atual (ex: 40% entradas · 60% saídas)
- **Nível 2 — clicar na fatia de Saídas:** detalha as saídas por categoria (ex: 35% Aluguel · 20% Alimentação · 15% Transporte · …)
- **Nível 2 — clicar na fatia de Entradas:** detalha as entradas por categoria (ex: 70% Salário · 20% Freelance · 10% Outros)
- Ambos os detalhamentos usam as categorias reais criadas pelo usuário
- Gráficos usam o `PieChart` já disponível em `packages/ui` — dados calculados das transações do mês já carregadas no Dashboard
- Clicar fora ou no card novamente fecha o gráfico e volta ao nível anterior

---

#### 2. Renomear "Contas" para "Bancos" ✅

**Prioridade:** Alta (junto com item 1)
**Origem:** "Acho que a 'conta' não deveria se chamar 'conta'. A conta ser algo separado."
**Implementado:** Renomeado para "Bancos" em toda a UI (PR #10). "Carteira" está reservado para a seção de Investimentos.

---

#### 3. Gráficos no Dashboard e Relatórios ✅

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

#### 1. Cartão pede conta duas vezes ✅

**Prioridade:** Alta
**Origem:** "Quando adiciona cartão já pede conta para pagamento, mas quando vai colocar a despesa e seleciona cartão pede conta novamente."
**Implementado:** `TransactionForm.tsx` — `handleCardChange` preenche `accountId` automaticamente; campo "Banco" oculto via `{!cardSelected && ...}` quando cartão está selecionado.

---

#### 2. Depósito de meta não gera transação ✅

**Prioridade:** Alta
**Origem:** "Depósito da meta não está entrando na transação."
**Implementado:** API já criava a transação corretamente. Fix `8e8336f`: `Goals/index.tsx` agora chama `loadAccs()` após o depósito, refletindo o saldo debitado sem recarregar a página.

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

#### 5. Editar transação ao invés de só excluir ✅

**Prioridade:** Alta
**Origem:** "Ao invés de excluir totalmente uma transação, tem como editar ela?"
**Implementado:** Botão "Editar" na listagem (`Transactions/index.tsx` linha 160), form suporta `editingTx`, store tem `update()`, API tem `PUT /transactions/:id`.

---

#### 6. Saldo negativo em vermelho ✅

**Prioridade:** Média
**Origem:** "Quando o saldo total fica negativo, dá para mudar de verde para vermelho?"
**Implementado:** `BalanceCard.tsx` — `isNegative = totalBalance < 0` aplica `text-red-500` no valor e ícone quando saldo é negativo.

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

### 3. Pagamentos Recorrentes — aba de contas fixas

**Prioridade:** Média
**Ideia:** Aba dedicada para cadastrar contas que se repetem todo mês — luz, água, financiamento, fatura do cartão, internet, aluguel, etc. O app notifica no dia do vencimento e, quando o usuário confirma o pagamento, informa o valor e uma transação de saída é criada automaticamente na conta escolhida.

#### Fluxo de uso

1. Usuário cadastra uma conta recorrente: nome, categoria, dia de vencimento, valor estimado (opcional) e banco de débito
2. No dia do vencimento (ou X dias antes), o app exibe um alerta/badge na aba
3. Usuário clica em "Confirmar pagamento" → informa o valor real pago → transação `expense` criada automaticamente
4. Histórico de pagamentos visível por conta recorrente (meses pagos / em aberto)

#### Como implementar

**Banco de dados — nova tabela em `planning` schema (migration 0003):**

```sql
planning.recurring_bills (
  id           uuid primary key,
  user_id      uuid references auth.users,
  name         text not null,              -- "Conta de Luz", "Financiamento Carro"
  category_id  uuid references ledger.categories,
  account_id   uuid references banking.accounts,
  due_day      integer not null,           -- dia do mês (1–31)
  amount_cents integer,                    -- valor estimado (nullable — boleto varia)
  is_active    boolean default true,
  created_at   timestamptz default now()
)

planning.recurring_payments (
  id                  uuid primary key,
  recurring_bill_id   uuid references planning.recurring_bills,
  transaction_id      uuid references ledger.transactions,  -- transação gerada
  due_date            date not null,       -- vencimento daquele mês
  paid_at             timestamptz,
  amount_cents        integer not null,    -- valor real pago
  created_at          timestamptz default now()
)
```

**API (`apps/api`):**

- `GET/POST/PUT/DELETE /recurring-bills` — CRUD das contas recorrentes
- `POST /recurring-bills/:id/pay` — confirma pagamento: cria `ledger.transactions` (expense) + insere em `recurring_payments`
- `GET /recurring-bills/due` — lista as contas com vencimento nos próximos 7 dias (para notificações/badge)

**Web (`apps/web`):**

- Nova rota `/recurring` na navegação (Sidebar)
- Lista de contas recorrentes com status do mês atual: `Pendente` / `Pago`
- Badge com contagem de vencimentos próximos no item do menu
- Botão "Pagar" abre modal: campo de valor (pré-preenchido com estimativa se houver) + confirmação
- Histórico expandível por conta: linha do tempo mensal

**Complexidade:** Média — duas tabelas novas, rotas simples na API, página nova no web. A notificação no vencimento pode ser implementada como badge/highlight passivo (sem push notification) em uma primeira versão.

---

### 4. Visão de Parcelas Futuras — "Ver o Futuro"

**Prioridade:** Média
**Ideia:** Mostrar no Dashboard (ou numa seção dedicada) as parcelas que vencem no próximo mês, com indicação clara de progresso (ex: parcela 3/10). O usuário também pode quitar todas as parcelas restantes de uma vez, informando o valor real pago (bancos frequentemente concedem desconto na quitação antecipada).

#### Fluxo de uso

1. No Dashboard ou aba de Transações, um card/seção "Próximo mês" lista as parcelas com vencimento no mês seguinte
2. Cada item exibe: descrição, valor da parcela, progresso (ex: `3/10`)
3. Botão **"Quitar antecipado"** abre modal com:
   - Valor original restante calculado automaticamente (parcelas × valor unitário)
   - Campo editável para o usuário informar o valor real cobrado pelo banco (com desconto)
   - Confirmação cria uma transação `expense` com o valor informado e marca todas as parcelas restantes como pagas
4. As parcelas já pagas somem da listagem; as futuras continuam aparecendo mês a mês

#### Como implementar

**Banco de dados — sem migration nova:**

- As parcelas já existem como transações individuais com `installment: { total, current, groupId }` linkadas por `groupId`
- Para quitar: buscar todas as transações do grupo com `current > atual` → criar uma transação de quitação + marcar as parcelas restantes como `status: "paid"` ou deletá-las

**API (`apps/api`):**

- `GET /transactions/upcoming?month=YYYY-MM` — retorna transações (incluindo parcelas) com `date` no mês informado; por padrão retorna o próximo mês
- `POST /transactions/installments/:groupId/settle` — quitação antecipada: recebe `amountCents` (valor real pago), cria transação de quitação, cancela/remove parcelas restantes do grupo

**Web (`apps/web`):**

- Card "Próximo Mês" no Dashboard: lista compacta com as parcelas do mês seguinte (máximo 5, com link "ver todas")
- Badge com total de parcelas futuras e soma dos valores
- Modal de quitação: mostra quantas parcelas restam, valor original total, campo para digitar valor com desconto, botão confirmar
- Na listagem de Transações: filtro/aba "Futuras" para ver todas as parcelas projetadas além do mês atual

**Complexidade:** Média — a lógica de `groupId` já existe; o principal trabalho é a query de `upcoming` e o fluxo de quitação na API + UI do modal.

---

### 5. Assistente Financeiro com IA — Dicas sobre o saldo do mês

**Prioridade:** Média — ⚠️ requer monetização
**Observação de custo:** Cada chamada à Claude API (Haiku 4.5) custa ~$0,002. Com limite de 1 dica/usuário/mês o custo é negligenciável em escala pequena, mas existe e escala com usuários. Implementar somente quando o app tiver plano pago, ou com limite rígido de 1 chamada/mês por usuário como diferencial de plano premium.
**Ideia:** Um assistente de IA analisa o perfil financeiro do usuário e o saldo que sobrou no mês, sugerindo o que pode ser feito com esse dinheiro. O assistente nunca promete retornos garantidos nem cria expectativas irreais — sempre apresenta as sugestões como possibilidades, não verdades. O usuário aceita um termo de ciência antes de usar o recurso pela primeira vez.

#### Perfil do investidor

Antes de usar o assistente, o usuário responde um questionário simples (3–5 perguntas) que classifica seu perfil:

- **Conservador** — prioriza segurança, aceita rendimentos menores (ex: CDB, Tesouro Direto, poupança)
- **Moderado** — aceita algum risco por retornos maiores (ex: fundos multimercado, FIIs)
- **Arrojado** — disposto a risco maior (ex: ações, ETFs, criptomoedas)

O perfil fica salvo nas configurações e pode ser alterado a qualquer momento.

#### Disclaimer obrigatório

Na primeira vez que o usuário acessa o assistente, exibe modal com:

> "As sugestões geradas são educativas e não constituem consultoria financeira. O Ctrl+Custo não se responsabiliza por decisões tomadas com base nestas informações. Consulte um profissional habilitado antes de investir."

Botão "Entendi e aceito" registra o aceite com timestamp. Sem aceite, o recurso não está disponível.

#### Contexto enviado à IA

O assistente recebe (nunca dados pessoais identificáveis):

- Saldo disponível no mês (valor em reais)
- Perfil do investidor (conservador / moderado / arrojado)
- Resumo das categorias de gasto do mês (% por categoria, sem descrições de transações)
- Mês/ano de referência

#### Prompt base (instruções para a IA)

```
Você é um assistente financeiro educativo. Analise o contexto abaixo e sugira 2 a 3 opções do que o usuário pode fazer com o saldo disponível, considerando o perfil informado.

Regras obrigatórias:
- Nunca prometa retornos garantidos
- Use linguagem como "pode considerar", "uma possibilidade é", "alguns especialistas recomendam"
- Mencione sempre que sugestões não são consultoria financeira
- Seja objetivo: máximo 4 linhas por sugestão
- Foque em opções acessíveis para o valor disponível
- Não cite nomes de corretoras ou produtos específicos de terceiros
```

#### Como implementar

**Banco de dados — `auth.users` + nova coluna (migration 0003 ou 0004):**

```sql
-- adicionar em auth.users:
investor_profile   text check (value in ('conservative','moderate','aggressive')),
ai_terms_accepted_at timestamptz
```

**API (`apps/api`):**

- `POST /settings/investor-profile` — salva perfil selecionado
- `POST /settings/ai-terms-accept` — registra aceite do disclaimer com timestamp
- `POST /ai/financial-tip` — recebe `{ availableBalance, month }`, monta contexto com dados do usuário, chama Claude API (modelo `claude-haiku-4-5-20251001` para custo baixo), retorna sugestão em texto

**Claude API — integração no backend:**

- Usar `@anthropic-ai/sdk` em `apps/api`
- `ANTHROPIC_API_KEY` como variável de ambiente na VM (GitHub Secret + `ecosystem.config.cjs`)
- Prompt com system instructions fixas + contexto dinâmico por chamada
- Sem histórico de conversa — cada dica é stateless (sem memória entre chamadas)

**Web (`apps/web`):**

- Card "Dica do Mês" no Dashboard: aparece quando há saldo positivo no mês e o usuário aceitou o disclaimer
- Botão "Gerar dica" → loading → exibe sugestão da IA em texto formatado
- Link "Alterar perfil" nas Configurações abre questionário de reclassificação
- Modal de disclaimer na primeira vez que o usuário clica em "Gerar dica"

**Complexidade:** Média — o maior cuidado é o prompt (tom correto, sem promessas) e a integração com a Claude API no backend. A UI é simples.

---

## Bugs e Melhorias — 2026-05-07

### Bugs

#### 1. Parcelas no cartão não são divididas nem projetadas ✅

**Prioridade:** Alta
**Sintoma:** Criar despesa de R$1.000 em 4x no cartão registra o valor inteiro em vez de dividir em R$250 por mês e gerar as 4 parcelas nos meses seguintes.
**Implementado — fix `0b2a3d9`:** `addInstallments` divide `amount / total` com `Math.round` e projeta `+i meses` por parcela. Dashboard e Transactions chamam `addInstallments` corretamente.

---

#### 2. Saldo da conta não atualiza ao adicionar transação ✅

**Prioridade:** Alta
**Sintoma:** Após adicionar uma transação pelo modal do Dashboard, o "Saldo nos Bancos" continua mostrando o valor antigo até recarregar a página.
**Implementado — fix `0b2a3d9`:** Dashboard e Transactions chamam `loadAccounts()` após qualquer `add` ou `addInstallments`.

---

### Melhorias

#### 3. Detalhamento no card "Saldo nos Bancos"

**Prioridade:** Média
**Ideia:** Clicar no card "Saldo nos Bancos" abre um detalhamento com cada banco separado — nome, tipo e saldo individual. Padrão igual ao donut do Saldo do Mês, mas aqui é uma lista simples (não gráfico), já que pode haver poucos bancos cadastrados.
**O que fazer:**

- Toggle ao clicar no card: abre painel abaixo com lista de bancos (nome · tipo · saldo)
- Saldo de cada banco em vermelho se negativo
- Fechar clicando novamente no card ou no ✕

---

#### 4. Relatórios — incluir mês atual

**Prioridade:** Média
**Sintoma:** O seletor de 3/6/12 meses em Relatórios exibe os meses passados mas pode não incluir o mês atual de forma clara.
**O que fazer:**

- Verificar se `lastNMonths(n)` inclui o mês atual — se não, corrigir
- Adicionar opção "Mês atual" no seletor para ver apenas o mês em curso isolado
- Na tabela de evolução, destacar visualmente a linha do mês atual (negrito ou fundo sutil)

---

#### 5. Clarificar o conceito de Transferência ✅

**Prioridade:** Média
**Implementado — `984294b`:** Campo "Banco de destino" aparece no form quando tipo = Transferência; API debita origem e credita destino atomicamente; PUT/DELETE revertem ambas as contas. Migration `0003` adiciona `destination_account_id` na tabela.
Migration `0003` será aplicada automaticamente pelo CI/CD no próximo push (deploy.sh → pnpm db:migrate).

---

## Log de Sessões

### 2026-05-08 — Correção de bugs, backlog e feature de transferência

#### O que foi feito

- **fix(store) — `0b2a3d9`:** `addInstallments` divide valor por parcela e projeta datas mensais; Dashboard e Transactions chamam `loadAccounts()` após criar transação
- **fix(web) — `8e8336f`:** depósito de meta chama `loadAccs()` após confirmar, refletindo saldo debitado sem recarregar
- **Verificações:** "Editar transação", "Cartão pede conta duas vezes" e "Saldo negativo em vermelho" já estavam implementados — confirmado no código
- **docs:** backlog atualizado com ✅ em todos os itens já implementados; adicionadas features: Pagamentos Recorrentes, Visão de Parcelas Futuras, Assistente Financeiro com IA (⚠️ requer monetização), lista de ordem de implementação
- **feat(transfer) — `984294b`:** campo "Banco de destino" no formulário de transação (tipo Transferência); API debita origem e credita destino atomicamente; PUT/DELETE revertem ambas as contas; migration `0003_transfer_destination.sql`
- **fix(migrate) — `97936b6`:** adicionada entrada da `0003` no `meta/_journal.json` — sem isso o Drizzle ignora o arquivo silenciosamente mesmo com deploy success
- **Descoberta:** migrations automatizadas funcionam corretamente via CI/CD; SSH local conecta como `ubuntu` (sem acesso ao `.env`), não como `deploy`; arquivos SQL criados manualmente precisam de entrada no `_journal.json`
- Migration `0003` confirmada aplicada na VM — coluna `destination_account_id` presente em `ledger.transactions`

#### Pendências em aberto (ordem de implementação)

1. **Detalhamento ao clicar no cartão** — transações do mês, fatura, limite (Média)
2. **Detalhamento ao clicar em "Saldo nos Bancos"** — lista por banco (Média)
3. **Relatórios — opção "Mês atual" no seletor** (Média)
4. **Cor dos cartões** — seletor de cor no formulário (Baixa)

- **Mobile:** Dashboard mobile com fluxo mensal + donut (branch `feature/mobile-dashboard-improvements`)

---

### 2026-05-07 — UX improvements + gráficos + planejamento de features

#### O que foi feito

- **chore:** `CONTEXT.md` removido do repositório (já migrado para `PROJECT.md`)
- **feat(web) — PR #10:** Renomear "Contas" → "Bancos" em toda a UI; botão "+ Adicionar" no Dashboard abre modal de transação direto; saldo negativo em vermelho no BalanceCard
- **feat(web) — PR #12:** Dashboard reorganizado com fluxo mensal (Receitas/Despesas/Saldo do Mês) como hero em largura total; "Saldo nos Bancos" vira card compacto secundário; donut interativo em dois níveis ao clicar no Saldo do Mês; `BarChart` e `LineChart` SVG puros adicionados à página de Relatórios
- **docs:** Adicionado planejamento de Contas Família (schema `household` já reservado no banco) e seção Carteira com lista estática de tickers B3 + autocomplete
- **docs:** Gráfico de pizza na Carteira (distribuição por tipo de ativo) e gráficos interativos em dois níveis no Dashboard documentados
- **docs:** Plano mobile documentado (itens 1, 2 e 3B no Dashboard mobile usando `react-native-svg`)
- **docs:** 2 bugs e 3 melhorias registrados após teste com usuário

#### Pendências em aberto

- **Bug (alta):** Parcelas no cartão não dividem o valor nem projetam para meses seguintes
- **Bug (alta):** Saldo nos Bancos não atualiza após adicionar transação pelo modal do Dashboard
- **Melhoria:** Detalhamento ao clicar em "Saldo nos Bancos" (lista por banco)
- **Melhoria:** Relatórios incluir mês atual no seletor
- **Melhoria:** Transferência — adicionar campo "banco de destino" e clarificar que não conta como receita/despesa
- **Mobile:** Implementar itens 1, 2 e 3B no Dashboard mobile (branch `feature/mobile-dashboard-improvements` a criar a partir de `main`)

---

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
