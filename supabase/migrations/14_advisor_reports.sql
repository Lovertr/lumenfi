-- ─────────────────────────────────────────────────────────
-- Migration 14: Advisor reports — store comprehensive AI analyses
-- ─────────────────────────────────────────────────────────

create table if not exists advisor_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null check (domain in (
    'comprehensive', 'debt', 'investment', 'tax',
    'retirement', 'goals', 'insurance', 'emergency'
  )),
  title text not null,
  summary text,
  content text not null,  -- markdown body
  -- Structured snapshot of user state at the time of analysis (for diffing later)
  snapshot jsonb,
  -- AI provider/model used
  provider text,
  model text,
  -- Token usage (if returned)
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now()
);

create index if not exists idx_advisor_user on advisor_reports(user_id, created_at desc);
create index if not exists idx_advisor_domain on advisor_reports(user_id, domain, created_at desc);

alter table advisor_reports enable row level security;
drop policy if exists "advisor_owner_all" on advisor_reports;
create policy "advisor_owner_all" on advisor_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Track when secretary last sent a notification (rate-limit to 1/day)
alter table profiles add column if not exists secretary_last_notified_on date;
