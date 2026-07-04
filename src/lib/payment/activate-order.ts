import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Activate a subscription_order — writes to the correct downstream table
 * based on plan_code prefix:
 *   pro_*        -> user_subscriptions (Lumenfi Pro)
 *   credits_*    -> ai_credits.advisor_report_balance
 *   agent_*      -> agent_subscriptions
 *
 * Returns metadata used by the calling API to include in webhook body/email.
 */

export interface OrderRow {
  id: string;
  user_id: string;
  order_ref: string;
  plan_code: string;
  billing_cycle: string; // monthly | yearly
  amount_thb: number | string;
  duration_days: number;
}

export interface ActivateResult {
  kind: 'subscription' | 'credits' | 'agent';
  expiresAt: string | null;
  detail: string;
}

export async function activateApprovedOrder(
  admin: SupabaseClient,
  order: OrderRow,
  nowIso: string
): Promise<ActivateResult> {
  const duration = Number(order.duration_days) * 24 * 3600 * 1000;

  if (order.plan_code.startsWith('credits_')) {
    const packSize = parseInt(order.plan_code.replace('credits_', ''), 10) || 0;
    const { data: existing } = await admin
      .from('ai_credits')
      .select('user_id, advisor_report_balance, total_purchased')
      .eq('user_id', order.user_id)
      .maybeSingle();
    if (existing) {
      await admin.from('ai_credits').update({
        advisor_report_balance: Number(existing.advisor_report_balance) + packSize,
        total_purchased: Number(existing.total_purchased) + packSize,
        updated_at: nowIso,
      }).eq('user_id', order.user_id);
    } else {
      await admin.from('ai_credits').insert({
        user_id: order.user_id,
        advisor_report_balance: packSize,
        total_purchased: packSize,
        total_used: 0,
      });
    }
    return {
      kind: 'credits',
      expiresAt: null,
      detail: `Added ${packSize} advisor reports`,
    };
  }

  if (order.plan_code.startsWith('agent_')) {
    // Extract agent plan tier: 'agent_starter' -> 'starter'
    const tier = order.plan_code.replace('agent_', '');
    const expiresAt = new Date(Date.now() + duration).toISOString();
    // agent_subscriptions uses 'annual' where user_subscriptions uses 'yearly'
    const agentCycle = order.billing_cycle === 'yearly' ? 'annual' : 'monthly';

    // Lookup or create agent row for this user
    const { data: agent } = await admin
      .from('agents')
      .select('id')
      .eq('user_id', order.user_id)
      .maybeSingle();
    if (!agent) {
      return {
        kind: 'agent',
        expiresAt,
        detail: 'No agent row exists for this user — activation deferred',
      };
    }

    // Upsert active subscription; extend period if already exists
    const { data: existing } = await admin
      .from('agent_subscriptions')
      .select('id, current_period_end, status')
      .eq('agent_id', agent.id)
      .in('status', ['active', 'past_due'])
      .maybeSingle();

    const startBase = existing?.current_period_end
      && new Date(existing.current_period_end).getTime() > Date.now()
      ? new Date(existing.current_period_end).getTime()
      : Date.now();
    const newEnd = new Date(startBase + duration).toISOString();

    if (existing) {
      await admin.from('agent_subscriptions').update({
        plan: tier,
        billing_cycle: agentCycle,
        status: 'active',
        current_period_end: newEnd,
        cancel_at_period_end: false,
        monthly_amount: Number(order.amount_thb) / (order.billing_cycle === 'yearly' ? 12 : 1),
        updated_at: nowIso,
      }).eq('id', existing.id);
    } else {
      await admin.from('agent_subscriptions').insert({
        agent_id: agent.id,
        plan: tier,
        status: 'active',
        billing_cycle: agentCycle,
        current_period_start: nowIso,
        current_period_end: newEnd,
        monthly_amount: Number(order.amount_thb) / (order.billing_cycle === 'yearly' ? 12 : 1),
      });
    }

    return {
      kind: 'agent',
      expiresAt: newEnd,
      detail: `Agent ${tier} ${agentCycle} activated`,
    };
  }

  // Default: user Pro subscription
  const expiresAt = new Date(Date.now() + duration).toISOString();
  await admin.from('user_subscriptions').upsert({
    user_id: order.user_id,
    plan_code: order.plan_code,
    status: 'active',
    billing_cycle: order.billing_cycle,
    started_at: nowIso,
    current_period_start: nowIso,
    current_period_end: expiresAt,
    payment_provider: 'promptpay_manual',
    provider_subscription_id: order.order_ref,
  }, { onConflict: 'user_id' });

  return {
    kind: 'subscription',
    expiresAt,
    detail: `Pro ${order.billing_cycle} activated`,
  };
}
