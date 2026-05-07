-- ─────────────────────────────────────────────────────────
-- Migration 12: Investment overhaul
--   transactions log + dividends + watchlist + snapshots + tax-saving flag
-- ─────────────────────────────────────────────────────────

-- 1) Investment transactions log
create table if not exists investment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_id uuid not null references investments(id) on delete cascade,
  type text not null check (type in ('buy', 'sell', 'transfer_in', 'transfer_out')),
  quantity numeric not null,
  price_per_unit numeric not null default 0,
  fee numeric not null default 0,
  total_value numeric generated always as ((quantity * price_per_unit) + fee) stored,
  date date not null,
  note text,
  realized_pl numeric,  -- only set on sells (price - avg_cost) * qty - fee
  created_at timestamptz not null default now()
);
create index if not exists idx_inv_tx_user on investment_transactions(user_id, date desc);
create index if not exists idx_inv_tx_inv on investment_transactions(investment_id, date desc);

alter table investment_transactions enable row level security;
drop policy if exists "inv_tx_owner_all" on investment_transactions;
create policy "inv_tx_owner_all" on investment_transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) Dividend receipts
create table if not exists investment_dividends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_id uuid not null references investments(id) on delete cascade,
  amount numeric not null,
  withholding_tax numeric not null default 0,
  net_amount numeric generated always as (amount - withholding_tax) stored,
  ex_date date,
  pay_date date not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_div_user on investment_dividends(user_id, pay_date desc);
create index if not exists idx_div_inv on investment_dividends(investment_id, pay_date desc);

alter table investment_dividends enable row level security;
drop policy if exists "div_owner_all" on investment_dividends;
create policy "div_owner_all" on investment_dividends
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) Watchlist
create table if not exists investment_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  type text not null,
  name text,
  target_price numeric,
  alert_above boolean default true,  -- true = alert when price rises above target
  current_price numeric,
  last_checked timestamptz,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_watch_user on investment_watchlist(user_id);

alter table investment_watchlist enable row level security;
drop policy if exists "watch_owner_all" on investment_watchlist;
create policy "watch_owner_all" on investment_watchlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4) Daily portfolio value snapshots (for performance vs benchmark + risk metrics)
create table if not exists portfolio_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  total_value numeric not null default 0,
  total_cost numeric not null default 0,
  unrealized_pl numeric generated always as (total_value - total_cost) stored,
  holdings_count int not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, snapshot_date)
);
create index if not exists idx_pf_snap_user on portfolio_snapshots(user_id, snapshot_date desc);

alter table portfolio_snapshots enable row level security;
drop policy if exists "pf_snap_owner_all" on portfolio_snapshots;
create policy "pf_snap_owner_all" on portfolio_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5) Tax-saving + goal-link columns on investments
alter table investments add column if not exists is_tax_saving boolean default false;
alter table investments add column if not exists tax_fund_type text check (tax_fund_type in ('rmf', 'ssf', 'ssfx', 'pvd', 'gpf', null));
alter table investments add column if not exists lock_in_until date;
alter table investments add column if not exists goal_id uuid references goals(id) on delete set null;
alter table investments add column if not exists annual_dividend_yield numeric;  -- expected yield % for projections
alter table investments add column if not exists notes text;

-- 6) Watchlist alerts (for cron job)
alter table profiles add column if not exists watchlist_alert_last_sent_on date;
