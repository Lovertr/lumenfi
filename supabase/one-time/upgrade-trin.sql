-- ════════════════════════════════════════════════════════════════
-- ONE-TIME: Upgrade tintanee.t@gmail.com to full access
-- (B2C Pro forever + B2B Founder agent + admin + AI credits)
-- ════════════════════════════════════════════════════════════════
-- Run in Supabase Dashboard → SQL Editor
-- Idempotent — safe to run multiple times

do $$
declare
  trin_id uuid;
  trin_agent_id uuid;
  forever timestamptz := '2099-12-31 23:59:59+00';
begin
  -- Find user id
  select id into trin_id from auth.users where email = 'tintanee.t@gmail.com';
  if trin_id is null then
    raise notice '✗ User tintanee.t@gmail.com not found in auth.users';
    return;
  end if;
  raise notice '✓ Found user: %', trin_id;

  -- ─────── 1) Profile: admin + onboarded ───────
  update profiles
  set is_admin = true,
      onboarded = true,
      plan = 'pro',
      plan_expires_at = forever
  where id = trin_id;
  if not found then
    insert into profiles (id, email, is_admin, onboarded, plan, plan_expires_at)
    values (trin_id, 'tintanee.t@gmail.com', true, true, 'pro', forever);
  end if;
  raise notice '✓ Profile: admin + onboarded + plan=pro';

  -- ─────── 2) B2C: Lifetime Pro subscription ───────
  -- Remove any existing
  delete from user_subscriptions where user_id = trin_id;
  insert into user_subscriptions (
    user_id, plan_code, status, billing_cycle,
    started_at, current_period_start, current_period_end,
    payment_provider, cancel_at_period_end
  ) values (
    trin_id, 'pro', 'active', 'yearly',
    now(), now(), forever,
    'manual', false
  );
  raise notice '✓ B2C Pro subscription (lifetime)';

  -- ─────── 3) AI credits — high balance for testing ───────
  insert into ai_credits (user_id, advisor_report_balance, total_purchased, total_used)
  values (trin_id, 9999, 9999, 0)
  on conflict (user_id) do update
    set advisor_report_balance = 9999,
        total_purchased = 9999,
        updated_at = now();
  raise notice '✓ AI credits: 9999';

  -- ─────── 4) B2B: Agent record — create or activate ───────
  select id into trin_agent_id from agents where user_id = trin_id;

  if trin_agent_id is null then
    -- Create a default agent record if not exists yet
    insert into agents (
      user_id, display_name, company, agent_name, email, phone,
      license_number, license_valid_from, license_valid_until,
      products, invite_code,
      status, is_default, approved_at, approved_by
    ) values (
      trin_id,
      'กรุงเทพประกันชีวิต (BLA)', 'BLA', 'TRIN',
      'tintanee.t@gmail.com', null,
      coalesce(nullif(current_setting('app.bla_license', true), ''), '6801055107'),
      '2025-09-25', '2099-09-24',
      array['life','health','ci','retirement','savings']::text[],
      'AGTLOVR',
      'active', true, now(), trin_id
    )
    returning id into trin_agent_id;
    raise notice '✓ Agent created: %', trin_agent_id;
  else
    -- Update existing agent to active + default
    -- First clear any other default
    update agents set is_default = false where is_default = true and id != trin_agent_id;
    update agents
    set status = 'active',
        is_default = true,
        approved_at = coalesce(approved_at, now()),
        approved_by = coalesce(approved_by, trin_id)
    where id = trin_agent_id;
    raise notice '✓ Existing agent activated + set default: %', trin_agent_id;
  end if;

  -- ─────── 5) Agent subscription: Founder (永久) ───────
  -- Remove any existing
  delete from agent_subscriptions where agent_id = trin_agent_id;
  insert into agent_subscriptions (
    agent_id, plan, status,
    current_period_start, current_period_end,
    cancel_at_period_end,
    monthly_amount, billing_cycle,
    trial_leads_used, trial_leads_cap,
    auto_renew, charge_retry_count
  ) values (
    trin_agent_id, 'founder', 'active',
    now(), forever,
    false,
    0, 'annual',
    0, 9999,
    false, 0
  );
  raise notice '✓ Agent Founder subscription (lifetime, unlimited leads)';

  raise notice '═════════════════════════════════════════════';
  raise notice '✅ Account fully upgraded';
  raise notice '   • User Pro (lifetime)';
  raise notice '   • Admin access';
  raise notice '   • 9999 AI credits';
  raise notice '   • Default agent + Founder plan';
  raise notice '═════════════════════════════════════════════';
end $$;

-- Verify
select
  'profile' as kind,
  is_admin::text as detail,
  plan as plan
from profiles where id = (select id from auth.users where email='tintanee.t@gmail.com')
union all
select
  'user_sub' as kind,
  status as detail,
  plan_code as plan
from user_subscriptions where user_id = (select id from auth.users where email='tintanee.t@gmail.com')
union all
select
  'agent' as kind,
  status || ' · default=' || is_default::text as detail,
  invite_code as plan
from agents where user_id = (select id from auth.users where email='tintanee.t@gmail.com')
union all
select
  'agent_sub' as kind,
  s.status as detail,
  s.plan as plan
from agent_subscriptions s
join agents a on a.id = s.agent_id
where a.user_id = (select id from auth.users where email='tintanee.t@gmail.com');
