-- ─────────────────────────────────────────────────────────
-- 35. Marketing posts — scheduled + auto-publish queue
-- ─────────────────────────────────────────────────────────

create table if not exists marketing_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Platform (currently facebook_page — future: instagram, tiktok, x)
  platform text not null default 'facebook_page'
    check (platform in ('facebook_page', 'facebook_reels', 'instagram', 'tiktok', 'x')),

  -- Content
  message text not null,
  media_type text not null default 'text'
    check (media_type in ('text', 'image', 'carousel', 'video', 'reel')),
  media_urls jsonb default '[]'::jsonb,  -- array of URLs (photos or videos)
  video_title text,

  -- Scheduling
  scheduled_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),

  -- After publish
  published_at timestamptz,
  external_post_id text,   -- FB post id, etc.
  error text,              -- last error if failed
  retry_count int not null default 0,

  -- Metadata
  ai_generated boolean not null default false,
  ai_prompt text,          -- prompt used if AI-generated (for audit + iteration)
  content_pillar text
    check (content_pillar in ('education', 'use_case', 'demo', 'engagement', 'promo', 'launch')),
  hashtags text[],

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketing_posts_due
  on marketing_posts(status, scheduled_at)
  where status = 'scheduled';

create index if not exists idx_marketing_posts_user
  on marketing_posts(user_id, scheduled_at desc);

alter table marketing_posts enable row level security;

drop policy if exists "marketing_posts_owner_all" on marketing_posts;
create policy "marketing_posts_owner_all" on marketing_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Analytics — snapshot of FB reach/engagement (populated by a separate poll)
create table if not exists marketing_post_stats (
  post_id uuid primary key references marketing_posts(id) on delete cascade,
  reach int,
  impressions int,
  likes int,
  comments int,
  shares int,
  link_clicks int,
  fetched_at timestamptz not null default now()
);

alter table marketing_post_stats enable row level security;
drop policy if exists "marketing_stats_via_post" on marketing_post_stats;
create policy "marketing_stats_via_post" on marketing_post_stats
  for select using (
    exists (
      select 1 from marketing_posts p
      where p.id = post_id and p.user_id = auth.uid()
    )
  );

-- Update trigger for updated_at
create or replace function _marketing_posts_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists marketing_posts_touch on marketing_posts;
create trigger marketing_posts_touch
  before update on marketing_posts
  for each row execute function _marketing_posts_touch();
