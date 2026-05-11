-- ════════════════════════════════════════════════════════════════
-- ONE-TIME: Setup Supabase pg_cron to call /api/cron/notify hourly
-- ----------------------------------------------------------------
-- Why: Vercel Hobby plan only allows daily crons. To support
-- per-user reminder hours (0-23), we need an hourly trigger.
-- Supabase pg_cron is free and supports any schedule.
--
-- This calls your Vercel endpoint hourly so the notify route
-- checks bkkHour against each user's reminder_hour.
--
-- Prerequisites:
--   1. Enable pg_cron extension (Supabase Dashboard → Database → Extensions)
--   2. Enable pg_net extension (same place)
--
-- Replace BEFORE running:
--   YOUR_APP_URL    — e.g. 'https://lumenfi.vercel.app'
--   YOUR_CRON_SECRET — value of CRON_SECRET env var in Vercel
-- ════════════════════════════════════════════════════════════════

-- 1) Make sure extensions are enabled (idempotent)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Schedule hourly call to /api/cron/notify
-- Drop existing job if present (so re-run replaces it cleanly)
select cron.unschedule('lumenfi-hourly-notify') where exists (
  select 1 from cron.job where jobname = 'lumenfi-hourly-notify'
);

select cron.schedule(
  'lumenfi-hourly-notify',
  '0 * * * *',  -- every hour at minute 0
  $$
  select net.http_get(
    url := 'https://lumenfi.vercel.app/api/cron/notify',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 30000
  );
  $$
);

-- 3) Verify the job is scheduled
select jobid, jobname, schedule, command, active
from cron.job
where jobname = 'lumenfi-hourly-notify';

-- ────────────────────────────────────────────────────────────────
-- 📋 INSTRUCTIONS
-- ────────────────────────────────────────────────────────────────
-- BEFORE RUNNING:
--   1. Replace 'YOUR_CRON_SECRET' (line 38) with your actual value
--      from Vercel env. To find it: Vercel → Settings → Environment
--      Variables → CRON_SECRET → click reveal
--   2. Confirm URL is correct (line 37): should be your prod domain
--
-- AFTER RUNNING:
--   - Wait at the top of an hour (e.g. 21:00 if your reminder_hour=21)
--   - Push should arrive on your device
--   - If not, check cron.job_run_details table:
--       select * from cron.job_run_details
--       where jobid = (select jobid from cron.job where jobname='lumenfi-hourly-notify')
--       order by start_time desc limit 5;
--
-- TO REMOVE:
--   select cron.unschedule('lumenfi-hourly-notify');
-- ────────────────────────────────────────────────────────────────
