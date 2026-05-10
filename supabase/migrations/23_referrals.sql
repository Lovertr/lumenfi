-- ─────────────────────────────────────────────────────────
-- 23. Referral system — invite friends, both get +1 month Pro
-- ─────────────────────────────────────────────────────────

-- Add referral_code (unique 8-char) + referred_by to profiles
alter table profiles
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references auth.users(id) on delete set null;

create index if not exists idx_profiles_referral_code on profiles(referral_code) where referral_code is not null;

-- Generate referral codes for existing users who don't have one yet.
-- Code format: 6 chars uppercase alphanumeric (no ambiguous: 0/O/I/1/L)
do $$
declare
  v_user record;
  v_code text;
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_attempt int;
begin
  for v_user in select id from profiles where referral_code is null
  loop
    v_attempt := 0;
    loop
      v_attempt := v_attempt + 1;
      if v_attempt > 10 then exit; end if;

      v_code := '';
      for i in 1..6 loop
        v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
      end loop;

      begin
        update profiles set referral_code = v_code where id = v_user.id;
        exit;
      exception when unique_violation then
        -- try again
      end;
    end loop;
  end loop;
end $$;

-- Referrals table: tracks each successful redemption (for audit)
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  code_used text,
  reward_granted boolean not null default false,
  reward_granted_at timestamptz,
  -- The reward unit (e.g. 30 days Pro for both sides)
  reward_days int not null default 30,
  created_at timestamptz not null default now(),
  unique(referrer_id, referred_user_id)
);

create index if not exists idx_referrals_referrer
  on referrals(referrer_id, created_at desc);
create index if not exists idx_referrals_referred
  on referrals(referred_user_id);

alter table referrals enable row level security;

drop policy if exists "ref_select_mine" on referrals;
create policy "ref_select_mine" on referrals
  for select using (auth.uid() = referrer_id or auth.uid() = referred_user_id);

drop policy if exists "ref_insert_for_self" on referrals;
create policy "ref_insert_for_self" on referrals
  for insert with check (auth.uid() = referred_user_id);
