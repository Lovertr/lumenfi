-- ─────────────────────────────────────────────────────────
-- Migration 20: Performance indexes
-- Adds indexes for the hottest query patterns in Lumenfi
-- ─────────────────────────────────────────────────────────

-- Transactions: heaviest table — most queries filter by user + date or user + type
create index if not exists idx_tx_user_date on transactions(user_id, date desc);
create index if not exists idx_tx_user_type_date on transactions(user_id, type, date desc);
create index if not exists idx_tx_user_category on transactions(user_id, category_id, date desc) where category_id is not null;
create index if not exists idx_tx_account on transactions(account_id, date desc);
create index if not exists idx_tx_to_account on transactions(to_account_id, date desc) where to_account_id is not null;

-- Accounts
create index if not exists idx_accounts_user_active on accounts(user_id) where archived = false;

-- Investments
create index if not exists idx_investments_user_active on investments(user_id) where archived = false;
create index if not exists idx_investments_user_taxsaving on investments(user_id) where is_tax_saving = true and archived = false;
create index if not exists idx_investments_goal on investments(goal_id) where goal_id is not null and archived = false;

-- Goals
create index if not exists idx_goals_user_status on goals(user_id, status) where status = 'active';

-- Debts
create index if not exists idx_debts_user_status on debts(user_id, status) where status = 'active';

-- Insurance
create index if not exists idx_insurance_user on insurance_policies(user_id);

-- Budgets
create index if not exists idx_budgets_user on budgets(user_id) where amount > 0;

-- Recurring
create index if not exists idx_recurring_user_active on recurring_transactions(user_id) where is_active = true;

-- Notifications (for bell badge)
create index if not exists idx_notif_user_unread_v2 on notifications(user_id, created_at desc) where read_at is null;

-- AI usage log (for quota checks)
create index if not exists idx_ai_usage_quota on ai_usage_log(user_id, feature, status, created_at desc);

-- Net worth snapshots
create index if not exists idx_nw_user_date_v2 on net_worth_snapshots(user_id, date desc);

-- Portfolio snapshots
create index if not exists idx_pf_snap_user_date on portfolio_snapshots(user_id, snapshot_date desc);

-- Categories
create index if not exists idx_categories_user_archived on categories(user_id) where archived = false;

-- Analyze tables to refresh stats
analyze transactions;
analyze accounts;
analyze investments;
analyze goals;
analyze debts;
analyze notifications;
