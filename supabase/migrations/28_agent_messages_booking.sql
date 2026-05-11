-- ================================================================
-- Migration 28: Agent in-app messages + booking URL
-- ================================================================

-- 1) booking_url on agents (Cal.com / Calendly link)
alter table agents
  add column if not exists booking_url text;

-- 2) agent_messages — broadcasts from agent to their assigned prospects
create table if not exists agent_messages (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,

  title text not null,
  body text not null,
  cta_label text,                                  -- optional button text
  cta_url text,                                    -- optional URL/route

  -- Lifetime
  active boolean not null default true,            -- agent can pause without deleting
  expires_at timestamptz,                          -- optional auto-hide date

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_messages_agent_id_idx on agent_messages(agent_id);
create index if not exists agent_messages_active_idx on agent_messages(agent_id, active, created_at desc);

-- updated_at trigger
drop trigger if exists agent_messages_updated_at on agent_messages;
create trigger agent_messages_updated_at
  before update on agent_messages
  for each row execute function _agents_set_updated_at();

-- RLS
alter table agent_messages enable row level security;

-- Agents manage their own messages
drop policy if exists agent_messages_owner on agent_messages;
create policy agent_messages_owner on agent_messages
  for all to authenticated
  using (agent_id in (select id from agents where user_id = auth.uid()))
  with check (agent_id in (select id from agents where user_id = auth.uid()));

-- Prospects can read messages from their assigned agent
drop policy if exists agent_messages_prospects_read on agent_messages;
create policy agent_messages_prospects_read on agent_messages
  for select to authenticated
  using (
    active = true
    and (expires_at is null or expires_at > now())
    and agent_id = (
      select assigned_agent_id from profiles where id = auth.uid()
    )
  );

comment on table agent_messages is
  'Agent broadcasts a card to their assigned prospects (1 agent → many prospects).';
