ALTER TABLE ledger.transactions
  ADD COLUMN IF NOT EXISTS destination_account_id uuid
    REFERENCES banking.accounts(id);
