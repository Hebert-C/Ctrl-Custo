# Code Review Backlog — Ctrl+Custo

> Gerado em 2026-05-31 após varredura completa do código.
> Marque cada item com ✅ quando concluído.

---

## Como usar este documento

- **Comece pelos 🔴 Críticos** — são os únicos com risco real de segurança e integridade de dados.
- Cada item contém: arquivo exato, linha(s), o problema, e o que fazer para corrigir.
- Não altere este arquivo fora do fluxo de correção — use-o como checklist.

---

## 🔴 CRÍTICO — 4 itens

> Risco de segurança ou corrupção de dados em produção.

---

### C-01 — `destinationAccountId` sem ownership check no `PUT /transactions/:id`

- **Arquivo:** `apps/api/src/routes/transactions.ts`
- **Linhas:** 224–250 (bloco de ownership checks) e 265–276 (uso do campo sem validação)

**O problema:**
O `PUT /:id` valida ownership de `accountId`, `categoryId` e `cardId`, mas ignora completamente `destinationAccountId`. Um usuário pode editar uma transferência e apontar o campo para uma conta de outro usuário — o crédito vai para lá, corrompendo o saldo de ambos.

```typescript
// ✅ accountId, categoryId, cardId — validados (linhas 225-250)
// ❌ destinationAccountId — NUNCA validado

// linha 272: usa o campo sem nenhuma checagem de ownership
merged.destinationAccountId, // pode ser de outro usuário!
```

**O que fazer:**
Adicionar, após o bloco de ownership checks existentes (após a linha 250), a mesma lógica de verificação para `destinationAccountId`:

```typescript
if (body.destinationAccountId && body.destinationAccountId !== existing.destinationAccountId) {
  const [destAcct] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, body.destinationAccountId), eq(accounts.userId, userId)))
    .limit(1);
  if (!destAcct) return c.json({ error: "Conta de destino não encontrada." }, 404);
}
```

---

### C-02 — Race condition no pagamento de fatura do cartão (saldo não-atômico)

- **Arquivo:** `apps/api/src/routes/cards.ts`
- **Linhas:** 168 (checagem de saldo) e 196 (update do saldo)

**O problema:**
O saldo é lido fora da transação do banco, verificado, e depois subtraído dentro dela — mas usando o valor já lido, não o valor atual. Se dois pagamentos chegam ao mesmo tempo, ambos passam na verificação de `balance < totalSpent` e ambos debitam, gerando saldo negativo.

```typescript
// linha 168 — lê saldo FORA da transação
if (account.balance < totalSpent) return 422;

// linha 196 — usa valor lido, não o valor atual do banco
.set({ balance: account.balance - totalSpent, updatedAt: new Date() })
//            ^^^^^^^^^^^^^^^^^^^ calculado antes da transação
```

**O que fazer:**
Substituir o update por SQL atômico. A verificação de saldo insuficiente pode ser feita após o update verificando se o resultado ficou negativo, ou usando `RETURNING`:

```typescript
// dentro do db.transaction:
await trx
  .update(accounts)
  .set({
    balance: sql`${accounts.balance} - ${totalSpent}`,
    updatedAt: new Date(),
  })
  .where(and(eq(accounts.id, card.accountId), sql`${accounts.balance} >= ${totalSpent}`));

// checar se nenhuma linha foi afetada (saldo insuficiente)
```

Alternativamente: mover a checagem `account.balance < totalSpent` para dentro da transação com `SELECT ... FOR UPDATE` para bloquear a linha durante a leitura.

---

### C-03 — `transferTo` em `DELETE /categories` sem validar ownership da categoria destino

- **Arquivo:** `apps/api/src/routes/categories.ts`
- **Linhas:** 63–68

**O problema:**
Ao deletar uma categoria com `?transferTo=outraId`, o código verifica que `transferTo !== id` (não transfere para si mesma), mas não verifica se `outraId` pertence ao usuário logado. Um usuário pode passar o UUID de uma categoria de outro usuário e fazer as próprias transações migrarem para ela.

