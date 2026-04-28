-- Saved debt-payoff plans
CREATE TABLE IF NOT EXISTS debt_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy TEXT NOT NULL CHECK (strategy IN ('avalanche', 'snowball')),
  extra_per_month NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (extra_per_month >= 0),
  total_months SMALLINT,
  total_interest NUMERIC(14,2),
  payoff_order JSONB,           -- [{debt_id, name, month}, ...]
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active plan per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_debt_plan_active_one
  ON debt_plans(user_id) WHERE is_active = true;

ALTER TABLE debt_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debt_plans_select_own" ON debt_plans;
CREATE POLICY "debt_plans_select_own" ON debt_plans FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "debt_plans_insert_own" ON debt_plans;
CREATE POLICY "debt_plans_insert_own" ON debt_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "debt_plans_update_own" ON debt_plans;
CREATE POLICY "debt_plans_update_own" ON debt_plans FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "debt_plans_delete_own" ON debt_plans;
CREATE POLICY "debt_plans_delete_own" ON debt_plans FOR DELETE USING (auth.uid() = user_id);
