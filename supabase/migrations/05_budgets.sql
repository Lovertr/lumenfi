-- Monthly budget envelopes per category
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_budget_user ON budgets(user_id);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budget_select_own" ON budgets;
CREATE POLICY "budget_select_own" ON budgets FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "budget_insert_own" ON budgets;
CREATE POLICY "budget_insert_own" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "budget_update_own" ON budgets;
CREATE POLICY "budget_update_own" ON budgets FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "budget_delete_own" ON budgets;
CREATE POLICY "budget_delete_own" ON budgets FOR DELETE USING (auth.uid() = user_id);