```typescript
// linha 64: sem validação de ownership de transferTo!
if (transferTo) {
  await db
    .update(transactions)
    .set({ categoryId: transferTo }) // ← pode ser de outro usuário
    .where(and(eq(transactions.categoryId, id), eq(transactions.userId, userId)));
}
```

**O que fazer:**
Adicionar ownership check de `transferTo` antes do `update`:

```typescript
if (transferTo) {
  const [destCat] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, transferTo), eq(categories.userId, userId)))
    .limit(1);
  if (!destCat) return c.json({ error: "Categoria de destino não encontrada." }, 404);

  await db
    .update(transactions)
    .set({ categoryId: transferTo })
    .where(and(eq(transactions.categoryId, id), eq(transactions.userId, userId)));
}
```

---

### C-04 — Race condition no refresh de token JWT

- **Arquivo:** `apps/web/src/lib/api.ts` · `apps/mobile/src/lib/api.ts`
- **Linhas:** `api.ts:32–52` (web), equivalente no mobile

**O problema:**
`refreshTokenOnce()` usa uma Promise compartilhada como mutex, mas a atribuição não é instantânea. Entre `if (_refreshing)` e `_refreshing = fetch(...)`, múltiplas chamadas simultâneas chegam, todas veem `_refreshing = null` e disparam um refresh. O segundo refresh invalida o refresh token do primeiro, causando logout inesperado.

```typescript
async function refreshTokenOnce(): Promise<boolean> {
  if (_refreshing) return _refreshing;   // ← vários callers chegam aqui ao mesmo tempo
  _refreshing = fetch(...).then(...);    // ← todos atribuem, todos disparam
  return _refreshing;
}
```

**O que fazer:**
A solução atual _quase_ funciona pois JavaScript é single-threaded — chamadas síncronas em série são seguras. O problema real é o `.finally(() => { _refreshing = null; })` que zera o mutex antes de todas as requisições que estavam aguardando processarem a resposta. Remover o finally e usar um padrão mais robusto:

```typescript
async function refreshTokenOnce(): Promise<boolean> {
  if (_refreshing) return _refreshing;
  _refreshing = fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" })
    .then(async (r) => {
      if (!r.ok) {
        clearToken();
        return false;
      }
      const { accessToken } = (await r.json()) as { accessToken: string };
      setToken(accessToken);
      return true;
    })
    .catch(() => {
      clearToken();
      return false;
    });
  // Só zera _refreshing DEPOIS que a promise resolve, não no finally imediato
  const result = await _refreshing;
  _refreshing = null;
  return result;
}
```

---

## 🟠 ALTO — 6 itens

> Problemas sérios de qualidade, confiabilidade e UX.

---

### A-01 — Zero paginação nas listagens de transações, categorias e investimentos

- **Arquivos:**
  - `apps/api/src/routes/transactions.ts` linhas 83–91
  - `apps/api/src/routes/categories.ts` linhas 21–25
  - `apps/api/src/routes/investments.ts` (sem LIMIT)

**O problema:**
`SELECT * FROM transactions WHERE userId = $1` sem `LIMIT`. Um usuário com muitos registros força o servidor a carregar tudo na memória. Além de ser um vetor de DoS leve, o frontend recebe um payload enorme em toda requisição.

**O que fazer:**
Para categorias e investimentos (conjuntos pequenos): sem urgência agora, mas adicionar `LIMIT 500` como proteção mínima.

Para transações (conjunto grande): implementar paginação por cursor ou offset:

