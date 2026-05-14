# Cobertura de Testes — Ctrl+Custo Mobile

> Objetivo: mapear as regras de negócio existentes e identificar quais têm cobertura automatizada.
> Completar esta cobertura **antes** de adicionar novas features.

---

## O que já está testado

| Arquivo                       | Tipo       | O que cobre                                                                     |
| ----------------------------- | ---------- | ------------------------------------------------------------------------------- |
| `useCurrency.test.ts`         | Unitário   | `parseCurrencyInput`, `formatCurrencyInput`, `formatCurrency`                   |
| `reportUtils.test.ts`         | Unitário   | `lastNMonths`, `aggregateMonths`, `buildCumulativeLine`, `isCurrentMonth`       |
| `TransactionForm.test.tsx`    | Componente | Renderização, validação de campos obrigatórios, modo edição, tipo transferência |
| `AccountForm.test.tsx`        | Componente | Renderização modo criação e edição                                              |
| `GoalForm.test.tsx`           | Componente | Renderização do formulário de meta                                              |
| `TransactionFilters.test.tsx` | Componente | Renderização e comportamento dos filtros                                        |

**Total atual: 77 testes**

---

## Regras de negócio sem cobertura automatizada

### 🔴 Alta prioridade (afetam fluxos críticos)

#### Store — `useTransactionStore`

- [ ] `load(filters)` com `startDate`/`endDate` retorna apenas transações do período
- [ ] `load()` sobrescreve o estado anterior (não acumula)
- [ ] `add()` adiciona a transação no início da lista
- [ ] `remove()` remove da lista sem recarregar da API
- [ ] `update()` substitui o item correto na lista
- [ ] `addInstallments()` cria N transações com datas mensais corretas
- [ ] `addInstallments()` divide o valor corretamente em centavos (`Math.round`)

#### Isolamento entre telas (bug encontrado em 2026-05-14)

- [ ] Dashboard ao ganhar foco recarrega seu próprio mês (não usa dados residuais de Transações)
- [ ] Transações ao ganhar foco recarrega seu próprio mês (não usa dados residuais do Dashboard)
- [ ] Trocar mês em Transações não altera o mês exibido no Dashboard

#### Regras monetárias

- [ ] Transação `income` incrementa saldo da conta
- [ ] Transação `expense` decrementa saldo da conta
- [ ] Transferência debita conta origem e credita conta destino
- [ ] Deletar transação `income` reverte o saldo
- [ ] Deletar transação `expense` reverte o saldo
- [ ] Deletar transferência reverte ambos os saldos

#### Depósito em meta

- [ ] Depósito incrementa `currentAmount` da meta
- [ ] Depósito cria transação `expense` na conta vinculada
- [ ] Depósito decrementa saldo da conta vinculada

---

### 🟡 Média prioridade

#### Dashboard

- [ ] `totalIncome` considera apenas transações `confirmed`
- [ ] `totalExpense` considera apenas transações `confirmed`
- [ ] Transferências **não** entram no cálculo de `totalIncome`/`totalExpense`
- [ ] Hero card fica vermelho quando `monthNet < 0`
- [ ] "Últimas transações" mostra no máximo 5 itens

#### Formulário de transação

- [ ] Ao selecionar cartão, campo "Banco" é preenchido automaticamente
- [ ] Ao selecionar cartão, campo "Banco" fica oculto
- [ ] Tipo `transfer` exige `destinationAccountId`
- [ ] Parcelas: campo parcelas só aparece quando tipo é `expense`
- [ ] Parcelas: valor é dividido igualmente

#### Filtros de transação

- [ ] Filtros se combinam (tipo + categoria + banco)
- [ ] Limpar filtros restaura a lista completa do mês
- [ ] Badge no botão reflete o número de filtros ativos

---

### 🟢 Baixa prioridade (UI/visual)

- [ ] Saldo negativo de banco aparece em vermelho na lista de bancos
- [ ] Badge "atual" aparece na linha do mês corrente na tabela de relatórios
- [ ] Transação pendente exibe label "pendente"
- [ ] Parcelas exibem `current/total` (ex: `2/6x`)

---

## Cobertura E2E (Maestro Cloud) — pendente `MAESTRO_API_KEY`

Os flows `.maestro/*.yaml` existentes cobrem fluxos básicos. Flows a criar:

- [ ] `tab_isolation.yaml` — troca de abas não corrompe dados exibidos
- [ ] `transfer.yaml` — criar transferência, verificar saldos de origem e destino
- [ ] `installments.yaml` — criar despesa parcelada, verificar projeção nos meses seguintes
- [ ] `goal_deposit.yaml` — depositar em meta, verificar transação gerada e saldo debitado
- [ ] `month_navigation.yaml` — navegar entre meses no Dashboard e em Transações

---

## Ordem de implementação sugerida

1. `useTransactionStore.test.ts` — store com mock da API (`jest.fn()`)
2. `screen_dashboard.test.tsx` — lógica de cálculo do Dashboard com dados mockados
3. `screen_transactions.test.tsx` — isolamento de mês e filtros
4. Flows Maestro (após configurar `MAESTRO_API_KEY`)
