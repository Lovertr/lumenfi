-- ─────────────────────────────────────────────────────────
-- 21. Debt payment linking + manual balance adjustments
-- ─────────────────────────────────────────────────────────

-- Add debt linkage to transactions so a "ชำระหนี้" expense can decrement
-- the debt's current_balance with a clear audit trail.
alter table transactions
  add column if not exists debt_id uuid references debts(id) on delete set null,
  add column if not exists debt_principal_amount numeric(14,2),
  add column if not exists debt_interest_amount numeric(14,2);

create index if not exists idx_tx_debt_id on transactions(debt_id) where debt_id is not null;

-- Manual balance adjustments (when actual balance differs from app-tracked).
-- Useful when interest accrues differently or a side payment was missed.
create table if not exists debt_balance_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references debts(id) on delete cascade,
  -- The new balance the user is setting it to
  new_balance numeric(14,2) not null,
  -- The previous balance recorded (for audit)
  previous_balance numeric(14,2) not null,
  -- Difference (new - previous). Negative = decreased.
  delta numeric(14,2) not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_dba_user_debt
  on debt_balance_adjustments(user_id, debt_id, created_at desc);

alter table debt_balance_adjustments enable row level security;

drop policy if exists "dba_select_own" on debt_balance_adjustments;
create policy "dba_select_own" on debt_balance_adjustments
  for select using (auth.uid() = user_id);
drop policy if exists "dba_insert_own" on debt_balance_adjustments;
create policy "dba_insert_own" on debt_balance_adjustments
  for insert with check (auth.uid() = user_id);
drop policy if exists "dba_delete_own" on debt_balance_adjustments;
create policy "dba_delete_own" on debt_balance_adjustments
  for delete using (auth.uid() = user_id);

-- Add "ชำระหนี้" / "Debt Payment" category for every existing user who
-- doesn't have it. New users get it via the auto-seed helper in
-- src/lib/categories.ts.
do $$
declare
  v_user record;
begin
  for v_user in select distinct user_id from categories where user_id is not null
  loop
    if not exists (
      select 1 from categories
      where user_id = v_user.user_id
        and (name = 'ชำระหนี้' or name = 'Debt Payment')
    ) then
      insert into categories (user_id, name, type, icon, color, archived)
      values (v_user.user_id, 'ชำระหนี้', 'expense', '💳', '#dc2626', false);
    end if;
  end loop;
end $$;
