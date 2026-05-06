-- Migration: reorganise public schema into domain schemas
-- Schemas: auth | banking | ledger | planning | portfolio | household | reports

-- ─── 1. Create schemas ────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS banking;
CREATE SCHEMA IF NOT EXISTS ledger;
CREATE SCHEMA IF NOT EXISTS planning;
CREATE SCHEMA IF NOT EXISTS portfolio;
CREATE SCHEMA IF NOT EXISTS household;
CREATE SCHEMA IF NOT EXISTS reports;

-- ─── 2. Move enum types to their domain schema ────────────────────────────────
ALTER TYPE public.account_type SET SCHEMA banking;
ALTER TYPE public.card_brand SET SCHEMA banking;
ALTER TYPE public.category_type SET SCHEMA ledger;
ALTER TYPE public.transaction_type SET SCHEMA ledger;
ALTER TYPE public.transaction_status SET SCHEMA ledger;
ALTER TYPE public.goal_status SET SCHEMA planning;
ALTER TYPE public.investment_type SET SCHEMA portfolio;

-- ─── 3. Move tables to their domain schema ────────────────────────────────────
ALTER TABLE public.users SET SCHEMA auth;
ALTER TABLE public.accounts SET SCHEMA banking;
ALTER TABLE public.cards SET SCHEMA banking;
ALTER TABLE public.categories SET SCHEMA ledger;
ALTER TABLE public.transactions SET SCHEMA ledger;
ALTER TABLE public.goals SET SCHEMA planning;
ALTER TABLE public.investments SET SCHEMA portfolio;

-- ─── 4. Grant permissions on new schemas ─────────────────────────────────────
GRANT USAGE ON SCHEMA auth, banking, ledger, planning, portfolio, household, reports TO ctrl_custo_user;
GRANT ALL ON ALL TABLES IN SCHEMA auth, banking, ledger, planning, portfolio, household TO ctrl_custo_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth, banking, ledger, planning, portfolio, household TO ctrl_custo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth, banking, ledger, planning, portfolio, household
  GRANT ALL ON TABLES TO ctrl_custo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth, banking, ledger, planning, portfolio, household
  GRANT ALL ON SEQUENCES TO ctrl_custo_user;

-- ─── 5. Reports views (somente leitura, cross-schema) ─────────────────────────

-- Fluxo mensal: receitas vs despesas por usuário/mês
CREATE VIEW reports.monthly_cashflow AS
SELECT
  t.user_id,
  DATE_TRUNC('month', t.date::date)                                        AS month,
  SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END)              AS total_income,
  SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END)              AS total_expenses,
  SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE -t.amount END)      AS net
FROM ledger.transactions t
WHERE t.type IN ('income', 'expense')
GROUP BY t.user_id, DATE_TRUNC('month', t.date::date);

-- Gastos por categoria no mês
CREATE VIEW reports.category_spending AS
SELECT
  t.user_id,
  t.category_id,
  c.name                                    AS category_name,
  c.type                                    AS category_type,
  c.color                                   AS category_color,
  c.icon                                    AS category_icon,
  DATE_TRUNC('month', t.date::date)         AS month,
  SUM(t.amount)                             AS total
FROM ledger.transactions t
JOIN ledger.categories c ON c.id = t.category_id
WHERE t.status != 'cancelled'
GROUP BY t.user_id, t.category_id, c.name, c.type, c.color, c.icon,
         DATE_TRUNC('month', t.date::date);

-- Progresso das metas
CREATE VIEW reports.goal_progress AS
SELECT
  g.user_id,
  g.id,
  g.name,
  g.target_amount,
  g.current_amount,
  ROUND((g.current_amount::numeric / NULLIF(g.target_amount, 0)) * 100, 2) AS progress_pct,
  g.deadline,
  g.status
FROM planning.goals g;

-- Rentabilidade da carteira de investimentos
CREATE VIEW reports.portfolio_performance AS
SELECT
  i.user_id,
  i.id,
  i.name,
  i.type,
  i.ticker,
  i.quantity,
  i.purchase_price,
  i.current_price,
  (i.current_price - i.purchase_price)                                                AS unit_gain,
  ROUND(((i.current_price - i.purchase_price)::numeric / NULLIF(i.purchase_price, 0)) * 100, 2) AS gain_pct,
  ROUND((i.current_price * i.quantity)::numeric)::integer                             AS total_value,
  ROUND((i.purchase_price * i.quantity)::numeric)::integer                            AS total_cost
FROM portfolio.investments i;

-- Patrimônio líquido: ativos líquidos (contas) + carteira de investimentos
CREATE VIEW reports.net_worth AS
SELECT
  u.id                                    AS user_id,
  COALESCE(liq.total_balance, 0)          AS liquid_assets,
  COALESCE(inv.total_portfolio, 0)        AS investment_assets,
  COALESCE(liq.total_balance, 0)
    + COALESCE(inv.total_portfolio, 0)    AS net_worth
FROM auth.users u
LEFT JOIN (
  SELECT user_id, SUM(balance) AS total_balance
  FROM banking.accounts
  WHERE is_archived = false
    AND type != 'investment'
  GROUP BY user_id
) liq ON liq.user_id = u.id
LEFT JOIN (
  SELECT user_id, ROUND(SUM(current_price * quantity)::numeric)::integer AS total_portfolio
  FROM portfolio.investments
  GROUP BY user_id
) inv ON inv.user_id = u.id;

-- Fatura do cartão: transações parceladas por cartão/mês
CREATE VIEW reports.card_statement AS
SELECT
  t.user_id,
  t.card_id,
  k.name                               AS card_name,
  k.brand                              AS card_brand,
  DATE_TRUNC('month', t.date::date)    AS month,
  COUNT(*)                             AS transaction_count,
  SUM(t.amount)                        AS total_amount
FROM ledger.transactions t
JOIN banking.cards k ON k.id = t.card_id
WHERE t.card_id IS NOT NULL
  AND t.status != 'cancelled'
GROUP BY t.user_id, t.card_id, k.name, k.brand, DATE_TRUNC('month', t.date::date);

-- Acesso somente leitura ao schema reports
GRANT USAGE ON SCHEMA reports TO ctrl_custo_user;
GRANT SELECT ON ALL TABLES IN SCHEMA reports TO ctrl_custo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA reports GRANT SELECT ON TABLES TO ctrl_custo_user;
