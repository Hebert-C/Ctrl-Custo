-- planning.recurring_bills — contas recorrentes (ex: luz, internet, aluguel)
CREATE TABLE IF NOT EXISTS planning.recurring_bills (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text         NOT NULL,
  due_day       integer      NOT NULL CHECK (due_day BETWEEN 1 AND 28),
  amount_cents  integer,                 -- NULL = boleto variável (PAY-02)
  account_id    uuid         NOT NULL REFERENCES banking.accounts(id),
  category_id   uuid         NOT NULL REFERENCES ledger.categories(id),
  is_active     boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

-- planning.recurring_payments — histórico de pagamentos por mês
CREATE TABLE IF NOT EXISTS planning.recurring_payments (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_bill_id   uuid         NOT NULL REFERENCES planning.recurring_bills(id) ON DELETE CASCADE,
  transaction_id      uuid         REFERENCES ledger.transactions(id) ON DELETE SET NULL,
  due_date            text         NOT NULL,  -- YYYY-MM
  paid_at             timestamptz  NOT NULL DEFAULT now(),
  amount_cents        integer      NOT NULL,
  created_at          timestamptz  NOT NULL DEFAULT now(),

  UNIQUE (recurring_bill_id, due_date)       -- PAY-06: um pagamento por mês
);

-- Grants
GRANT ALL ON planning.recurring_bills    TO ctrl_custo_user;
GRANT ALL ON planning.recurring_payments TO ctrl_custo_user;
