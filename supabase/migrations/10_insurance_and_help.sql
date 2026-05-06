-- ─────────────────────────────────────────────────────────
-- Migration 10: Insurance + Help center
-- ─────────────────────────────────────────────────────────

-- Existing policies user owns
create table if not exists insurance_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('life','health','critical_illness','accident','car','home','travel','other')),
  carrier text not null,
  policy_name text,
  policy_number text,
  sum_insured numeric not null default 0,
  annual_premium numeric not null default 0,
  start_date date,
  renewal_date date,
  beneficiary text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_insurance_policies_user on insurance_policies(user_id, renewal_date);

alter table insurance_policies enable row level security;
drop policy if exists "ip_owner_all" on insurance_policies;
create policy "ip_owner_all" on insurance_policies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Lead capture for insurance quote requests
create table if not exists insurance_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('life','health','critical_illness','accident','review','other')),
  name text not null,
  phone text not null,
  email text,
  preferred_carrier text,           -- 'BLA' | 'Allianz' | 'either'
  source_event text,                -- 'gap_analyzer' | 'tax_planner' | 'push_trigger' | 'manual'
  estimated_premium numeric,
  estimated_sum_insured numeric,
  message text,
  status text not null default 'new' check (status in ('new','contacted','quoted','closed_won','closed_lost')),
  agent_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_insurance_leads_status on insurance_leads(status, created_at desc);
create index if not exists idx_insurance_leads_user on insurance_leads(user_id, created_at desc);

alter table insurance_leads enable row level security;
drop policy if exists "il_owner_all" on insurance_leads;
create policy "il_owner_all" on insurance_leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Birthday/age tracking for insurance triggers
alter table profiles add column if not exists date_of_birth date;
alter table profiles add column if not exists num_dependents int default 0;

-- Help articles (admin-managed for now, but user can search)
create table if not exists help_articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text not null,           -- 'getting-started' | 'transactions' | 'goals' | 'debts' | 'ai' | 'insurance'
  body text not null,                -- markdown
  locale text not null default 'th' check (locale in ('th','en')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_help_articles_cat on help_articles(category, locale, sort_order);
create index if not exists idx_help_articles_locale on help_articles(locale, sort_order);

alter table help_articles enable row level security;
drop policy if exists "help_read_all" on help_articles;
create policy "help_read_all" on help_articles
  for select using (true);
