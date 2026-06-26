-- ─────────────────────────────────────────────────────────
-- 34. Account balance adjustments + cash advance flag
-- ─────────────────────────────────────────────────────────

-- ── Part A: account_balance_adjustments ──────────────────
-- Mirrors debt_balance_adjustments but for accounts. Lets users
-- reconcile a bank/wallet/credit card balance to a known number
-- (e.g. after they double-check the bank app and find it's ฿70K
-- not ฿60K). Stored as audit log; balance computation treats the
-- most recent adjustment as a "snapshot" — transactions DATED
-- BEFORE the adjustment are absorbed into it; transactions DATED
-- AFTER continue to accumulate normally.

create table if not exists account_balance_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  -- The balance the user is setting it to (positive number, even for liabilities)
  new_balance numeric(14,2) not null,
  -- Computed balance before the adjustment (for audit)
  previous_balance numeric(14,2) not null,
  -- new_balance - previous_balance. Negative = balance went down.
  delta numeric(14,2) not null,
  reason text,
  -- The date the user is asserting this balance applies as of.
  -- Defaults to current date. Used as the cutoff for tx accumulation.
  effective_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_acc_bal_adj_user
  on account_balance_adjustments(user_id, created_at desc);
create index if not exists idx_acc_bal_adj_account
  on account_balance_adjustments(account_id, effective_date desc);

alter table account_balance_adjustments enable row level security;

drop policy if exists "acc_bal_adj_owner_all" on account_balance_adjustments;
create policy "acc_bal_adj_owner_all" on account_balance_adjustments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── Part B: cash advance flag on debts ───────────────────
-- When a user transfers FROM a credit card TO a bank account, that's
-- a cash advance — money pulled from the card's credit line. We
-- auto-create a debt linked to the card (via linked_account_id from
-- migration 22) and mark it as a cash advance for clearer reporting.

alter table debts
  add column if not exists is_cash_advance boolean not null default false;

create index if not exists idx_debts_cash_advance
  on debts(linked_account_id, is_cash_advance) where is_cash_advance = true;
