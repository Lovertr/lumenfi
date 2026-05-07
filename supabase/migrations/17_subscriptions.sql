-- ─────────────────────────────────────────────────────────
-- Migration 17: Subscriptions + Pay-as-you-go credits + AI usage tracking
-- ─────────────────────────────────────────────────────────

-- Plans (preset definitions)
create table if not exists subscription_plans (
  code text primary key,           -- 'free', 'payg', 'pro'
  name_th text not null,
  name_en text,
  description_th text,
  price_thb_monthly numeric not null default 0,
  price_thb_yearly numeric,
  -- Quotas (null = unlimited)
  ai_chat_per_day int,
  advisor_reports_per_month int,
  has_secretary boolean not null default false,
  has_lumenfi_ai boolean not null default false,  -- true = use Lumenfi key, false = BYO
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- Seed default plans
insert into subscription_plans (code, name_th, name_en, description_th, price_thb_monthly, price_thb_yearly, ai_chat_per_day, advisor_reports_per_month, has_secretary, has_lumenfi_ai, sort_order) values
  ('free', 'ฟรี (BYO Key)', 'Free (BYO Key)',
   'ฟีเจอร์ครบทุกอย่าง — แค่ใช้ AI key ของตัวเอง',
   0, null, null, null, true, false, 0),
  ('payg', 'จ่ายตามใช้', 'Pay-as-you-go',
   'ซื้อ credit pack สำหรับ AI Advisor — ไม่มีค่าใช้จ่ายต่อเนื่อง',
   0, null, null, null, true, false, 1),
  ('pro', 'Pro (Lumenfi AI)', 'Pro',
   'AI ของ Lumenfi — ใช้ได้ไม่จำกัด ไม่ต้องสมัคร API key',
   129, 1290, null, null, true, true, 2)
on conflict (code) do update set
  name_th = excluded.name_th,
  description_th = excluded.description_th,
  price_thb_monthly = excluded.price_thb_monthly,
  price_thb_yearly = excluded.price_thb_yearly,
  has_lumenfi_ai = excluded.has_lumenfi_ai;

alter table subscription_plans enable row level security;
drop policy if exists "plans_read_all" on subscription_plans;
create policy "plans_read_all" on subscription_plans
  for select using (auth.role() = 'authenticated');

-- User's active subscription
create table if not exists user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_code text not null references subscription_plans(code),
  status text not null check (status in ('trial', 'active', 'past_due', 'cancelled', 'expired')),
  billing_cycle text check (billing_cycle in ('monthly', 'yearly')),
  started_at timestamptz not null default now(),
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  payment_provider text,           -- 'omise' / 'stripe'
  provider_subscription_id text,   -- external ref e.g. omise_chrg_xxx
  provider_customer_id text,       -- omise_cust_xxx
  updated_at timestamptz not null default now()
);
create index if not exists idx_user_subs_status on user_subscriptions(status, current_period_end);

alter table user_subscriptions enable row level security;
drop policy if exists "user_subs_owner_all" on user_subscriptions;
create policy "user_subs_owner_all" on user_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- AI credits (pay-per-use balance)
create table if not exists ai_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- credit balance for advisor reports specifically
  advisor_report_balance int not null default 0,
  total_purchased int not null default 0,
  total_used int not null default 0,
  updated_at timestamptz not null default now()
);

alter table ai_credits enable row level security;
drop policy if exists "ai_credits_owner_all" on ai_credits;
create policy "ai_credits_owner_all" on ai_credits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Usage log (every AI call)
create table if not exists ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,           -- 'chat' / 'advisor' / 'secretary' / 'vision'
  domain text,                     -- for advisor: 'comprehensive' etc
  provider text not null,          -- 'anthropic' / 'openai' / etc
  model text,
  input_tokens int,
  output_tokens int,
  -- Estimated cost in USD (for analytics — not for billing)
  cost_usd numeric,
  -- Billing context: how was this paid
  via text not null check (via in ('byo', 'subscription', 'credits', 'free')),
  -- Did it succeed?
  status text not null default 'success' check (status in ('success', 'error', 'rate_limited')),
  error_code text,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_usage_user on ai_usage_log(user_id, created_at desc);
create index if not exists idx_ai_usage_via on ai_usage_log(via, created_at desc);

alter table ai_usage_log enable row level security;
drop policy if exists "ai_usage_owner_read" on ai_usage_log;
create policy "ai_usage_owner_read" on ai_usage_log
  for select using (auth.uid() = user_id);
-- Inserts only via service role (server actions) — no insert policy here

-- Payment transactions
create table if not exists payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('subscription_initial', 'subscription_renewal', 'credit_pack', 'refund')),
  amount_thb numeric not null,
  -- Subscription context
  plan_code text references subscription_plans(code),
  billing_cycle text check (billing_cycle in ('monthly', 'yearly')),
  -- Credit pack context
  credits_pack_size int,           -- 10 / 50 / 100 reports
  credits_added int,
  -- Provider
  payment_provider text not null,
  provider_charge_id text,         -- omise_chrg_xxx
  provider_customer_id text,
  -- Status
  status text not null check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  failure_reason text,
  -- Receipt
  receipt_url text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_payments_user on payment_transactions(user_id, created_at desc);
create index if not exists idx_payments_provider_charge on payment_transactions(provider_charge_id);

alter table payment_transactions enable row level security;
drop policy if exists "payments_owner_read" on payment_transactions;
create policy "payments_owner_read" on payment_transactions
  for select using (auth.uid() = user_id);

-- Helper view: monthly advisor report count per user
-- Used to enforce per-month limits
create or replace view advisor_reports_this_month as
select
  user_id,
  date_trunc('month', created_at) as month,
  count(*) as report_count
from ai_usage_log
where feature = 'advisor' and status = 'success'
group by user_id, date_trunc('month', created_at);

-- Helper view: chat messages today per user
create or replace view chat_messages_today as
select
  user_id,
  date_trunc('day', created_at) as day,
  count(*) as message_count
from ai_usage_log
where feature = 'chat' and status = 'success'
group by user_id, date_trunc('day', created_at);
