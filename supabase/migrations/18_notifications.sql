-- ─────────────────────────────────────────────────────────
-- Migration 18: In-app notifications log
-- Mirror of every push sent + lets users see history without push enabled
--
-- NOTE: If a previous (unrelated) `notifications` table exists with a
-- different schema (e.g. with a `read` boolean column), it will be
-- dropped and replaced. Lumenfi never used the old schema.
-- ─────────────────────────────────────────────────────────

-- Drop any pre-existing notifications table from earlier experiments
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'read'
  ) then
    drop table if exists public.notifications cascade;
  end if;
end$$;

-- Drop the legacy view if it exists too
drop view if exists notification_unread_counts cascade;


create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Categorization
  type text not null,              -- 'recurring' / 'budget' / 'watchlist' / 'secretary' / 'reminder' / 'system'
  severity text not null default 'info' check (severity in ('info', 'warn', 'critical', 'success')),
  -- Content
  title text not null,
  body text not null,
  url text,                        -- deep link in app
  icon text,                       -- emoji or lucide name (optional)
  -- Metadata for grouping/dedup
  tag text,                        -- e.g. 'lumenfi-watchlist'
  -- State
  read_at timestamptz,
  -- Whether this also went out as push (for analytics)
  sent_as_push boolean not null default false,
  push_delivery_status text,       -- 'sent' / 'failed' / 'no_subscription'
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user_unread on notifications(user_id, created_at desc) where read_at is null;
create index if not exists idx_notif_user_all on notifications(user_id, created_at desc);
create index if not exists idx_notif_tag on notifications(user_id, tag, created_at desc);

alter table notifications enable row level security;
drop policy if exists "notif_owner_all" on notifications;
create policy "notif_owner_all" on notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Helper view: unread count per user (for bell badge)
create or replace view notification_unread_counts as
select
  user_id,
  count(*) as unread_count
from notifications
where read_at is null
group by user_id;
