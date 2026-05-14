ALTER TABLE ledger.transactions
  ADD COLUMN IF NOT EXISTS goal_id uuid
    REFERENCES planning.goals(id) ON DELETE SET NULL;
