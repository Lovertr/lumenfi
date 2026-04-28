-- Recurring transactions: user-defined templates that auto-create transactions on a chosen day each month

CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  day_of_month SMALLINT NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_on DATE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_transactions(user_id, is_active);

ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recurring_select_own" ON recurring_transactions;
CREATE POLICY "recurring_select_own" ON recurring_transactions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "recurring_insert_own" ON recurring_transactions;
CREATE POLICY "recurring_insert_own" ON recurring_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "recurring_update_own" ON recurring_transactions;
CREATE POLICY "recurring_update_own" ON recurring_transactions
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "recurring_delete_own" ON recurring_transactions;
CREATE POLICY "recurring_delete_own" ON recurring_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Add goal_id link to existing transactions table (for the materialized rows + manual goal-tagged tx)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurring_id UUID REFERENCES recurring_transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tx_goal ON transactions(goal_id) WHERE goal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tx_recurring ON transactions(recurring_id) WHERE recurring_id IS NOT NULL;

-- Add to_account_id for transfers (FROM = account_id, TO = to_account_id)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tx_to_account ON transactions(to_account_id) WHERE to_account_id IS NOT NULL;
