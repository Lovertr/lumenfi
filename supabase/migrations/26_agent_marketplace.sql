-- ================================================================
-- Migration 26: Agent Marketplace
-- ----------------------------------------------------------------
-- Adds infrastructure for insurance agents to:
--   1. Sign up + manage their public profile (license, contact, etc.)
--   2. Get invite links so prospects sign up under them
--   3. Receive routed lead emails when prospects request quotes
--   4. Subscribe to a paid plan (Starter/Pro/Team) — gated by status
--
-- New users with NO invite/code auto-fall-back to the default agent
-- (set by setting is_default = true on one row).
-- ================================================================

-- 1) agents table -------------------------------------------------
create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,

  -- Display
  display_name text not null,                              -- "บริษัทกรุงเทพประกันชีวิต (BLA)"
  company text,                                            -- short label: BLA, FWD, AIA
  agent_name text not null,                                -- ชื่อตัวแทน
  email text not null,
  phone text,
  line_id text,

  -- License
  license_number text not null,
  license_valid_from date,
  license_valid_until date not null,

  -- Marketing
  products text[] not null default array[]::text[],        -- ['life','health','ci','retirement','accident']
  bio text,
  photo_url text,

  -- Routing
  invite_code text not null unique,                        -- short like 'AGT1234'
  is_default boolean not null default false,

  -- Status (admin approves before agent can receive leads)
  status text not null default 'pending'
    check (status in ('pending','active','suspended','expired')),

  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid
);

create unique index if not exists agents_only_one_default
  on agents (is_default) where is_default = true;
create index if not exists agents_user_id_idx on agents(user_id);
create index if not exists agents_invite_code_idx on agents(invite_code);
create index if not exists agents_status_idx on agents(status);

-- 2) agent_subscriptions ------------------------------------------
create table if not exists agent_subscriptions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,

  plan text not null check (plan in ('trial','starter','pro','team','founder')),
  status text not null default 'active'
    check (status in ('active','past_due','canceled','expired')),

  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,

  -- Trial cap
  trial_leads_used int not null default 0,
  trial_leads_cap int not null default 3,

  -- Pricing
  monthly_amount numeric,
  billing_cycle text check (billing_cycle in ('monthly','annual')),

  -- External
  omise_subscription_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_subscriptions_agent_id_idx on agent_subscriptions(agent_id);
create index if not exists agent_subscriptions_status_idx on agent_subscriptions(status);

-- 3) assigned_agent_id on profiles --------------------------------
alter table profiles
  add column if not exists assigned_agent_id uuid references agents(id) on delete set null;
create index if not exists profiles_assigned_agent_id_idx
  on profiles(assigned_agent_id);

-- 4) agent_id on insurance_leads (for routing audit) --------------
alter table insurance_leads
  add column if not exists agent_id uuid references agents(id) on delete set null;
create index if not exists insurance_leads_agent_id_idx
  on insurance_leads(agent_id);

-- 5) updated_at trigger -------------------------------------------
create or replace function _agents_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists agents_updated_at on agents;
create trigger agents_updated_at
  before update on agents
  for each row execute function _agents_set_updated_at();

drop trigger if exists agent_subscriptions_updated_at on agent_subscriptions;
create trigger agent_subscriptions_updated_at
  before update on agent_subscriptions
  for each row execute function _agents_set_updated_at();

-- 6) RLS policies --------------------------------------------------
alter table agents enable row level security;

drop policy if exists agents_select_active_or_own on agents;
create policy agents_select_active_or_own on agents
  for select to authenticated
  using (status = 'active' or user_id = auth.uid());

drop policy if exists agents_insert_own on agents;
create policy agents_insert_own on agents
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists agents_update_own on agents;
create policy agents_update_own on agents
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table agent_subscriptions enable row level security;

drop policy if exists agent_subs_select_own on agent_subscriptions;
create policy agent_subs_select_own on agent_subscriptions
  for select to authenticated
  using (
    agent_id in (select id from agents where user_id = auth.uid())
  );

drop policy if exists agent_subs_insert_own on agent_subscriptions;
create policy agent_subs_insert_own on agent_subscriptions
  for insert to authenticated
  with check (
    agent_id in (select id from agents where user_id = auth.uid())
  );

drop policy if exists agent_subs_update_own on agent_subscriptions;
create policy agent_subs_update_own on agent_subscriptions
  for update to authenticated
  using (
    agent_id in (select id from agents where user_id = auth.uid())
  );

-- 7) Helpful comments ---------------------------------------------
comment on table agents is
  'Insurance agents who buy a "slot" on Lumenfi. One agent is is_default=true → default fallback for users with no invite.';
comment on column agents.status is
  'pending=just signed up · active=approved, can receive leads · suspended=admin paused · expired=license expired';
comment on column profiles.assigned_agent_id is
  'Which agent is this user routed to for insurance quotes. Null = falls back to default agent OR env vars (legacy).';
