'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const REWARD_DAYS = 30;

function genCode(len = 6) {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

/**
 * Returns the user's referral code, generating one if missing.
 */
export async function ensureMyReferralCode(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.referral_code) return profile.referral_code;

  // Generate, retrying on unique-conflict
  for (let i = 0; i < 8; i++) {
    const code = genCode(6);
    const { error } = await supabase
      .from('profiles')
      .update({ referral_code: code })
      .eq('id', user.id);
    if (!error) return code;
  }
  return null;
}

/**
 * Claim a referral code (post-signup): grants +REWARD_DAYS Pro trial to both
 * the referrer and the new user.
 */
export async function claimReferralCode(
  _prev: unknown,
  formData: FormData
): Promise<{ ok?: boolean; error?: string; reward?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const codeRaw = (formData.get('code') as string) ?? '';
  const code = codeRaw.trim().toUpperCase();
  if (!code || code.length < 4 || code.length > 12) return { error: 'invalid_code' };

  // ───────────────────────────────────────────────────────────────────
  // Smart code detection:
  //   1) Try matching an active agent invite_code first
  //      → bind profile.assigned_agent_id (no Pro reward)
  //   2) Otherwise try matching a user referral_code (6 chars)
  //      → grant Pro 30d to both parties (existing flow)
  // ───────────────────────────────────────────────────────────────────
  const { data: agentRow } = await supabase
    .from('agents')
    .select('id, status, agent_name')
    .eq('invite_code', code)
    .eq('status', 'active')
    .maybeSingle();
  if (agentRow) {
    // Agent code path — bind, no Pro reward
    const agentId = (agentRow as any).id as string;
    const { data: prof } = await supabase
      .from('profiles')
      .select('assigned_agent_id')
      .eq('id', user.id)
      .maybeSingle();
    if ((prof as any)?.assigned_agent_id) {
      return { error: 'already_bound_to_agent' };
    }
    const { error: updErr } = await supabase
      .from('profiles')
      .update({ assigned_agent_id: agentId })
      .eq('id', user.id);
    if (updErr) return { error: 'bind_failed' };
    revalidatePath('/settings/referral');
    revalidatePath('/settings');
    return {
      ok: true,
      reward: `ผูกกับตัวแทน ${(agentRow as any).agent_name ?? ''} เรียบร้อย — เริ่มขอที่ปรึกษาประกันได้`,
    };
  }

  // User-referral path
  if (code.length !== 6) return { error: 'code_not_found' };

  const { data: referrer } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', code)
    .maybeSingle();
  if (!referrer) return { error: 'code_not_found' };
  if (referrer.id === user.id) return { error: 'self_referral' };

  // Block if I already used a code
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('referred_by')
    .eq('id', user.id)
    .maybeSingle();
  if (myProfile?.referred_by) return { error: 'already_used' };

  // Block duplicate redemption
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referrer_id', referrer.id)
    .eq('referred_user_id', user.id)
    .maybeSingle();
  if (existing) return { error: 'already_used' };

  // Set referred_by on me
  await supabase
    .from('profiles')
    .update({ referred_by: referrer.id })
    .eq('id', user.id);

  // Insert referral row
  await supabase.from('referrals').insert({
    referrer_id: referrer.id,
    referred_user_id: user.id,
    code_used: code,
    reward_days: REWARD_DAYS,
    reward_granted: true,
    reward_granted_at: new Date().toISOString(),
  });

  // Grant reward: extend trial for BOTH users by REWARD_DAYS
  // For each user — if they have a subscription, extend trial_ends_at;
  // if not, create a trial subscription expiring REWARD_DAYS from now.
  for (const uid of [referrer.id, user.id]) {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('id, status, trial_ends_at, current_period_end')
      .eq('user_id', uid)
      .maybeSingle();

    const { data: planRow } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('key', 'pro')
      .maybeSingle();
    if (!planRow) continue;

    if (sub) {
      // Extend trial by REWARD_DAYS (or current period end if active paid)
      const baseDate = sub.trial_ends_at
        ? new Date(sub.trial_ends_at)
        : sub.current_period_end
        ? new Date(sub.current_period_end)
        : new Date();
      const futureRef = baseDate > new Date() ? baseDate : new Date();
      const newEnd = new Date(futureRef.getTime() + REWARD_DAYS * 86400000);
      await supabase
        .from('user_subscriptions')
        .update({
          status: sub.status === 'active' ? 'active' : 'trial',
          trial_ends_at: newEnd.toISOString(),
        })
        .eq('id', sub.id);
    } else {
      const trialEnd = new Date(Date.now() + REWARD_DAYS * 86400000);
      await supabase.from('user_subscriptions').insert({
        user_id: uid,
        plan_id: planRow.id,
        status: 'trial',
        cycle: 'monthly',
        trial_ends_at: trialEnd.toISOString(),
        current_period_end: trialEnd.toISOString(),
      });
    }
  }

  revalidatePath('/settings/referral');
  revalidatePath('/settings/billing');
  return {
    ok: true,
    reward: `ทั้งคุณและเพื่อนได้ Pro เพิ่ม ${REWARD_DAYS} วัน 🎉`,
  };
}
