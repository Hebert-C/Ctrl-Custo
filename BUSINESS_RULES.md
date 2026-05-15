# Regras de Negócio — Ctrl+Custo

> **Convenção:** Toda nova feature deve ter suas RNs documentadas aqui **antes** da implementação.
> Código sem RN documentada é código sem especificação.
>
> **Legenda de status:**
>
> - ✅ Implementada
> - ⚠️ Parcialmente implementada
> - ❌ Ausente (bug ou lacuna)

---

## Índice

- [Domínio: Auth](#domínio-auth)
- [Domínio: Accounts (Bancos)](#domínio-accounts-bancos)
- [Domínio: Cards (Cartões)](#domínio-cards-cartões)
- [Domínio: Categories (Categorias)](#domínio-categories-categorias)
- [Domínio: Transactions (Transações)](#domínio-transactions-transações)
- [Domínio: Goals (Metas)](#domínio-goals-metas)
- [Domínio: Investments (Investimentos)](#domínio-investments-investimentos)
- [Domínio: Reports (Relatórios)](#domínio-reports-relatórios)
- [Regras Transversais](#regras-transversais)

---

## Domínio: Auth

### RN-AUTH-01 — Registro só com e-mail único ✅

Um e-mail não pode estar cadastrado em duas contas. Tentativa de registro com e-mail existente retorna erro 409.

### RN-AUTH-02 — Senha com mínimo de segurança ✅

Senha mínima de 8 caracteres, máxima de 128. Armazenada com Argon2id (nunca em texto plano).

### RN-AUTH-03 — Login bloqueado após falhas consecutivas ✅

Após 10 tentativas falhas de login, a conta é bloqueada por 30 minutos (`lockedUntil`). Contador zerado após login bem-sucedido.

### RN-AUTH-04 — E-mail deve ser verificado antes do primeiro login ✅

Registro não emite token JWT. Envia e-mail com link de verificação (TTL: 24h). Login de conta não verificada retorna 403.

### RN-AUTH-05 — Token de verificação é de uso único ✅

Após verificar o e-mail, o token é invalidado. Reenvio gera novo token e invalida o anterior.

### RN-AUTH-06 — Access token de curta duração ✅

Access token JWT expira em 15 minutos. Renovação via refresh token (httpOnly cookie, longa duração). Mobile usa `expo-secure-store` para o access token.

### RN-AUTH-07 — Categorias padrão criadas no registro ✅

Ao criar conta, 15 categorias padrão são inseridas automaticamente (10 despesas, 4 receitas, 1 ambos). O usuário pode editá-las ou excluí-las depois.

### RN-AUTH-08 — Proteção contra timing attack ✅

Se o e-mail não existe, um hash dummy é verificado mesmo assim, para que o tempo de resposta não revele se o e-mail está cadastrado.

---

## Domínio: Accounts (Bancos)

### RN-ACC-01 — Saldo armazenado em centavos ✅

`balance` é um inteiro representando centavos (BRL). Nunca usar ponto flutuante para dinheiro.

### RN-ACC-02 — Conta pertence a um único usuário ✅

`userId` é obrigatório e imutável. Nenhuma operação pode referenciar conta de outro usuário.

### RN-ACC-03 — Conta com transações não pode ser deletada ✅

Tentativa de DELETE com transações vinculadas retorna 409. A ação correta é arquivar (`isArchived = true`).

### RN-ACC-04 — Conta arquivada some da listagem padrão ✅

`GET /accounts` retorna apenas `isArchived = false`. Contas arquivadas só aparecem se explicitamente solicitado.

### RN-ACC-05 — Conta arquivada não pode receber novas operações ❌

Transações, depósitos de meta e transferências não verificam `isArchived` antes de debitar/creditar. **Deve retornar 422.**

### RN-ACC-06 — Saldo insuficiente bloqueia débito ❌

Ao criar despesa (`type = "expense"`) ou transferência (débito na origem), verificar se `balance - amount >= 0`. Exceção: contas do tipo `credit` podem ter saldo negativo dentro do limite do cartão associado. **Deve retornar 422.**

### RN-ACC-07 — Tipos de conta válidos ✅

`type` aceita: `checking` (corrente), `savings` (poupança), `investment` (investimento), `cash` (dinheiro físico), `wallet` (carteira digital).

---

## Domínio: Cards (Cartões)

### RN-CARD-01 — Cartão vinculado a uma conta de débito ✅

Todo cartão tem um `accountId` obrigatório — a conta de onde a fatura será paga.

### RN-CARD-02 — Limite de crédito em centavos ✅

`creditLimit` é inteiro em centavos. Pode ser zero (cartão de débito sem limite de crédito).

### RN-CARD-03 — Limite não pode ser excedido ❌

Ao criar transação com `cardId`, verificar se `despesas_do_mes + amount <= creditLimit`. **Deve retornar 422 com o limite disponível no erro.**

### RN-CARD-04 — `billingDay` e `dueDay` são dias do mês válidos ⚠️

Aceitos valores 1–31, mas não validado se o dia existe no mês (ex: 30 de fevereiro). Por ora a validação é 1–31.

### RN-CARD-05 — Fatura calculada sobre transações do mês vigente ⚠️

`GET /cards/:id/statement` filtra transações pelo mês informado. Ainda não usa `billingDay`/`dueDay` para calcular o período real da fatura (ex: do dia 6 ao dia 5 do mês seguinte).

### RN-CARD-06 — Disponível = limite − total gasto no mês ✅

`availableLimit = creditLimit - totalSpent` onde `totalSpent` soma apenas `type = "expense"` do mês.

### RN-CARD-07 — Cartão arquivado não aparece nas listagens ✅

`GET /cards` filtra `isArchived = false`.

---

## Domínio: Categories (Categorias)

### RN-CAT-01 — Tipo determina uso permitido ✅

- `income`: só pode ser usada em transações de entrada
- `expense`: só pode ser usada em transações de saída
- `both`: pode ser usada em qualquer tipo

### RN-CAT-02 — Categoria com transações exige transferência antes do delete ✅

`DELETE /categories/:id` com transações vinculadas: obrigatório informar `?transferTo=<uuid>`. A API reatribui todas as transações atomicamente e depois deleta a categoria.

### RN-CAT-03 — Categoria não pode ser transferida para si mesma ❌

`DELETE /categories/:id?transferTo=:id` deve ser rejeitado. **Deve retornar 400.**

### RN-CAT-04 — Ícone é opcional ✅

Campo `icon` aceita string vazia — exibido como `×` na UI.

### RN-CAT-05 — Categorias padrão podem ser editadas e excluídas ✅

Não há diferença técnica entre categorias criadas pelo usuário e as do seed. O usuário tem controle total.

---

## Domínio: Transactions (Transações)

### RN-TX-01 — Valores sempre positivos em centavos ✅

`amount > 0`, inteiro em centavos. O tipo (`income`/`expense`/`transfer`) define a direção — o valor em si é sempre positivo.

### RN-TX-02 — Transferência exige conta de destino ✅

Se `type = "transfer"`, `destinationAccountId` é obrigatório. Validado no schema Zod.

### RN-TX-03 — Transferência não pode ser entre a mesma conta ⚠️

Frontend valida, mas a API aceita `accountId === destinationAccountId`. **Deve retornar 400 no backend.**

### RN-TX-04 — Transferência não conta como receita nem despesa ✅

Dashboard e Relatórios excluem `type = "transfer"` dos totais de entrada e saída. Uma transferência é uma movimentação interna e não afeta o fluxo mensal.

### RN-TX-05 — Saldo atualizado apenas para status `confirmed` ✅

Transações `pending` e `cancelled` não movimentam o saldo de nenhuma conta. O saldo reflete apenas a realidade financeira atual.

### RN-TX-06 — Cancelar transação confirmada deve reverter o saldo ❌

Se `status` muda de `confirmed` → `cancelled` via PUT, o impacto original no saldo deve ser revertido. Hoje o PUT só reverte quando `accountId` muda. **Deve reverter também na mudança de status.**

### RN-TX-07 — Confirmar transação pendente deve aplicar o saldo ❌

Se `status` muda de `pending` → `confirmed` via PUT, o saldo deve ser movimentado como se fosse uma criação nova. **Deve aplicar `applyTransferBalances` no PUT nesses casos.**

### RN-TX-08 — Data deve ser válida ⚠️

Formato `YYYY-MM-DD` validado por regex, mas datas impossíveis como `2024-02-30` passam. **Deve validar com `new Date()` e checar se não é `NaN`.**

### RN-TX-09 — Descrição não pode ser só espaços em branco ❌

`z.string().min(1)` aceita `"   "`. **Deve aplicar `.trim()` antes de validar.**

### RN-TX-10 — Propriedade dos recursos vinculados ⚠️

`accountId`, `categoryId`, `cardId`, `destinationAccountId` devem pertencer ao usuário logado. Hoje `accountId` tem validação parcial no PUT. **Todos devem ser verificados no POST e PUT.**

### RN-TX-11 — Arredondamento de parcelas não perde centavos ❌

`Math.round(amount / total)` em 3× de R$ 100 gera 3 × R$ 33 = R$ 99 (perde R$ 0,01).
**Regra:** última parcela = `amount − (total − 1) × amountPerInstallment`.

### RN-TX-12 — Máximo de 24 parcelas ❌

Não há limite superior no campo `installmentTotal`. **Deve validar `max(24)`.**

### RN-TX-13 — Parcelas só em despesas com cartão ⚠️

Parcelamento faz sentido apenas em `type = "expense"` com `cardId`. Não existe validação que impeça parcelas em transferências ou receitas.

### RN-TX-14 — Status `pending` disponível no mobile ❌

Mobile cria todas as transações como `"confirmed"`. Transações pendentes (boletos, parcelas futuras) não são acessíveis no mobile. **Deve adicionar toggle no formulário mobile.**

---

## Domínio: Goals (Metas)

### RN-GOAL-01 — Valor alvo deve ser positivo ✅

`targetAmount > 0`, inteiro em centavos.

### RN-GOAL-02 — `currentAmount` começa em zero ✅

Ao criar, `currentAmount = 0`. Só aumenta via depósitos.

### RN-GOAL-03 — Depósito debita a conta escolhida ✅

`POST /goals/:id/deposit` cria uma transação `expense` e debita o `balance` da conta. Operação atômica.

### RN-GOAL-04 — Meta completa quando atinge o alvo ✅

Se após depósito `currentAmount >= targetAmount`, `status` muda para `"completed"` automaticamente.

### RN-GOAL-05 — Depósito não pode exceder o valor alvo ❌

Hoje é possível depositar além de `targetAmount`. **Deve retornar 422 se `currentAmount + amount > targetAmount`.**

### RN-GOAL-06 — Delete com depósitos exige conta de reembolso ✅

Se a meta tem depósitos e `refundAccountId` não for informado, retorna 400. O reembolso é feito atomicamente.

### RN-GOAL-07 — Conta de reembolso não pode estar arquivada ⚠️

A API aceita qualquer `refundAccountId` sem verificar `isArchived`. **Deve rejeitar conta arquivada com 422.**

### RN-GOAL-08 — Prazo deve ser data futura ❌

Campo `deadline` aceita qualquer data no formato `YYYY-MM-DD`, incluindo datas passadas. **Deve validar `deadline > hoje` no backend.**

### RN-GOAL-09 — Meta cancelada não aceita depósitos ❌

Não há validação de `status` ao depositar. **Deve retornar 422 se `status !== "active"`.**

### RN-GOAL-10 — `currentAmount` nunca é negativo ✅

Só aumenta via depósito. Delete apaga a meta inteira — não há operação de "saque parcial".

---

## Domínio: Investments (Investimentos)

> **Status:** Schema definido, rotas ainda não implementadas.
> Implementar junto com a feature na branch `feature/investments`.

### RN-INV-01 — Preço em centavos _(a implementar)_

`purchasePrice` e `currentPrice` em centavos inteiros. Para ativos com muitos decimais (crypto), usar centavos de centavos (8 casas decimais como inteiro) ou definir escala no schema.

### RN-INV-02 — Quantidade pode ser fracionada _(a implementar)_

`quantity` é `DOUBLE` — permite frações (ex: 0,5 ação, 0,00045 BTC). Cálculo de valor total: `quantity × currentPrice`.

### RN-INV-03 — Ganho/perda calculado on-the-fly _(a implementar)_

Nunca armazenar ganho/perda — calcular na leitura: `(currentPrice − purchasePrice) × quantity`.

### RN-INV-04 — `currentPrice` atualizado manualmente _(a implementar)_

O app não consulta API de cotações. O usuário atualiza o preço atual quando quiser. Sem preço de mercado em tempo real.

### RN-INV-05 — Investimento pertence a uma conta _(a implementar)_

`accountId` obrigatório — representa de qual conta o dinheiro saiu para o investimento.

### RN-INV-06 — Tipos válidos _(a implementar)_

`type`: `stock` (ação), `fund` (fundo), `crypto` (criptomoeda), `fixed_income` (renda fixa), `real_estate` (FII/imóvel), `other`.

---

## Domínio: Reports (Relatórios)

### RN-REP-01 — Apenas transações confirmadas entram nos relatórios ✅

`status = "confirmed"` é o único que conta para totais de receita, despesa e saldo.

### RN-REP-02 — Transferências não afetam o fluxo mensal ✅

`type = "transfer"` é excluído dos cálculos de `income` e `expense`.

### RN-REP-03 — Mês deve ser informado no formato `YYYY-MM` ✅

Parâmetro `month` obrigatório para o sumário. Validado por regex.

### RN-REP-04 — Saldo do mês ≠ saldo total da conta ✅

`balance` do relatório = receitas do mês − despesas do mês. Saldo bancário é calculado a partir de todas as transações históricas.

### RN-REP-05 — Exportação inclui apenas transações do período selecionado ✅

CSV e XLSX exportam o mesmo conjunto filtrado exibido na tela — sem dados fora do período.

---

## Regras Transversais

### RN-CROSS-01 — `userId` sempre do JWT, nunca do body ✅

Em toda operação autenticada, o `userId` é extraído do token decodificado. O cliente não pode declarar a qual usuário um recurso pertence.

### RN-CROSS-02 — Recurso de outro usuário retorna 404, não 403 ✅

Não revelar que o recurso existe. Se o usuário não é dono, responder como se não existisse.

### RN-CROSS-03 — Operações críticas são atômicas ✅

Operações que afetam múltiplas tabelas (criar transação + atualizar saldo, depositar em meta, deletar meta com reembolso) usam `db.transaction()`. Falha em qualquer etapa reverte tudo.

### RN-CROSS-04 — Datas armazenadas como texto `YYYY-MM-DD` ✅

Sem `DATE` nativo do PostgreSQL para evitar problemas de timezone. Comparações feitas como string (ISO 8601 ordena corretamente).

### RN-CROSS-05 — Todos os recursos têm `createdAt` e `updatedAt` ✅

`updatedAt` deve ser atualizado explicitamente em todo UPDATE (`set({ updatedAt: new Date() })`).

### RN-CROSS-06 — DELETE em cascata pelo PostgreSQL ✅

Deletar um usuário remove todos os seus dados (contas, cartões, categorias, transações, metas, investimentos) via `ON DELETE CASCADE` no banco.

### RN-CROSS-07 — Soft delete preferível a hard delete para contas e cartões ✅

Usar `isArchived = true` em vez de deletar fisicamente — preserva o histórico de transações vinculadas.

### RN-CROSS-08 — Rate limiting nas rotas de autenticação ✅

10 requisições por 15 minutos por IP nas rotas de auth. Evita brute force e enumeração de e-mails.

---

## Template para nova feature

Ao iniciar qualquer nova feature, adicionar uma seção neste arquivo com o seguinte formato:

```markdown
## Domínio: <Nome> (<Feature>)

### RN-<SIGLA>-01 — <Título curto> <status>

<Descrição da regra: o que é permitido, o que é proibido, qual o comportamento esperado.>
**Onde aplicar:** backend / frontend / ambos
**Erro esperado:** HTTP 4XX com mensagem clara
```

Exemplos de siglas: `PAY` (pagamentos recorrentes), `FAM` (contas família), `INST` (parcelas futuras), `AI` (assistente IA).
