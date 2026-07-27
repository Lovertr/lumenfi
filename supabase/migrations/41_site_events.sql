-- ─────────────────────────────────────────────────────────
-- 41. Website Analytics — track user events & funnel drop-off
-- ─────────────────────────────────────────────────────────

create table if not exists site_events (
  id bigserial primary key,
  event_name text not null,        -- 'page_view', 'login', 'signup', 'pricing_view', 'checkout_start', 'checkout_paid', 'referral_share', etc.
  user_id uuid references auth.users(id) on delete set null,  -- null = anonymous
  session_id text,                 -- anonymous session tracking (localStorage)
  path text,                       -- URL path visited
  referrer text,                   -- HTTP referer
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  properties jsonb default '{}'::jsonb,  -- any extra event data
  user_agent text,
  ip_country text,                 -- 2-letter ISO
  created_at timestamptz not null default now()
);

-- Fast filter by event/time
create index if not exists idx_site_events_name_time
  on site_events(event_name, created_at desc);

create index if not exists idx_site_events_user
  on site_events(user_id, created_at desc)
  where user_id is not null;

create index if not exists idx_site_events_session
  on site_events(session_id, created_at desc)
  where session_id is not null;

create index if not exists idx_site_events_utm
  on site_events(utm_source, utm_campaign, created_at desc)
  where utm_source is not null;

-- Everyone can INSERT events (client-side tracking is public)
-- Only admin reads (via service role, RLS bypass)
alter table site_events enable row level security;

drop policy if exists "site_events_insert_all" on site_events;
create policy "site_events_insert_all" on site_events
  for insert with check (true);

-- ─────────────────────────────────────────────────────────
-- FB Page-level stats (followers count, page fans over time)
-- ─────────────────────────────────────────────────────────

create table if not exists fb_page_stats (
  id bigserial primary key,
  page_id text not null,
  page_fans int,                   -- total followers
  page_impressions int,            -- period impressions
  page_engaged_users int,          -- period engaged users
  page_new_fans int,               -- new fans in period
  fetched_at timestamptz not null default now()
);

create index if not exists idx_fb_page_stats_time
  on fb_page_stats(page_id, fetched_at desc);
