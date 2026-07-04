'use server';

import { createClient } from '@/lib/supabase/server';
import type { BillingCycle } from '@/lib/agents/plans';

interface CheckoutOpts {
  plan: 'starter' | 'pro' | 'team';
  cycle: BillingCycle;
  paymentMethod: 'card';
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
 * Agent plan checkout — temporarily offline pending PromptPay refactor.
 * Contact admin (tintanee.t@gmail.com) for manual activation.
 */
export async function checkoutAgentPlan(_opts: CheckoutOpts): Promise<CheckoutResult> {
  return {
    ok: false,
    error: 'agent_plan_checkout_offline_contact_admin',
  };
}

export async function cancelAgentSubscription() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  await supabase
    .from('agent_subscriptions')
    .update({
      cancel_at_period_end: true,
      cancelled_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  return { ok: true };
}
