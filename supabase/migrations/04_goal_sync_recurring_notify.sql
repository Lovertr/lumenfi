-- Goal ↔ Account linking
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS linked_account_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Recurring transactions: support transfer type, plus notification settings
ALTER TABLE recurring_transactions
  DROP CONSTRAINT IF EXISTS recurring_transactions_type_check;
ALTER TABLE recurring_transactions
  ADD CONSTRAINT recurring_transactions_type_check
  CHECK (type IN ('income','expense','transfer'));

ALTER TABLE recurring_transactions
  ADD COLUMN IF NOT EXISTS to_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS notify_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notify_days_before SMALLINT NOT NULL DEFAULT 0
    CHECK (notify_days_before BETWEEN 0 AND 14),
  ADD COLUMN IF NOT EXISTS last_notified_on DATE;

-- Push subscriptions for PWA
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_select_own" ON push_subscriptions;
CREATE POLICY "push_select_own" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "push_insert_own" ON push_subscriptions;
CREATE POLICY "push_insert_own" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "push_delete_own" ON push_subscriptions;
CREATE POLICY "push_delete_own" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);
