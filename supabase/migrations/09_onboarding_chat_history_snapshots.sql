-- ─────────────────────────────────────────────────────────
-- Migration 09: onboarding flag + AI chat threads + net worth snapshots
-- ─────────────────────────────────────────────────────────

-- 1) Onboarding flag on profile
alter table profiles add column if not exists onboarded boolean not null default false;
alter table profiles add column if not exists monthly_income numeric;
alter table profiles add column if not exists monthly_expense_estimate numeric;

-- 2) AI conversation threads
create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ai_conversations_user on ai_conversations(user_id, updated_at desc);

create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_messages_conv on ai_messages(conversation_id, created_at);

alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;

drop policy if exists "ai_conv_owner_all" on ai_conversations;
create policy "ai_conv_owner_all" on ai_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ai_msg_owner_all" on ai_messages;
create policy "ai_msg_owner_all" on ai_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) Net worth daily snapshots
create table if not exists net_worth_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  total_assets numeric not null default 0,
  total_liabilities numeric not null default 0,
  net_worth numeric generated always as (total_assets - total_liabilities) stored,
  created_at timestamptz not null default now(),
  primary key (user_id, snapshot_date)
);
create index if not exists idx_nw_snapshots_user on net_worth_snapshots(user_id, snapshot_date desc);

alter table net_worth_snapshots enable row level security;
drop policy if exists "nw_snapshots_owner_all" on net_worth_snapshots;
create policy "nw_snapshots_owner_all" on net_worth_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4) Subscription tier (placeholder for Omise integration later)
alter table profiles add column if not exists plan text not null default 'free' check (plan in ('free','pro','family'));
alter table profiles add column if not exists plan_expires_at timestamptz;
