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

| 13 | Testes automatizados mobile (Jest+RNTL+Maestro) | `main` | ✅ |

---

## ⚠️ Ações Pendentes do Usuário

> Tarefas que não podem ser feitas via código — requerem ação manual no browser ou terminal.

### 🔑 Maestro Cloud — ativar E2E em dispositivo real

**Por que:** O workflow `.github/workflows/maestro-cloud.yml` já está criado e os flows `.maestro/*.yaml` estão prontos. Falta apenas configurar a conta e o secret para que os testes rodem automaticamente após cada EAS Build.

**Como fazer (uma vez):**

1. Acesse [cloud.mobile.dev](https://cloud.mobile.dev) → criar conta gratuita (100 runs/mês)
2. Em **Settings → API Keys**, gere uma nova chave
3. No GitHub, vá em **Settings → Secrets → Actions** e adicione:
   - Nome: `MAESTRO_API_KEY`
   - Valor: a chave gerada no passo 2
4. Pronto — após o próximo `eas.yml` no `main`, o `maestro-cloud.yml` dispara automaticamente

**O que vai rodar (flows `.maestro/`):**

- `login.yaml` → login na conta E2E
- `dashboard.yaml` → verifica dashboard + navegação por abas
- `transactions.yaml` → abre formulário de transação
- `goals.yaml` → cria uma meta completa
- `settings.yaml` → verifica tela de configurações

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

| Workflow            | Trigger                                     | O que faz                                                             |
| ------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| `ci.yml`            | Todo push/PR                                | typecheck + lint + testes Vitest (core) + Jest (mobile)               |
| `deploy-api.yml`    | CI verde na `main`                          | SSH na VM → `deploy/deploy.sh`                                        |
| `deploy-web.yml`    | CI verde na `main`                          | Build React + rsync `dist/` para VM                                   |
| `eas.yml`           | Manual / tag `v*.*.*`                       | Build Android APK/AAB via EAS                                         |
| `maestro-cloud.yml` | Após `eas.yml` na `main` / manual (APK URL) | E2E em dispositivo real via Maestro Cloud ⚠️ requer `MAESTRO_API_KEY` |
| `tauri.yml`         | Manual / tag `v*.*.*`                       | Build Windows `.msi`/`.exe`                                           |

### GitHub Secrets necessários

| Secret            | Valor                              | Status                                              |
| ----------------- | ---------------------------------- | --------------------------------------------------- |
| `VITE_API_URL`    | `http://ctrlcusto.duckdns.org/api` | ✅ configurado                                      |
| `ORACLE_HOST`     | `163.176.42.49`                    | ✅ configurado                                      |
| `ORACLE_USER`     | `deploy`                           | ✅ configurado                                      |
| `ORACLE_SSH_KEY`  | chave privada ed25519              | ✅ configurado                                      |
| `EXPO_TOKEN`      | token expo.dev                     | ✅ configurado                                      |
| `MAESTRO_API_KEY` | API key do cloud.mobile.dev        | ⚠️ **PENDENTE** — ver seção "Ações Pendentes" acima |

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

## ⚡ Próxima Sessão — Regras de Negócio Ausentes

> Levantamento feito em 2026-05-14. Implementar na ordem abaixo.
> Branch sugerida: `feature/business-rules`

---

### Prioridade 1 — Críticas (bugs silenciosos em produção)

#### RN-01 · Saldo insuficiente não bloqueia transação

**Arquivo:** `apps/api/src/routes/transactions.ts` (função `applyTransferBalances`)
**Problema:** O delta é aplicado diretamente via SQL sem verificar se o saldo resultante fica negativo. Despesas e depósitos de meta sofrem do mesmo problema.
**Regra:** Antes de debitar, buscar `account.balance` e rejeitar com HTTP 422 se `balance - amount < 0`.
**Exceção permitida:** Contas do tipo `credit` (cartão) podem ter saldo negativo dentro do limite.

---

#### RN-02 · Limite de cartão não é verificado ao criar transação

**Arquivo:** `apps/api/src/routes/transactions.ts` (POST handler)
**Problema:** `GET /cards/:id/statement` calcula `availableLimit` corretamente para exibição, mas o `POST /transactions` ignora esse cálculo. É possível gastar além do limite sem nenhum erro.
**Regra:** Se `cardId` presente na transação, buscar `creditLimit` do cartão, somar as despesas do mês vigente e rejeitar com HTTP 422 se `totalSpent + newAmount > creditLimit`.

---

#### RN-03 · Cancelar transação confirmada não reverte saldo

**Arquivo:** `apps/api/src/routes/transactions.ts` (PUT handler, função `applyTransferBalances`)
**Problema:** A lógica de reversão de saldo só existe quando o `accountId` muda. Se o status muda de `confirmed` → `cancelled`, o dinheiro não volta à conta.
**Regra:** No PUT, se `oldStatus === "confirmed"` e `newStatus === "cancelled"`, reverter o saldo da conta (e da conta de destino em transferências). Se `oldStatus === "pending"` e `newStatus === "confirmed"`, aplicar o saldo normalmente.

---

#### RN-04 · Validação de propriedade de recursos

**Arquivo:** `apps/api/src/routes/transactions.ts` (POST e PUT handlers)
**Problema:** `categoryId`, `cardId` e `destinationAccountId` são usados sem verificar se pertencem ao usuário logado.
**Regra:** Antes de inserir/atualizar, fazer `SELECT id FROM tabela WHERE id = $id AND user_id = $userId` para cada FK recebida do cliente. Retornar HTTP 404 se não encontrar (não revelar que existe mas é de outro usuário).

---

### Prioridade 2 — Altas (falhas lógicas visíveis)

#### RN-05 · Arredondamento de parcelas perde centavos

**Arquivo:** `packages/core/src/services/TransactionService.ts` (linha ~124)
**Problema:** `Math.round(amount / total)` em 3x de R$ 100 gera 3 × R$ 33 = R$ 99.
**Regra:** `amountPerInstallment = Math.round(amount / total)`. Última parcela = `amount - (total - 1) * amountPerInstallment`.

---

#### RN-06 · Transferência entre a mesma conta aceita no backend

**Arquivo:** `apps/api/src/routes/transactions.ts` (schema Zod, `transactionBody`)
**Problema:** A API aceita `accountId === destinationAccountId`. O web e mobile bloqueiam no formulário, mas sem garantia no backend.
**Regra:** Adicionar `.refine()` no schema Zod: `d.type !== "transfer" || d.accountId !== d.destinationAccountId`.

---

#### RN-07 · Conta arquivada pode ser usada em operações

**Arquivo:** `apps/api/src/routes/transactions.ts` e `apps/api/src/routes/goals.ts`
**Problema:** Nenhuma rota verifica `isArchived` antes de debitar ou creditar.
**Regra:** Ao buscar conta para uso em transação/depósito, rejeitar com HTTP 422 se `isArchived = true`.

---

#### RN-08 · Data inválida passa na validação

**Arquivos:** `apps/api/src/routes/transactions.ts`, `apps/api/src/routes/goals.ts`
**Problema:** O regex `/^\d{4}-\d{2}-\d{2}$/` aceita datas como `2024-02-30` ou `2024-13-01`.
**Regra:** Após o regex, checar `new Date(value).toISOString().startsWith(value)` ou usar `z.string().refine(isValidDate)`. Para `deadline` de metas, exigir data > hoje.

---

### Prioridade 3 — Médias (inconsistências de produto)

#### RN-09 · Depósito em meta pode exceder o valor alvo

**Arquivo:** `apps/api/src/routes/goals.ts` (rota de depósito)
**Problema:** `currentAmount` pode passar de `targetAmount` sem aviso ou bloqueio.
**Regra:** Bloquear depósito que faria `currentAmount > targetAmount` com HTTP 422 e mensagem clara. Ou permitir com aviso no response (`"warning": "meta já atingida"`).

---

#### RN-10 · Transação `pending` → `confirmed` não aplica saldo

**Arquivo:** `apps/api/src/routes/transactions.ts` (PUT handler)
**Problema:** `applyTransferBalances` só é chamada na criação. Confirmar uma transação pendente via edição não movimenta saldo.
**Regra:** No PUT, se `oldStatus === "pending"` e `newStatus === "confirmed"`, chamar `applyTransferBalances` com os valores da transação atualizada.

---

#### RN-11 · Status `pending` não existe no mobile

**Arquivo:** `apps/mobile/src/components/TransactionForm.tsx`
**Problema:** Mobile sempre cria transações como `"confirmed"`. O conceito de transação pendente (ex: boleto a pagar) não está acessível.
**Regra:** Adicionar toggle Confirmada / Pendente no formulário mobile, igual ao web.

---

### Prioridade 4 — Baixas (qualidade e robustez)

#### RN-12 · Máximo de 24 parcelas não é validado

**Arquivo:** `apps/api/src/routes/transactions.ts` e `packages/core/src/services/TransactionService.ts`
**Regra:** `totalInstallments: z.number().int().min(1).max(24)`.

---

#### RN-13 · Descrição só com espaços em branco é aceita

**Arquivo:** `apps/api/src/routes/transactions.ts` (schema Zod)
**Problema:** `z.string().min(1)` aceita `"   "`.
**Regra:** Adicionar `.transform(s => s.trim()).pipe(z.string().min(1))` no schema.

---

#### RN-14 · `billingDay`/`dueDay` do cartão não são usados

**Arquivo:** `apps/api/src/routes/cards.ts` e statement endpoint
**Problema:** Os campos existem no banco mas nenhuma lógica os usa para calcular o período de fatura real.
**Regra:** (baixa prioridade — só implementar junto com feature de fatura completa)

---

## Paridade Mobile ↔ Web — Plano de Implementação

> **Contexto:** O mobile tem a estrutura certa (stores com CRUD completo, cliente HTTP, todos os endpoints). A UI, porém, implementou apenas Create + Read na maioria dos fluxos. Cobertura atual estimada: ~45% da paridade com o web.
>
> **Princípio:** Nenhum item abaixo exige mudança de API ou banco — tudo já tem suporte no backend e nos stores. O trabalho é 100% de UI mobile.
>
> **Branch:** `feature/mobile-parity` (criar a partir de `main`)

---

### Grupo 1 — CRUD completo (Alta prioridade)

Afeta uso diário. Stores já têm `update()` e `remove()` implementados — falta só expor na UI.

#### 1.1 Transações: editar e excluir

**Situação atual:** `app/(tabs)/transactions.tsx` só cria. Não há swipe, long-press nem botão de edição.

**O que fazer:**

- Swipe para esquerda em cada item da lista → botão "Excluir" (vermelho) com `confirm`
- Tap no item → abre `TransactionForm` pré-preenchido com os dados da transação (modo edição)
- `TransactionForm` já aceita `editing` prop? Verificar — se não, adicionar
- Após salvar/excluir: recarregar `loadAccounts()` para refletir saldo

**Arquivos a modificar:**

- `apps/mobile/app/(tabs)/transactions.tsx`
- `apps/mobile/src/components/TransactionForm.tsx` (adicionar modo edição se necessário)

---

#### 1.2 Cartões: excluir (edição é baixa prioridade)

**Situação atual:** `app/(tabs)/cards.tsx` só cria. Não há forma de excluir.

**O que fazer:**

- Long-press no card → menu de contexto com "Excluir"
- OU: botão ✕ visível no canto do card (padrão igual ao web)
- `useCardStore.remove(id)` já existe

**Arquivos a modificar:**

- `apps/mobile/app/(tabs)/cards.tsx`

---

#### 1.3 Metas: excluir (edição pode vir depois)

**Situação atual:** `app/(tabs)/goals.tsx` só cria e deposita. Não há exclusão.

**O que fazer:**

- Swipe para esquerda → botão "Excluir" com `confirm`
- `useGoalStore.remove(id)` já existe

**Arquivos a modificar:**

- `apps/mobile/app/(tabs)/goals.tsx`

---

#### 1.4 Configurações — Bancos: excluir

**Situação atual:** `settings.tsx` tem criar e editar banco, mas não excluir.

**O que fazer:**

- Adicionar botão "Excluir" no `AccountForm` em modo edição (ou swipe na lista)
- `useAccountStore.remove(id)` já existe

**Arquivos a modificar:**

- `apps/mobile/app/(tabs)/settings.tsx`
- `apps/mobile/src/components/AccountForm.tsx`

---

#### 1.5 Configurações — Categorias: excluir

**Situação atual:** `settings.tsx` tem criar e editar categoria, mas não excluir.

**O que fazer:**

- Botão "Excluir" no `CategoryForm` em modo edição
- `useCategoryStore.remove(id)` já existe

**Arquivos a modificar:**

- `apps/mobile/app/(tabs)/settings.tsx`
- `apps/mobile/src/components/CategoryForm.tsx`

---

### Grupo 2 — Features existentes no web (Média prioridade)

#### 2.1 Tipo Transferência no formulário de transação

**Situação atual:** `TransactionForm` só tem Despesa / Receita. O store e a API suportam `transfer`.

**O que fazer:**

- Adicionar terceiro toggle "Transferência" no seletor de tipo
- Quando selecionado: mostrar segundo seletor de conta "Banco de destino"
- `useTransactionStore.add()` já aceita `destinationAccountId`

**Arquivos a modificar:**

- `apps/mobile/src/components/TransactionForm.tsx`

---

#### 2.2 Campo Notas no formulário de transação

**Situação atual:** `TransactionForm` não expõe o campo `notes`. O store e a API suportam.

**O que fazer:**

- Adicionar campo de texto multiline opcional "Observações" no final do form
- Passar `notes` no payload do `add()` / `update()`

**Arquivos a modificar:**

- `apps/mobile/src/components/TransactionForm.tsx`

---

#### 2.3 Filtros de transação — UI

**Situação atual:** `useTransactionStore` tem `setFilters()` com suporte a tipo, categoria, conta, busca e data — mas não há UI para aplicar esses filtros.

**O que fazer:**

- Botão de filtro no header da tela de Transações
- Bottom sheet com opções: tipo (chips), categoria (chips), conta (chips), busca (input)
- Botão "Limpar filtros"
- Badge no botão de filtro quando há filtro ativo

**Arquivos a modificar:**

- `apps/mobile/app/(tabs)/transactions.tsx`
- `apps/mobile/src/components/TransactionFilters.tsx` (criar)

---

#### 2.4 Fatura do cartão — statement ao tocar no cartão

**Situação atual:** Nenhum detalhe ao tocar no cartão. API `GET /cards/:id/statement?month=YYYY-MM` já existe (implementada na sessão de hoje).

**O que fazer:**

- Tap no card → abre bottom sheet com: fatura atual, limite disponível, transações do mês
- Navegação por mês (◄ ►) igual ao web
- Usar `api.cards.statement(id, month)` — já está no cliente HTTP do web; adicionar no cliente do mobile

**Arquivos a modificar:**

- `apps/mobile/app/(tabs)/cards.tsx`
- `apps/mobile/src/lib/api.ts` (adicionar `cards.statement`)
- `apps/mobile/src/components/CardStatement.tsx` (criar)

---

### Grupo 3 — Dashboard melhorado (Média prioridade)

#### 3.1 Hero card de fluxo mensal + donut interativo

**Situação atual:** Dashboard mostra saldo total e resumo mensal em texto simples. Web tem fluxo mensal como hero com donut interativo em 2 níveis.

**O que fazer:**

- Reorganizar o Dashboard: fluxo mensal (Receitas / Despesas / Saldo do mês) vira o hero principal
- Tap no hero abre `PieChart` de Receitas vs Despesas (nível 1)
- Tap na fatia de Despesas → `PieChart` por categoria de despesa (nível 2)
- Tap na fatia de Receitas → `PieChart` por categoria de receita (nível 2)
- `PieChart` já está em `packages/ui` (Victory Native)

**Arquivos a modificar:**

- `apps/mobile/app/(tabs)/index.tsx`

---

#### 3.2 Saldo nos Bancos expansível

**Situação atual:** Dashboard mostra apenas contador de contas e saldo total.

**O que fazer:**

- Card "Saldo nos Bancos" clicável
- Expand/collapse: lista cada banco com nome, tipo e saldo individual
- Saldo negativo em vermelho

**Arquivos a modificar:**

- `apps/mobile/app/(tabs)/index.tsx`

---

### Grupo 4 — Relatórios (Baixa prioridade, porém única aba ausente)

#### 4.1 Nova tela de Relatórios

**Situação atual:** Não existe. Web tem página `/reports` completa.

**O que fazer:**

- Adicionar 6ª aba "Relatórios" no tab bar (`app/(tabs)/reports.tsx`)
- Ou: tela acessível por botão no Dashboard (sem nova aba, para não poluir o tab bar)
- Conteúdo:
  - Seletor de período: Mês atual / 3 / 6 / 12 meses
  - `BarChart` receitas vs despesas (`packages/ui` já tem)
  - `LineChart` evolução do saldo (`packages/ui` já tem)
  - Tabela de evolução mensal (FlatList)
  - Top 5 categorias de despesa (barras)
  - Exportar: `Share` nativo do Expo (CSV ou JSON)

**Arquivos a criar/modificar:**

- `apps/mobile/app/(tabs)/reports.tsx` (criar)
- `apps/mobile/app/(tabs)/_layout.tsx` (adicionar aba)

---

### Resumo e estimativa

| Grupo                       | Itens                                                                                                     | Estimativa | Status |
| --------------------------- | --------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| 1 — CRUD completo           | 1.1 editar/excluir tx · 1.2 excluir cartão · 1.3 excluir meta · 1.4 excluir banco · 1.5 excluir categoria | ~3–4h      | ✅     |
| 2 — Features web existentes | 2.1 transferência · 2.2 notas · 2.3 filtros · 2.4 fatura cartão                                           | ~3–4h      | ✅     |
| 3 — Dashboard melhorado     | 3.1 hero fluxo + donut · 3.2 bancos expansível                                                            | ~2h        | ✅     |
| 4 — Relatórios              | 4.1 nova tela completa                                                                                    | ~3h        | ✅     |
| **Total**                   | **10 itens**                                                                                              | **~8–12h** | ✅     |

> Ordem de execução recomendada: 1.1 → 1.2 → 1.3 → 1.4+1.5 → 2.1 → 2.2 → 2.3 → 2.4 → 3.1 → 3.2 → 4.1

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

#### 3. Detalhamento ao clicar no cartão ✅

**Prioridade:** Média
**Origem:** "Tem como clicar no cartão e ver o detalhamento do cartão?"
**Implementado — `89fe6c3`:** Modal com fatura atual, limite disponível e transações do mês; navegação por mês (◄ ►); API `GET /cards/:id/statement?month=YYYY-MM`.

---

#### 4. Personalização de cor dos cartões ✅

**Prioridade:** Baixa
**Origem:** "Tem como personalizar as cores dos cartões igual personaliza para as contas?"
**Implementado — `89fe6c3`:** Seletor `<input type="color">` adicionado ao formulário de novo cartão.

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

#### 3. Detalhamento no card "Saldo nos Bancos" ✅

**Prioridade:** Média
**Implementado — `dececc2`:** Toggle ao clicar no card expande painel com lista de bancos (nome · tipo · saldo); saldo negativo em vermelho; fecha clicando novamente.

---

#### 4. Relatórios — incluir mês atual ✅

**Prioridade:** Média
**Implementado — `7e3ff86`:** `lastNMonths(n)` já incluía o mês corrente (confirmado). Adicionado botão "Mês atual" ao seletor; linha do mês atual na tabela recebe fundo sutil e badge "atual".

---

#### 5. Clarificar o conceito de Transferência ✅

**Prioridade:** Média
**Implementado — `984294b`:** Campo "Banco de destino" aparece no form quando tipo = Transferência; API debita origem e credita destino atomicamente; PUT/DELETE revertem ambas as contas. Migration `0003` adiciona `destination_account_id` na tabela.
Migration `0003` será aplicada automaticamente pelo CI/CD no próximo push (deploy.sh → pnpm db:migrate).

---

## Guia de Testes — Mobile

### Arquitetura do ambiente local

```
Celular (Expo Go)
    ↓ HTTP  192.168.1.69:3000
API local  (pnpm dev:api  — roda no PC)
    ↓ TCP  localhost:5432
SSH tunnel  (Terminal 1 — mantém porta aberta)
    ↓ SSH
PostgreSQL na VM Oracle  (banco compartilhado — mesmo de produção)
```

> **Importante:** a API local **não tem banco próprio** — ela usa o PostgreSQL da VM via tunnel. Isso significa:
>
> - O tunnel (Terminal 1) deve estar aberto **antes** de subir a API (Terminal 2)
> - `pnpm db:migrate` só aplica no banco certo se o tunnel estiver ativo. Com tunnel fechado e sem PostgreSQL local, o comando falha; com PostgreSQL local na porta 5432, aplica no lugar errado (bug silencioso)
> - Migrations novas chegam ao banco da VM automaticamente pelo CI/CD quando o código vai para `main` — prefira o merge a rodar `db:migrate` manualmente

### Pré-requisitos

- **Expo Go 54** instalado no celular (Android ou iOS)
- Celular na **mesma rede Wi-Fi** que o PC
- `apps/mobile/.env` com `EXPO_PUBLIC_API_URL=http://192.168.1.69:3000` (já criado)
- `apps/api/.env` com `DATABASE_URL=postgresql://ctrl_custo_user:...@localhost:5432/ctrl_custo` (tunnel mapeia para VM)

### Passo a passo

**Terminal 1 — SSH tunnel para o banco na VM (abrir primeiro):**

```
ssh -L 5432:localhost:5432 oracle-ctrl-custos -N
```

Deixar aberto enquanto testar. Sem output é o comportamento normal.

**Terminal 2 — API local (abrir depois do tunnel):**

```
pnpm dev:api
```

Aguardar: `[api] running on port 3000`

**Terminal 3 — Mobile:**

```
pnpm dev:mobile
```

Aguardar o QR code no terminal.

**No celular:**

1. Abrir o **Expo Go**
2. Escanear o QR code exibido no terminal
3. Aguardar o build (primeira vez demora ~1–2 min; depois é instantâneo)

### Contas de teste

| E-mail            | Senha        |
| ----------------- | ------------ |
| `andre@teste.com` | `Teste@1234` |
| `vitor@teste.com` | `Teste@1234` |
| `bio@teste.com`   | `Teste@1234` |

> Novas contas: cadastro está desabilitado em produção (`REGISTRATION_ENABLED = false`). Para criar via SQL: ver sessão 2026-05-08 no log.

### Comandos úteis

```bash
# Rodar só os testes automatizados do mobile
pnpm --filter mobile test

# Rodar todos os testes (core + mobile)
pnpm test

# Rodar com saída detalhada
pnpm --filter mobile test --verbose
```

### Observações de performance

- Primeira abertura no celular é lenta (~1–2 min) — é o Metro bundlando ~2600 módulos
- Após o primeiro bundle, hot reload é rápido
- Login pode levar 1–2s — é o `refresh()` + carregamento inicial de dados

---

## Log de Sessões

### 2026-05-14 — Infraestrutura de testes de integração para a API

#### O que foi feito

- **refactor(api):** `src/app.ts` extraído de `src/index.ts` — Hono app exportado sem `serve()`, permitindo importar nos testes sem iniciar servidor HTTP
- **test(api):** Vitest adicionado como devDependency; scripts `test` e `test:watch` no `package.json`
- **test(api):** `vitest.config.ts` — `globalSetup` (migrations) + `setupFiles` (truncate + mock de e-mail), timeout de 20s
- **test(api):** `src/__tests__/global-setup.ts` — carrega `.env.test`, aplica migrations Drizzle no banco de testes antes de todos os testes
- **test(api):** `src/__tests__/setup.ts` — `TRUNCATE auth.users CASCADE` antes de cada teste; mock de `sendVerificationEmail`
- **test(api):** `src/__tests__/helpers.ts` — factories: `createUser`, `createAccount`, `createCategory`, `createCard`, `createTransaction`, `getBalance`; helper `api()` que usa `app.request()` (sem servidor real)
- **test(api):** `rn-acc-06.test.ts` — 5 testes TDD para saldo insuficiente (❌ vão falhar até implementar)
- **test(api):** `rn-card-03.test.ts` — 5 testes TDD para limite de cartão (❌ vão falhar até implementar)
- **test(api):** `rn-tx-06-07.test.ts` — 7 testes de regressão para status/saldo (✅ já passam)
- **test(api):** `rn-tx-03.test.ts` — 3 testes TDD para transferência mesma conta (❌ vai falhar até implementar)
- **ci(api):** `ci.yml` atualizado com serviço PostgreSQL 16 + step `Test (api)` com `DATABASE_URL` de teste
- **docs:** `BUSINESS_RULES.md` e `CLAUDE.md` atualizados com convenção de RNs obrigatórias antes de implementar
- **docs:** `.env.test.example` criado com template para configuração local

#### Como rodar os testes localmente

```bash
# 1. Criar banco de teste (uma vez)
createdb ctrl_custo_test

# 2. Copiar e configurar .env.test
cp apps/api/.env.test.example apps/api/.env.test
# editar DATABASE_URL se necessário

# 3. Rodar
pnpm --filter @ctrl-custo/api test
```

#### Próxima sessão: implementar as RNs críticas

Implementar as regras para que os testes TDD passem:

1. **RN-ACC-06** — saldo insuficiente bloqueia débito (em `transactions.ts` POST)
2. **RN-CARD-03** — limite de cartão verificado ao criar transação (em `transactions.ts` POST)
3. **RN-TX-03** — transferência mesma conta rejeitada no backend (schema Zod)

Branch: `feature/business-rules`

---

### 2026-05-14 — Regras de negócio: levantamento e documentação

#### O que foi feito

- **fix(mobile):** `GoalForm.tsx` — campo prazo agora usa formato `DD-MM-AAAA`; função `toIsoDate` converte para ISO antes de enviar à API; adicionado `keyboardType="numeric"` e `maxLength={10}`
- **docs:** Levantamento completo de 14 regras de negócio ausentes ou parcialmente implementadas, documentadas em `PROJECT.md` com arquivo, linha, problema e regra esperada
- **Próxima sessão:** Implementar RN-01 a RN-04 (críticas) na branch `feature/business-rules`

---

### 2026-05-14 — Paridade mobile: fixes de UX, export e migração 0004

#### O que foi feito

- **fix(categories):** Emoji de categoria agora é opcional — `icon: z.string()` aceita string vazia; ícone em branco renderiza `×` no grid de seleção; padrão ao criar é sem emoji
- **feat(categories):** Exclusão com transferência — ao tentar excluir categoria com transações vinculadas, app oferece picker inline para migrar as transações para outra categoria antes de deletar; API `DELETE /categories/:id?transferTo=uuid` executa a transferência atomicamente
- **feat(goals):** Exclusão com reembolso — ao excluir meta com depósitos, app exige escolha de conta destino; API calcula o total depositado, credita na conta escolhida, deleta as transações de depósito e depois deleta a meta; contas arquivadas não aparecem no picker (evita dinheiro "sumindo")
- **feat(mobile):** Aba Cartões ocultada do tab bar (`href: null`) — cartões existem no banco mas UI mobile não está pronta
- **feat(reports):** Exportar transações em CSV e Excel (`.xlsx`) — `exportUtils.ts` usa SheetJS + expo-file-system + expo-sharing; CSV com 8 colunas; XLSX com 2 abas (Transações + Resumo Mensal); botão "Exportar" no header de Relatórios
- **fix(api/schema):** `goalId` em `transactions` removeu `.references(() => goals.id)` — Drizzle avaliava o callback no momento do import, causando `ReferenceError` (temporal dead zone) pois `goals` é definido após `transactions` no mesmo arquivo → toda request retornava 500; FK preservada via migration SQL
- **chore(migrations):** `0004_goal_id_on_transactions.sql` — adiciona coluna `goal_id uuid REFERENCES planning.goals(id) ON DELETE SET NULL`; entrada registrada no `meta/_journal.json`

#### Causa raiz do 500 persistente

A migration 0004 não foi aplicada no PostgreSQL da VM (`column "goal_id" does not exist`). O `pnpm db:migrate` anterior retornou `done` mas provavelmente conectou em contexto sem tunnel ativo. Solução: merge para `main` → CI/CD aplica a migration automaticamente via `deploy.sh`.

#### Pendências em aberto

- **PR aberto:** `feature/mobile-parity` → `main` — aguardar CI verde e fazer merge
- **Após merge:** testar roteiro mobile completo com migration aplicada (Relatórios, Metas, exportação)
- **Maestro Cloud:** ação do usuário pendente (ver seção "Ações Pendentes")

---

### 2026-05-13 — Correções mobile: validação de formulário, Dashboard e testes

#### O que foi feito

- **feat(mobile/dashboard):** Botão `+` pequeno adicionado ao lado do título "Últimas transações" — abre o `TransactionForm` diretamente do Dashboard. Callback `onSaved` recarrega contas e transações do mês atual.
- **feat(mobile/form):** Validação com mensagens de erro no `TransactionForm` — em vez de retornar silenciosamente, `handleSave()` agora exibe erros inline em cada campo obrigatório (valor, descrição, banco, categoria, banco de destino em transferências). Campos inválidos recebem borda vermelha.
- **fix(mobile/store):** `load()` do `useTransactionStore` agora tem `try/catch` — erros de rede não sobrescrevem o estado existente com dados vazios.
- **test(mobile):** `TransactionForm.test.tsx` expandido de 12 para 18 testes — novos testes cobrem validação de campos obrigatórios: erro de valor, erro de descrição, erro de categoria, erro de banco de destino em transferências, verificação de que `add()` não é chamado com erros, e limpeza de erros após salvar com sucesso.
- **docs:** `PROJECT.md` — seção "Guia de Testes — Mobile" adicionada com passo a passo para abrir o app no celular, contas de teste e comandos úteis.

#### Bug investigado — Transferência zera o Dashboard

**Sintoma relatado:** Após criar uma transferência, todas as outras transações e o histórico sumiram; Dashboard zerado.

**Análise:** Causa mais provável é comportamento esperado que parece bug:

- O Dashboard calcula `totalIncome`/`totalExpense` excluindo `type === "transfer"`. Se o único movimento do mês for uma transferência, o fluxo mensal aparece zerado — isso é **correto** (transferência não é receita nem despesa).
- A tela de Transações mostra apenas o mês selecionado. Se o usuário estava em um mês diferente do da transferência, histórico anterior "some" porque está no outro mês.
- O `load()` sem `try/catch` (corrigido agora) poderia deixar estado em branco em caso de erro de rede.

**Próxima verificação:** Reproduzir criando transferência com o app rodando e verificar nos logs da API se o `GET /transactions` retorna os dados corretos após o POST.

#### Falsos positivos identificados nos testes

- Testes anteriores verificavam apenas presença de elementos na tela (`toBeTruthy()`), sem testar comportamento real (cliques, callbacks). Não são falsos positivos no sentido estrito — eles falhariam se o componente não renderizasse — mas têm cobertura baixa.
- Novos testes usam `fireEvent` + `act` para verificar efeitos reais: erros aparecem, callbacks são chamados ou não.

---

### 2026-05-09 — Infraestrutura VM + testes mobile local (sessão 2)

#### O que foi feito

- **chore(infra):** Script `scripts/vm-keep-alive.sh` + `scripts/setup-vm-keep-alive.ps1` — gera carga de CPU por 5 min a cada 3 dias via cron para evitar desativação da VM Oracle (limiar: CPU < 10% por 7 dias). Instalado e testado na VM. Commit `a97b209`.
- **fix(vscode):** `keybindings.json` do VS Code — removidos conflitos de `Ctrl+Shift+C` (abria terminal nativo) e `Ctrl+Shift+V` (abria preview Markdown) no terminal integrado.
- **chore(mobile):** `.env` criado em `apps/mobile/` com `EXPO_PUBLIC_API_URL=http://192.168.1.69:3000` para testes locais no celular.

#### Pendências para próxima sessão — Testes mobile local

Para rodar o app no celular com Expo Go 54 apontando para a API local:

1. **Criar `apps/api/.env`** a partir de `apps/api/.env.example`:
   - `DATABASE_URL` — usar banco local (PostgreSQL local) ou apontar para a VM
   - `JWT_SECRET` e `JWT_REFRESH_SECRET` — gerar com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `PORT=3000`
   - `ALLOWED_ORIGINS=http://localhost:5173`
   - `NODE_ENV=development`
   - SMTP pode ficar com valores falsos para testes locais

2. **Rodar API local:** `pnpm dev:api` (terminal 1)
3. **Rodar mobile:** `pnpm --filter mobile start -- --clear` (terminal 2)
4. **Celular** na mesma rede Wi-Fi que o PC — escanear QR code no Expo Go 54

#### Observações de performance (anotar para futura otimização)

- Abertura lenta no celular — parte é overhead do Expo Go em dev (bundle de ~2600 módulos), parte pode ser bloqueio de render pelo `tryRestore()` antes de mostrar qualquer tela
- Login lento — `api.auth.refresh()` + carga inicial de accounts/categories/transactions bloqueiam a UI no startup

---

### 2026-05-09 — Paridade mobile completa (branch feature/mobile-parity)

#### O que foi implementado

**Grupo 1 — CRUD completo (commit `5e33a63`):**

- Transações: tap para editar (TransactionForm modo edição), long-press para excluir com confirmação
- Cartões: botão lixeira + tap abre CardStatement com fatura mensal e navegação por mês
- Metas: botão lixeira com confirmação
- Bancos: botão "Excluir conta" no AccountForm modo edição
- Categorias: botão "Excluir categoria" no CategoryForm modo edição

**Grupo 2 — Features web (commit `5e33a63` + `5cbd7f6`):**

- 2.1 Transferência: terceiro toggle "Transf." + seletor de banco de destino no TransactionForm
- 2.2 Notas: campo Observações multiline opcional no TransactionForm
- 2.3 Filtros: `TransactionFilters.tsx` — bottom sheet com busca, tipo (chips), categoria (chips), banco (chips); badge no botão com contagem de filtros ativos; filtros combinados com range de datas
- 2.4 Fatura do cartão: `CardStatement.tsx` — fatura atual, limite disponível, transações do mês, navegação por mês

**Grupo 3 — Dashboard melhorado (commit `5cbd7f6`):**

- Hero "Fluxo do Mês": Receitas / Despesas / Saldo do mês — substitui saldo total como hero
- Tap no hero → donut nível 1 (Receitas vs Despesas)
- Botões drill-down → donut nível 2 por categoria (income ou expense)
- Card "Saldo nos Bancos" expansível com lista de bancos (nome, tipo, saldo)
- Saldo negativo em vermelho

**Grupo 4 — Relatórios (commit `5cbd7f6`):**

- Nova aba "Relatórios" adicionada ao tab bar (6ª aba)
- Seletor de período: 3m / 6m / 12m
- BarChart receitas por mês + BarChart despesas por mês
- LineChart evolução do saldo acumulado
- Tabela mensal com badge "atual" no mês corrente
- Exportar via Share nativo (CSV)

**Fix:** Remove `userId` inválido do mock `Account` no test fixture `AccountForm.test.tsx`

#### Pendências em aberto

- **PR:** Abrir PR de `feature/mobile-parity` → `main` e fazer merge
- **Maestro Cloud:** Ação do usuário pendente — ver seção "Ações Pendentes" acima
- **Próximas features (backlog):** Investimentos, Pagamentos Recorrentes, Parcelas Futuras

---

### 2026-05-08 — Infraestrutura de testes automatizados para o mobile (Fase 13)

#### O que foi implementado

**Estratégia de testes mobile — dois níveis:**

| Nível                       | Ferramenta    | Quando roda             | O que cobre                                                  |
| --------------------------- | ------------- | ----------------------- | ------------------------------------------------------------ |
| 1 — Unitário/Componente     | Jest + RNTL   | A cada push (CI)        | Funções puras, renderização de forms, comportamento sem rede |
| 2 — E2E em dispositivo real | Maestro Cloud | Após EAS Build (`main`) | Fluxos completos em APK real                                 |

**Pacotes adicionados em `apps/mobile` (devDependencies):**

- `jest-expo ~54.0.0` — preset Jest para Expo SDK 54
- `@testing-library/react-native ^12.9.0` — renderização de componentes sem emulador
- `@testing-library/jest-native ^5.4.3` — custom matchers (`toBeTruthy`, etc.)
- `react-test-renderer 19.1.4` — renderizador para React 19
- `@types/jest ^29.5.12` — tipos TypeScript

**Arquivos criados:**

- `apps/mobile/jest.config.js` — preset jest-expo, `setupFilesAfterEnv`, `transformIgnorePatterns` para pacotes workspace
- `apps/mobile/src/__tests__/setup.ts` — mocks de módulos nativos: `@expo/vector-icons`, `expo-secure-store`, `expo-local-authentication`, `@react-native-async-storage`, `react-native-reanimated`
- `apps/mobile/src/__tests__/useCurrency.test.ts` — 9 testes das funções puras (`parseCurrencyInput`, `formatCurrencyInput`, `formatCurrency`)
- `apps/mobile/src/__tests__/GoalForm.test.tsx` — 6 testes de renderização do `GoalForm`
- `apps/mobile/src/__tests__/AccountForm.test.tsx` — 7 testes de renderização do `AccountForm` (modo criação + edição)
- `.maestro/login.yaml` — flow de login
- `.maestro/dashboard.yaml` — navegação no dashboard
- `.maestro/transactions.yaml` — abrir formulário de transação
- `.maestro/goals.yaml` — criar meta completa
- `.maestro/settings.yaml` — navegação em configurações
- `.github/workflows/maestro-cloud.yml` — trigger: manual (`workflow_dispatch` com APK URL) ou automático após EAS Build no `main`

**CI atualizado (`.github/workflows/ci.yml`):**

- Adicionado step `Test (mobile)` — executa `pnpm test` em `apps/mobile` (Jest + RNTL, sem emulador)
- Total de testes automatizados: 31 (core Vitest) + 22 (mobile Jest) + 38 (web E2E Playwright) = **91 testes**

#### Pendências em aberto

- **Ação do usuário necessária (Maestro Cloud):**
  1. Criar conta em [cloud.mobile.dev](https://cloud.mobile.dev) (gratuito: 100 runs/mês)
  2. Obter API Key em Settings → API Keys
  3. Adicionar secret `MAESTRO_API_KEY` em GitHub → Settings → Secrets → Actions
  4. Após próximo EAS Build, o workflow `maestro-cloud.yml` dispara automaticamente

- **Próximos testes a adicionar (quando componentes estiverem prontos):**
  - `TransactionForm.test.tsx` — cobre tipos: income/expense/transfer
  - `CategoryForm.test.tsx` e `CardForm.test.tsx`
  - Testes de `DepositForm.tsx`

- **Paridade mobile ↔ web (próxima fase):** ver seção "Paridade Mobile ↔ Web" abaixo

---

### 2026-05-08 — Backlog web zerado + cobertura E2E completa + deploy

#### O que foi feito

**Features:**

- **feat(cards) — `89fe6c3`:** API `GET /cards/:id/statement?month=YYYY-MM`; modal de detalhamento ao clicar no cartão (fatura, disponível, transações do mês, navegação por mês); seletor de cor no formulário de novo cartão
- **feat(dashboard) — `dececc2`:** `BalanceCard` expandível ao clicar — lista bancos com nome, tipo e saldo (negativo em vermelho)
- **feat(reports) — `7e3ff86`:** botão "Mês atual" adicionado ao seletor de período; linha do mês corrente destacada com badge "atual"

**Testes automatizados — `bc91093`:**

- Estratégia adotada: typecheck + 31 testes unitários core (Vitest/sql.js) a cada mudança + E2E Playwright por feature
- `smoke.spec.ts` — auth, dashboard (expand bancos), transações básicas
- `cards.spec.ts` — listar, criar, excluir, modal de detalhamento
- `goals.spec.ts` — listar, abrir form, criar meta, form de depósito
- `settings.spec.ts` — abas Bancos/Categorias, criar banco, editar, arquivar
- `reports.spec.ts` — todos os botões de período, contagem de linhas, badge "atual", exportar
- `transactions.spec.ts` — contador, form, campos, tipos, editar, filtro
- **Total: 38 testes E2E + 31 testes unitários = 69 testes automatizados**

**Contas de teste criadas diretamente no banco (PostgreSQL na VM):**

- Padrão: `nome@teste.com` / `Teste@1234` — e-mail já verificado, 15 categorias padrão
- Contas criadas: `andre@teste.com`, `vitor@teste.com`, `bio@teste.com`

**Deploy:**

- Push para `main` — CI/CD rodou: typecheck + lint + testes Vitest + deploy API + deploy Web
- Produção atualizada em `https://ctrlcusto.duckdns.org`

#### Pendências em aberto

- **Mobile:** Dashboard mobile com fluxo mensal + donut (branch `feature/mobile-dashboard-improvements` a criar)
- Próximos itens do backlog: Seção de Investimentos, Pagamentos Recorrentes, Visão de Parcelas Futuras

---

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

#### Pendências em aberto

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
