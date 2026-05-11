-- ================================================================
-- Migration 29: Agent extras — LINE Notify, payment retry, last lead at
-- ================================================================

-- D1: LINE Notify token (encrypted-at-rest by Supabase) + flag
alter table agents add column if not exists line_notify_token text;
alter table agents add column if not exists line_notify_enabled boolean not null default false;

-- D3: Omise card token saved on customer (for auto-charge)
alter table agent_subscriptions
  add column if not exists omise_customer_id text,
  add column if not exists last_charge_failure_at timestamptz,
  add column if not exists charge_retry_count int not null default 0,
  add column if not exists auto_renew boolean not null default true;

-- D4: last_lead_received_at for activity tracking
alter table agents add column if not exists last_lead_received_at timestamptz;

create index if not exists agent_subs_renewal_idx
  on agent_subscriptions(current_period_end, status, auto_renew)
  where status = 'active' and auto_renew = true;

comment on column agents.line_notify_token is
  'Personal access token from notify-bot.line.me — used to push lead alerts to agent personal/group LINE.';
comment on column agent_subscriptions.auto_renew is
  'If true, cron attempts to charge stored card 3 days before period_end.';
