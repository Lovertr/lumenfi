import { NextResponse } from 'next/server';
import { createClient as createSbClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Daily expiry sweep — 03:30 UTC (10:30 BKK).
 *
 * 1. Mark `subscription_orders` in pending_upload/pending_review > 24h old as 'expired'
 * 2. Downgrade `user_subscriptions` whose current_period_end < now to 'expired'
 * 3. Same for `agent_subscriptions`
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const nowIso = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  // 1. Expire stale pending orders
  const { data: expiredOrders, error: expOrdErr } = await supabase
    .from('subscription_orders')
    .update({ status: 'expired' })
    .in('status', ['pending_upload', 'pending_review'])
    .lt('created_at', oneDayAgo)
    .select('id');
  if (expOrdErr) console.warn('[expire] orders update failed:', expOrdErr);

  // 2. Expire user subscriptions whose period ended
  const { data: expiredUserSubs, error: userSubErr } = await supabase
    .from('user_subscriptions')
    .update({ status: 'expired', updated_at: nowIso })
    .eq('status', 'active')
    .lt('current_period_end', nowIso)
    .select('user_id');
  if (userSubErr) console.warn('[expire] user_subs update failed:', userSubErr);

  // 3. Expire agent subscriptions whose period ended
  const { data: expiredAgentSubs, error: agentSubErr } = await supabase
    .from('agent_subscriptions')
    .update({ status: 'expired', updated_at: nowIso })
    .in('status', ['active', 'past_due'])
    .lt('current_period_end', nowIso)
    .select('agent_id');
  if (agentSubErr) console.warn('[expire] agent_subs update failed:', agentSubErr);

  return NextResponse.json({
    ok: true,
    expired_orders: expiredOrders?.length ?? 0,
    expired_user_subscriptions: expiredUserSubs?.length ?? 0,
    expired_agent_subscriptions: expiredAgentSubs?.length ?? 0,
  });
}
