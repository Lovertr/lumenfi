-- ─────────────────────────────────────────────────────────
-- Migration 13: Recurring DCA scheduler
--   Auto-creates buy transactions monthly for selected investments
-- ─────────────────────────────────────────────────────────

create table if not exists recurring_investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_id uuid not null references investments(id) on delete cascade,
  -- amount-based or quantity-based
  -- amount_per_run: ลงทุนเป็นจำนวนเงิน THB ต่อรอบ → quantity คำนวณจากราคาปัจจุบัน
  -- quantity_per_run: ลงทุนเป็นจำนวนหน่วยแน่นอน
  amount_per_run numeric,
  quantity_per_run numeric,
  -- ขั้นต่ำ 1 ใน 2 ตัว
  check (amount_per_run is not null or quantity_per_run is not null),
  day_of_month smallint not null check (day_of_month between 1 and 31),
  is_active boolean not null default true,
  next_run_on date not null,
  last_run_on date,
  total_runs int not null default 0,
  total_invested numeric not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_rec_inv_user on recurring_investments(user_id, next_run_on);
create index if not exists idx_rec_inv_active on recurring_investments(is_active, next_run_on) where is_active = true;

alter table recurring_investments enable row level security;
drop policy if exists "rec_inv_owner_all" on recurring_investments;
create policy "rec_inv_owner_all" on recurring_investments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
