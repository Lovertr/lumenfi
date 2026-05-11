'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { createCharge, createCustomer, isOmiseConfigured } from '@/lib/billing/omise';
import { getPlanInfo, type AgentPlanInfo, type BillingCycle } from '@/lib/agents/plans';

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

export async function checkoutAgentPlan(opts: CheckoutOpts): Promise<CheckoutResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  if (!isOmiseConfigured()) {
    return { ok: false, error: 'omise_not_configured' };
  }

  const plan = getPlanInfo(opts.plan);
  if (!plan) return { ok: false, error: 'invalid_plan' };

  // Get the agent record
  const admin = createServiceClient();
  const { data: agent } = await admin
    .from('agents')
    .select('id, agent_name, status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!agent) return { ok: false, error: 'not_an_agent' };
  if ((agent as any).status !== 'active') {
    return { ok: false, error: 'agent_not_active' };
  }

  const amountThb = opts.cycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
  const periodDays = opts.cycle === 'annual' ? 365 : 30;
  const description = `Lumenfi Agent ${plan.name} (${opts.cycle === 'annual' ? 'รายปี' : 'รายเดือน'})`;

  // Get or create Omise customer for this user (reuse same customer for both
  // their user-Pro plan and agent plan — that way card on file works for both)
  let customerId: string | undefined;
  try {
    const { data: existing } = await admin
      .from('user_subscriptions')
      .select('provider_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (existing?.provider_customer_id) {
      customerId = existing.provider_customer_id;
    } else {
      const customer = await createCustomer({
        email: user.email ?? `user-${user.id}@lumenfi.app`,
        description: `Lumenfi user ${user.id}`,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }
  } catch (e: any) {
    console.error('[agent checkout] customer:', e?.message);
    return { ok: false, error: 'customer_create_failed' };
  }

  if (!opts.cardToken) return { ok: false, error: 'missing_card_token' };

  // Charge immediately
  try {
    const charge = await createCharge({
      amount: amountThb * 100,
      currency: 'thb',
      description,
      card: opts.cardToken,
      customer: customerId,
      return_uri: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://lumenfi.projectostech.com'}/th/agents/billing?charge=ok`,
      metadata: {
        user_id: user.id,
        tx_type: 'agent_subscription',
        agent_id: (agent as any).id,
        plan_code: plan.id,
        billing_cycle: opts.cycle,
      },
    });

    // Compute period end
    const now = new Date();
    const periodEnd = new Date(now.getTime() + periodDays * 86400000);

    // Record payment transaction
    await admin.from('payment_transactions').insert({
      user_id: user.id,
      type: 'agent_subscription',
      amount_thb: amountThb,
      plan_code: plan.id,
      billing_cycle: opts.cycle,
      payment_provider: 'omise',
      provider_charge_id: charge.id,
      provider_customer_id: customerId,
      status: charge.status === 'successful' ? 'succeeded' : 'pending',
      receipt_url: charge.authorize_uri ?? null,
      metadata: {
        agent_id: (agent as any).id,
        plan_code: plan.id,
        billing_cycle: opts.cycle,
      },
    });

    // 3DS path
    if (charge.authorize_uri && charge.status !== 'successful') {
      return { ok: true, authorizeUri: charge.authorize_uri };
    }

    // Immediate success — update agent_subscriptions
    if (charge.status === 'successful') {
      await activateAgentPlan(
        (agent as any).id,
        plan.id,
        opts.cycle,
        amountThb,
        periodEnd,
        charge.id
      );
      revalidatePath('/agents/billing');
      revalidatePath('/agents/dashboard');
      return { ok: true, success: true, redirectUrl: '/agents/billing?charge=ok' };
    }

    return { ok: true, success: true, redirectUrl: '/agents/billing?charge=pending' };
  } catch (e: any) {
    console.error('[agent checkout] charge:', e?.message);
    return { ok: false, error: e?.message?.slice(0, 200) ?? 'charge_failed' };
  }
}

/** Activate agent plan — called from checkout success path AND webhook. */
export async function activateAgentPlan(
  agentId: string,
  planCode: 'starter' | 'pro' | 'team',
  cycle: BillingCycle,
  monthlyAmount: number,
  periodEnd: Date,
  omiseChargeId?: string
) {
  const admin = createServiceClient();
  // Close any active subscription (mark expired)
  await admin
    .from('agent_subscriptions')
    .update({ status: 'expired' })
    .eq('agent_id', agentId)
    .eq('status', 'active');

  // Insert new active subscription
  await admin.from('agent_subscriptions').insert({
    agent_id: agentId,
    plan: planCode,
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancel_at_period_end: false,
    monthly_amount: cycle === 'annual' ? Math.round(monthlyAmount / 12) : monthlyAmount,
    billing_cycle: cycle,
    omise_subscription_id: omiseChargeId ?? null,
    // Trial fields stay null/0 since they don't apply
    trial_leads_used: 0,
    trial_leads_cap: 0,
  });
}

export async function cancelAgentSubscription(): Promise<{ ok: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const admin = createServiceClient();
  const { data: agent } = await admin
    .from('agents')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!agent) return { ok: false };

  await admin
    .from('agent_subscriptions')
    .update({ cancel_at_period_end: true })
    .eq('agent_id', (agent as any).id)
    .eq('status', 'active');

  revalidatePath('/agents/billing');
  return { ok: true };
}
