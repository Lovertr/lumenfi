'use server';

import { createClient } from '@/lib/supabase/server';
import type { BillingCycle } from '@/lib/agents/plans';

interface CheckoutOpts {
  plan: 'starter' | 'pro' | 'team';
  cycle: BillingCycle;
  paymentMethod?: 'promptpay';
  cardToken?: string;
}

interface CheckoutResult {
  ok: boolean;
  authorizeUri?: string;
  success?: boolean;
  redirectUrl?: string;
  error?: string;
}

/**
 * Agent plan checkout — redirects to PromptPay flow.
 * Agent plans use plan_code = 'agent_starter' / 'agent_pro' / 'agent_team'.
 * Yearly maps to 'yearly' in subscription_orders and 'annual' in agent_subscriptions.
 */
export async function checkoutAgentPlan(opts: CheckoutOpts): Promise<CheckoutResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  const validPlans = ['starter', 'pro', 'team'];
  if (!validPlans.includes(opts.plan)) return { ok: false, error: 'invalid_plan' };

  const cycle = opts.cycle === 'annual' ? 'yearly' : 'monthly';
  return {
    ok: true,
    redirectUrl: `/subscription/checkout/agent_${opts.plan}?cycle=${cycle}`,
  };
}

export async function cancelAgentSubscription() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!agent) return { ok: false, error: 'no_agent' };

  await supabase
    .from('agent_subscriptions')
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('agent_id', agent.id)
    .eq('status', 'active');

  return { ok: true };
}
