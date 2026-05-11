import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WEBHOOK_SECRET = process.env.OMISE_WEBHOOK_SECRET;

/**
 * Omise sends events as JSON POSTs. We verify HMAC-SHA256 signature
 * (if OMISE_WEBHOOK_SECRET is set) then dispatch by event type.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();

  // Optional signature verification
  if (WEBHOOK_SECRET) {
    const signature = req.headers.get('omise-signature');
    if (!signature) {
      return NextResponse.json({ error: 'no_signature' }, { status: 401 });
    }
    const expected = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    if (signature !== expected) {
      return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
    }
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    const eventType = event?.key as string; // e.g. 'charge.complete', 'schedule.create'
    const data = event?.data;

    switch (eventType) {
      case 'charge.complete':
        await handleChargeComplete(supabase, data);
        break;
      case 'charge.failed':
        await handleChargeFailed(supabase, data);
        break;
      case 'charge.create':
        // initial charge — handled by checkout flow
        break;
      case 'schedule.create':
      case 'occurrence.create':
        // recurring billing event — Omise charges automatically
        break;
      case 'customer.destroy':
        // cleanup
        break;
      default:
        console.log('omise webhook unhandled:', eventType);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('omise webhook error:', e);
    return NextResponse.json({ error: e?.message ?? 'failed' }, { status: 500 });
  }
}

async function handleChargeComplete(supabase: any, charge: any) {
  const chargeId = charge?.id as string;
  const userId = charge?.metadata?.user_id as string | undefined;
  const type = charge?.metadata?.tx_type as string | undefined;
  if (!chargeId || !userId) return;

  // Find pending transaction
  const { data: tx } = await supabase
    .from('payment_transactions')
    .select('id, type, credits_pack_size, plan_code, billing_cycle')
    .eq('provider_charge_id', chargeId)
    .maybeSingle();

  if (!tx) {
    // Create a record after-the-fact
    await supabase.from('payment_transactions').insert({
      user_id: userId,
      type: type === 'subscription' ? 'subscription_initial' : 'credit_pack',
      amount_thb: (charge.amount ?? 0) / 100,
      payment_provider: 'omise',
      provider_charge_id: chargeId,
      provider_customer_id: charge.customer ?? null,
      status: 'succeeded',
      receipt_url: charge.authorize_uri ?? null,
      metadata: charge.metadata,
    });
  } else {
    await supabase
      .from('payment_transactions')
      .update({ status: 'succeeded' })
      .eq('id', tx.id);
  }

  // Apply effects
  if (type === 'credits' || tx?.type === 'credit_pack') {
    const packSize = (charge.metadata?.pack_size as number) ?? tx?.credits_pack_size ?? 0;
    if (packSize > 0) await addCredits(supabase, userId, packSize);
  } else if (type === 'subscription' || tx?.type === 'subscription_initial') {
    const cycle = (charge.metadata?.billing_cycle as string) ?? tx?.billing_cycle ?? 'monthly';
    await activateSubscription(supabase, userId, cycle as 'monthly' | 'yearly', charge);
  } else if (type === 'agent_subscription' || tx?.type === 'agent_subscription') {
    const agentId = (charge.metadata?.agent_id as string) ?? null;
    const planCode = (charge.metadata?.plan_code as string) ?? tx?.plan_code ?? 'starter';
    const cycle = (charge.metadata?.billing_cycle as string) ?? tx?.billing_cycle ?? 'monthly';
    if (agentId) await activateAgentSub(supabase, agentId, planCode, cycle, (charge.amount ?? 0) / 100, charge.id, charge.customer ?? null);
  }
}

async function activateAgentSub(
  supabase: any,
  agentId: string,
  planCode: string,
  cycle: string,
  amountThb: number,
  chargeId: string,
  customerId?: string | null,
) {
  const periodDays = cycle === 'annual' ? 365 : 30;
  const periodEnd = new Date(Date.now() + periodDays * 86400000);

  // Expire current active subs for this agent
  await supabase
    .from('agent_subscriptions')
    .update({ status: 'expired' })
    .eq('agent_id', agentId)
    .eq('status', 'active');

  await supabase.from('agent_subscriptions').insert({
    agent_id: agentId,
    plan: planCode,
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancel_at_period_end: false,
    monthly_amount: cycle === 'annual' ? Math.round(amountThb / 12) : amountThb,
    billing_cycle: cycle,
    omise_subscription_id: chargeId,
    omise_customer_id: customerId ?? null,
    auto_renew: true,
    charge_retry_count: 0,
    trial_leads_used: 0,
    trial_leads_cap: 0,
  });
}

async function handleChargeFailed(supabase: any, charge: any) {
  const chargeId = charge?.id;
  await supabase
    .from('payment_transactions')
    .update({
      status: 'failed',
      failure_reason: charge?.failure_message ?? charge?.failure_code ?? 'unknown',
    })
    .eq('provider_charge_id', chargeId);
}

async function addCredits(supabase: any, userId: string, amount: number) {
  const { data: cur } = await supabase
    .from('ai_credits')
    .select('advisor_report_balance, total_purchased')
    .eq('user_id', userId)
    .maybeSingle();

  if (cur) {
    await supabase
      .from('ai_credits')
      .update({
        advisor_report_balance: (cur.advisor_report_balance ?? 0) + amount,
        total_purchased: (cur.total_purchased ?? 0) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  } else {
    await supabase.from('ai_credits').insert({
      user_id: userId,
      advisor_report_balance: amount,
      total_purchased: amount,
    });
  }
}

async function activateSubscription(
  supabase: any,
  userId: string,
  cycle: 'monthly' | 'yearly',
  charge: any,
) {
  const periodDays = cycle === 'yearly' ? 365 : 30;
  const periodEnd = new Date(Date.now() + periodDays * 86400000);

  await supabase.from('user_subscriptions').upsert({
    user_id: userId,
    plan_code: 'pro',
    status: 'active',
    billing_cycle: cycle,
    started_at: new Date().toISOString(),
    current_period_start: new Date().toISOString(),
    current_period_end: periodEnd.toISOString(),
    payment_provider: 'omise',
    provider_customer_id: charge.customer ?? null,
    provider_subscription_id: charge.schedule ?? null,
    cancel_at_period_end: false,
    updated_at: new Date().toISOString(),
  });
}