```typescript
// Adicionar query params: ?limit=50&offset=0
transactionsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);

  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(sql`${transactions.date} DESC, ${transactions.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

  return c.json(rows);
});
```

---

### A-02 — Rate limiting ausente nos endpoints custosos

- **Arquivo:** `apps/api/src/app.ts` (onde as rotas são registradas)
- **Contexto:** `apps/api/src/middleware/rateLimit.ts` existe mas só é usado em `/auth`

**O problema:**
Endpoints como `GET /transactions`, `GET /reports/summary` e `GET /cards/:id/statement` não têm rate limit. Um cliente mal-comportado pode fazer centenas de chamadas por segundo sem impedimento.

**O que fazer:**
Aplicar `rateLimit` nos routers mais custosos. Exemplo para relatórios:

```typescript
// apps/api/src/routes/reports.ts
import { rateLimit } from "../middleware/rateLimit";

const reportRateLimit = rateLimit(30, 60 * 1000); // 30 req/min

reportsRouter.use(reportRateLimit);
```

Prioridade de aplicação: `reports` > `transactions GET /` > `cards statement`.

---

### A-03 — Rate limit em memória volátil sem persistência

- **Arquivo:** `apps/api/src/middleware/rateLimit.ts`
- **Linha:** 4

**O problema:**

```typescript
const store = new Map<string, Entry>(); // perdido em todo restart do processo
```

1. Reiniciar o PM2 zera todos os contadores — rate limit "gratuito" em crashes/deploys.
2. Com múltiplos workers (cluster), cada worker tem seu próprio `store` — efetivamente o limite é `N × limit`.

**O que fazer:**
Para o estágio atual do projeto (instância única, PM2 fork mode), o impacto é baixo. A solução ideal é Redis, mas é overkill agora. Solução intermediária: aceitar a limitação e documentar; só migrar para Redis se escalar para múltiplas instâncias.

**Ação mínima:** adicionar comentário no código documentando a limitação para o próximo dev não se surpreender.

---

### A-04 — Stores sem estado de loading e error

- **Arquivos:** todos os stores em `apps/web/src/store/` e `apps/mobile/src/store/`

**O problema:**
Nenhuma store rastreia `isLoading` ou `error`. Se uma requisição falha, o usuário continua vendo dados antigos sem nenhum feedback. Em `useTransactionStore`, o catch é explicitamente silencioso:

```typescript
catch {
  // mantém estado anterior em caso de erro de rede
}
```

**O que fazer:**
Adicionar `isLoading: boolean` e `error: string | null` nas stores que fazem requisições de rede, e exibir feedback na UI ao detectar erro. Prioridade: `useTransactionStore`, `useAccountStore`, `useGoalStore`.

```typescript
// Exemplo de padrão:
load: async () => {
  set({ isLoading: true, error: null });
  try {
    const data = await api.transactions.list();
    set({ transactions: data, isLoading: false });
  } catch (err) {
    set({ isLoading: false, error: "Falha ao carregar transações." });
  }
},
```

---

### A-05 — `Promise.all` no Dashboard sem tratamento de erro

- **Arquivos:**
  - `apps/web/src/pages/Dashboard/index.tsx` linhas 26–30
  - `apps/mobile/app/(tabs)/index.tsx` linhas 82–85

**O problema:**

```typescript
Promise.all([loadTxs(), loadAccounts(), loadCategories(), loadCards()]).then(() =>
  setLoading(false)
);
// Se qualquer store falhar, .then() nunca executa e a tela fica em loading infinito
```

**O que fazer:**

```typescript
Promise.all([loadTxs(), loadAccounts(), loadCategories(), loadCards()])
  .catch((err) => console.error("[Dashboard] falha ao carregar:", err))
  .finally(() => setLoading(false));
```

---

### A-06 — `setState` após desmonte no `TransactionForm` (web)

- **Arquivo:** `apps/web/src/pages/Transactions/TransactionForm.tsx`

**O problema:**
O usuário pode clicar em "Cancelar" enquanto uma requisição está em voo. O componente desmonta, mas quando a resposta chega, `setLoading(false)` é chamado em um componente morto — warning de memory leak em dev, comportamento indefinido em prod.

**O que fazer:**
Usar um ref para rastrear se o componente ainda está montado:

```typescript
const isMountedRef = useRef(true);
useEffect(() => () => { isMountedRef.current = false; }, []);

