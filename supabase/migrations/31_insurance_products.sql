-- ════════════════════════════════════════════════════════════════════
-- Migration 31 — Insurance product catalog (AI auto-sync)
-- ────────────────────────────────────────────────────────────────────
-- Storage for the product knowledge base that Sales Coach AI uses.
-- The data is populated and refreshed by an AI scraper (not human admin)
-- so it stays current with the actual product lineups of each company.
-- ════════════════════════════════════════════════════════════════════

-- 1) Companies
create table if not exists insurance_companies (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 -- e.g. 'BLA', 'AIA'
  name text not null,                        -- 'กรุงเทพประกันชีวิต'
  website_url text,
  research_url text,                         -- product listing page used by sync
  last_synced_at timestamptz,
  last_sync_status text,                     -- success / error / running
  last_sync_error text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists insurance_companies_code_idx on insurance_companies(code);
create index if not exists insurance_companies_active_idx on insurance_companies(active);

-- 2) Products
create table if not exists insurance_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references insurance_companies(id) on delete cascade,
  name text not null,
  alt_name text,
  category text not null check (category in (
    'life','whole_life','health','ci','retirement','savings','accident','investment_linked'
  )),
  tagline text,
  benefits jsonb not null default '[]'::jsonb,
  ideal text,
  sales_angle text,
  source_url text,                           -- where AI extracted it from
  ai_confidence numeric,                     -- 0.0 - 1.0 (set by extractor)
  active boolean not null default true,
  -- Sync metadata
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create index if not exists insurance_products_company_active_idx
  on insurance_products(company_id, active);
create index if not exists insurance_products_category_idx
  on insurance_products(category);

-- 3) Audit log of sync runs
create table if not exists product_sync_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references insurance_companies(id) on delete cascade,
  triggered_by text not null default 'cron',  -- cron / admin / manual
  triggered_by_user uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'      -- running / success / error
    check (status in ('running','success','error')),
  products_added int not null default 0,
  products_updated int not null default 0,
  products_marked_inactive int not null default 0,
  error_message text,
  raw_excerpt text,                            -- first 2KB of what AI saw, for debug
  ai_response_excerpt text                     -- first 2KB of AI output
);
create index if not exists product_sync_runs_company_idx
  on product_sync_runs(company_id, started_at desc);

-- 4) updated_at auto-trigger
create or replace function set_updated_at_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tg_insurance_companies_updated on insurance_companies;
create trigger tg_insurance_companies_updated before update on insurance_companies
  for each row execute function set_updated_at_timestamp();

drop trigger if exists tg_insurance_products_updated on insurance_products;
create trigger tg_insurance_products_updated before update on insurance_products
  for each row execute function set_updated_at_timestamp();

-- 5) RLS — read open to authenticated agents, write only admins (handled via service role)
alter table insurance_companies enable row level security;
alter table insurance_products enable row level security;
alter table product_sync_runs enable row level security;

drop policy if exists "read companies" on insurance_companies;
create policy "read companies" on insurance_companies
  for select using (auth.uid() is not null);

drop policy if exists "read products" on insurance_products;
create policy "read products" on insurance_products
  for select using (auth.uid() is not null);

drop policy if exists "admin read sync runs" on product_sync_runs;
create policy "admin read sync runs" on product_sync_runs
  for select using (
    auth.uid() in (select id from profiles where is_admin = true)
  );

-- (writes are done via service-role client — no policies needed)

-- 6) Seed companies with the well-known Thai insurers + their product pages
insert into insurance_companies (code, name, website_url, research_url) values
  ('BLA',     'กรุงเทพประกันชีวิต',          'https://www.bangkoklife.com',     'https://www.bangkoklife.com/th/products'),
  ('AIA',     'AIA Thailand',                'https://www.aia.co.th',           'https://www.aia.co.th/th/our-products'),
  ('ALLIANZ', 'อลิอันซ์ อยุธยา ประกันชีวิต', 'https://www.azay.co.th',          'https://www.azay.co.th/th'),
  ('FWD',     'FWD ประกันชีวิต',             'https://www.fwd.co.th',           'https://www.fwd.co.th/th/insurance'),
  ('KTAXA',   'กรุงไทย-แอกซ่า ประกันชีวิต',  'https://www.krungthai-axa.co.th', 'https://www.krungthai-axa.co.th/th/products'),
  ('MTL',     'เมืองไทยประกันชีวิต',          'https://www.muangthai.co.th',     'https://www.muangthai.co.th/th/our-products'),
  ('TLI',     'ไทยประกันชีวิต',              'https://www.thailife.com',        'https://www.thailife.com/products')
on conflict (code) do nothing;