// No finally:
finally {
  if (isMountedRef.current) setLoading(false);
}
```

Ou, melhor ainda, usar `AbortController` para cancelar a requisição junto com o desmonte (resolve também o item M-07).

---

## 🟡 MÉDIO — 10 itens

> Problemas de design, manutenibilidade e edge cases não tratados.

---

### M-01 — `cards.statement` retorna campos com nomes diferentes no web vs mobile

- **Arquivos:**
  - `apps/web/src/lib/api.ts` — retorna `totalSpent`
  - `apps/mobile/src/lib/api.ts` — retorna `totalAmount` (campo renomeado no mapper)

**O problema:**
Mesma feature, mesma API, nomes de campo diferentes no cliente. Quem mantiver vai perder tempo debugando.

**O que fazer:**
Padronizar para `totalSpent` (igual à API) nos dois clientes e atualizar os componentes que consomem o campo no mobile.

---

### M-02 — Data de relatório construída com dia `31` hardcoded

- **Arquivo:** `apps/api/src/routes/reports.ts`
- **Linha:** 20

**O problema:**

```typescript
const to = `${month}-31`; // Fevereiro não tem dia 31
```

Para meses como `2026-02`, a data `2026-02-31` é inválida. Dependendo de como o PostgreSQL interpreta a comparação `lte(transactions.date, "2026-02-31")`, pode retornar resultado incorreto ou incluir transações erradas.

**O que fazer:**

```typescript
// Calcular o último dia do mês corretamente:
const [year, mon] = month.split("-").map(Number);
const lastDay = new Date(year, mon, 0).getDate(); // dia 0 do mês seguinte = último dia do atual
const to = `${month}-${String(lastDay).padStart(2, "0")}`;
```

---

### M-03 — `CategoryService.findAll()` sem filtro de `userId`

- **Arquivo:** `packages/core/src/services/CategoryService.ts`

**O problema:**

```typescript
async findAll(): Promise<Category[]> {
  const rows = await db.select().from(categories); // todos os usuários!
}
```

As rotas da API fazem o filtro correto, mas essa API do service expõe todos os dados por padrão. Qualquer código futuro que use `categoryService.findAll()` vai expor dados de todos os usuários sem perceber.

**O que fazer:**
Adicionar `userId` como parâmetro obrigatório (ou opcional com filtro):

```typescript
async findAll(userId: string): Promise<Category[]> {
  const rows = await db.select().from(categories).where(eq(categories.userId, userId));
  return rows.map(rowToCategory);
}
```

---

### M-04 — `crypto.randomUUID()` sem import explícito em `cards.ts`

- **Arquivo:** `apps/api/src/routes/cards.ts`
- **Linha:** 182

**O problema:**

```typescript
id: crypto.randomUUID(), // usa o global implícito
```

Em Node.js 19+ o global `crypto` está disponível, mas ambientes de teste ou versões mais antigas podem não tê-lo. O import explícito é mais seguro e deixa a dependência visível.

**O que fazer:**

```typescript
import { randomUUID } from "node:crypto";
// ...
id: randomUUID(),
```

---

### M-05 — Token de e-mail sem `encodeURIComponent`

- **Arquivo:** `apps/api/src/lib/email.ts`
- **Linha:** 15

**O problema:**

```typescript
const link = `${appUrl}/verify-email?token=${token}`;
```

Tokens gerados por `crypto.randomUUID()` não têm caracteres especiais, mas se a geração mudar para algo com `+`, `=` ou `&`, a URL quebra em vários clientes de e-mail.

**O que fazer:**

```typescript
const link = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
```

---

### M-06 — Race condition em updates concorrentes de store (last-write-wins)

- **Arquivo:** `apps/web/src/store/useAccountStore.ts` (e equivalentes)

**O problema:**

```typescript
update: async (id, data) => {
  const updated = await api.accounts.update(id, data); // request 1 e 2 em paralelo
  set((s) => {
    const accounts = s.accounts.map((a) => (a.id === id ? updated : a));
    // request mais lenta chega por último e sobrescreve a resposta mais recente
    return { accounts, ... };
  });
},
```

Dois updates seguidos na mesma conta: o servidor sempre fica correto, mas o cliente pode acabar mostrando o estado do primeiro update.

**O que fazer:**
Adicionar um número de sequência ou timestamp de `updatedAt` no estado, e descartar respostas mais antigas que o estado atual:

```typescript
set((s) => {
  const existing = s.accounts.find((a) => a.id === id);
  if (existing && existing.updatedAt > updated.updatedAt) return s; // descarta resposta antiga
  // ...
});
```

---

### M-07 — Sem `AbortController` em requisições de API

- **Arquivos:** `apps/web/src/lib/api.ts` · `apps/mobile/src/lib/api.ts`

**O problema:**
Quando o usuário muda de tela, as requisições em voo continuam executando. No mobile, `useFocusEffect` dispara `loadAll()` ao voltar para uma tela, gerando múltiplas requests simultâneas sem cancelar as anteriores.

**O que fazer:**
Passar `AbortSignal` nas requisições críticas e cancelar no cleanup do effect:

```typescript
// Em hooks de carregamento de dados:
useEffect(() => {
  const controller = new AbortController();
  loadData(controller.signal);
  return () => controller.abort();
}, []);
```

---

### M-08 — Type assertion com `as` para adicionar propriedade inexistente no tipo

- **Arquivo:** `apps/mobile/src/components/TransactionForm.tsx`

**O problema:**

```typescript
(editing as Transaction & { destinationAccountId?: string }).destinationAccountId;
```

`destinationAccountId` não está no tipo `Transaction`. O cast silencia o erro sem resolver a causa raiz.

**O que fazer:**
Verificar se o campo existe no tipo `Transaction` em `packages/core`. Se não existir, adicioná-lo. Se existir com outro nome, usar o nome correto.

---

### M-09 — Categoria "Metas" criada ad-hoc a cada delete de meta

- **Arquivo:** `apps/api/src/routes/goals.ts`
- **Linhas:** 100–110

**O problema:**

```typescript
// Toda vez que uma meta é deletada com reembolso:
let [metasCategory] = await trx.select()...where(eq(categories.name, "Metas"))...
if (!metasCategory) {
  [metasCategory] = await trx.insert(categories).values({ name: "Metas", ... }).returning();
}
```

Busca por `name` em vez de por um ID fixo. Se o usuário renomear a categoria "Metas", uma nova é criada do nada. Além disso, isso acontece dentro de uma transação de delete — se a criação falhar, o delete falha junto.

**O que fazer:**
Criar a categoria "Metas" no onboarding do usuário (em `seedDefaultCategories`) com um ID ou `slug` fixo, e referenciá-la por esse ID. Remove a necessidade de `INSERT OR SELECT` ad-hoc.

---

### M-10 — Dois schemas Drizzle sem verificação de sincronização

- **Arquivos:**
  - `apps/api/src/db/schema.ts` (PostgreSQL)
  - `packages/core/src/db/schema.ts` (SQLite)

**O problema:**
Qualquer alteração de campo exige atualização manual nos dois schemas. Não há nenhum mecanismo que detecte divergência. Já gerou bugs anteriormente (ver auditoria de 2026-05-20).

**O que fazer:**
A solução definitiva é gerar o schema do core a partir do schema da API (single source of truth). No curto prazo: adicionar um teste de CI que compara os campos das tabelas principais em ambos os schemas e falha se divergirem.

---

## 🔵 BAIXO — 5 itens

> Dívida técnica e polish. Não afetam funcionalidade atual.

---

### B-01 — Falta de índice composto `(user_id, date)` na tabela `transactions`

- **Arquivo:** `apps/api/src/db/schema.ts`

**O problema:**
Toda query de listagem e relatório filtra por `userId` e ordena por `date`. Sem índice, o banco faz table scan. Para volumes pequenos é invisível, mas escala mal.

**O que fazer:**
Adicionar na próxima migration:

```sql
CREATE INDEX idx_transactions_user_date ON ledger.transactions(user_id, date DESC);
```

Ou via Drizzle schema:

```typescript
export const transactions = ledgerSchema.table("transactions", { ... }, (t) => ({
  userDateIdx: index("idx_transactions_user_date").on(t.userId, t.date),
}));
```

---

### B-02 — `billingDay` e `dueDay` limitados a max 28 artificialmente

- **Arquivo:** `apps/api/src/routes/cards.ts`
- **Linhas:** 14–15

**O problema:**

```typescript
billingDay: z.number().int().min(1).max(28), // exclui dias 29, 30, 31
dueDay:     z.number().int().min(1).max(28),
```

Cartões reais têm vencimento nos dias 29, 30 e 31. Limitar a 28 rejeita dados válidos.

**O que fazer:**

```typescript
billingDay: z.number().int().min(1).max(31),
dueDay:     z.number().int().min(1).max(31),
```

---

### B-03 — Logs com stack trace completo em produção

- **Arquivo:** `apps/api/src/routes/auth.ts`

**O problema:**

```typescript
console.error("[auth] failed to send verification email:", err);
```

O objeto `err` completo pode conter tokens, IDs internos ou stack traces. Em produção, logs vão para PM2/arquivo e podem ser lidos por quem tem acesso ao servidor.

**O que fazer:**
Logar apenas `err.message` em produção, ou melhor, um código de erro interno:

```typescript
console.error(
  "[auth] failed to send verification email to user, code:",
  err instanceof Error ? err.message : "unknown"
);
```

---

### B-04 — `isLocked` não persistido no `useUiStore` (mobile)

- **Arquivo:** `apps/mobile/src/store/useUiStore.ts`

**O problema:**
`partialize` salva `isHidden` e `isBiometricEnabled`, mas não `isLocked`. Se o app for fechado enquanto bloqueado, na próxima abertura estará desbloqueado. Pode ser intencional (segurança), mas não está documentado.

**O que fazer:**
Se o comportamento atual (desbloqueado ao reabrir) for intencional por segurança: adicionar um comentário explicando. Se não for: adicionar `isLocked` ao `partialize`.

---

### B-05 — Sem debounce na navegação de mês na fatura do cartão (web)

- **Arquivo:** `apps/web/src/pages/Cards/index.tsx`

**O problema:**
Cliques rápidos nos botões `◄ ►` disparam uma request por clique. Podem chegar fora de ordem e exibir o mês errado temporariamente.

**O que fazer:**

```typescript
import { useDeferredValue } from "react";
// ou simplesmente cancelar a request anterior com AbortController ao mudar de mês
```

---

## Resumo — Contagem por Severidade

| Severidade | Itens  | IDs                    |
| ---------- | ------ | ---------------------- |
| 🔴 Crítico | 4      | C-01, C-02, C-03, C-04 |
| 🟠 Alto    | 6      | A-01 a A-06            |
| 🟡 Médio   | 10     | M-01 a M-10            |
| 🔵 Baixo   | 5      | B-01 a B-05            |
| **Total**  | **25** |                        |

## Ordem de execução recomendada

```
C-01 → C-02 → C-03 → C-04      (críticos — mesma sessão)
A-01 → A-02 → A-05 → A-06      (alto — impacto direto no usuário)
A-03 → A-04                     (alto — esforço maior, planejar separado)
M-02 → M-05 → M-04 → M-01      (médio — quickfixes rápidos)
M-03 → M-08 → M-06 → M-07      (médio — refatorações)
M-09 → M-10                     (médio — impacta arquitetura)
B-02 → B-03 → B-05 → B-04      (baixo — pode ir junto com outros commits)
B-01                             (baixo — próxima migration)
```
