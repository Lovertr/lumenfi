'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { createCharge, createCustomer, isOmiseConfigured } from '@/lib/billing/omise';

const PACK_PRICES: Record<number, number> = {
  10: 79,
  50: 349,
  100: 599,
};

const SUBSCRIPTION_PRICES = {
  monthly: 149,
  yearly: 1490,
};

interface ProcessOpts {
  type: 'subscription' | 'credits';
  cycle?: 'monthly' | 'yearly';
  packSize?: number;
  paymentMethod: 'card' | 'promptpay';
  cardToken?: string;
}

interface ProcessResult {
  ok: boolean;
  authorizeUri?: string;
  success?: boolean;
  redirectUrl?: string;
  error?: string;
}

export async function processCheckout(opts: ProcessOpts): Promise<ProcessResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  if (!isOmiseConfigured()) {
    return { ok: false, error: 'omise_not_configured' };
  }

  // Determine amount
  let amountThb = 0;
  let description = '';
  let packSize: number | undefined;
  if (opts.type === 'subscription') {
    const cycle = opts.cycle === 'yearly' ? 'yearly' : 'monthly';
    amountThb = SUBSCRIPTION_PRICES[cycle];
    description = `Lumenfi Pro ${cycle === 'yearly' ? 'รายปี' : 'รายเดือน'}`;
  } else if (opts.type === 'credits' && opts.packSize) {
    packSize = opts.packSize;
    amountThb = PACK_PRICES[packSize] ?? 0;
    description = `Lumenfi Credit Pack ${packSize} reports`;
  }

  if (!amountThb) return { ok: false, error: 'invalid_amount' };

  const admin = createServiceClient();

  // Create or fetch existing Omise customer
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
    console.error('omise customer create:', e?.message);
    return { ok: false, error: 'customer_create_failed' };
  }

  // For subscription with trial — we record subscription as 'trial' first, no charge yet
  if (opts.type === 'subscription' && opts.paymentMethod === 'card' && opts.cardToken) {
    // Attach card to customer (so we can charge later when trial ends)
    try {
      const trialEnd = new Date(Date.now() + 14 * 86400000);
      const cycle = opts.cycle === 'yearly' ? 'yearly' : 'monthly';
      const periodEnd = new Date(trialEnd.getTime() + (cycle === 'yearly' ? 365 : 30) * 86400000);

      await admin.from('user_subscriptions').upsert({
        user_id: user.id,
        plan_code: 'pro',
        status: 'trial',
        billing_cycle: cycle,
        started_at: new Date().toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
        payment_provider: 'omise',
        provider_customer_id: customerId,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      });

      // Record initial transaction as pending (will be charged after trial)
      await admin.from('payment_transactions').insert({
        user_id: user.id,
        type: 'subscription_initial',
        amount_thb: amountThb,
        plan_code: 'pro',
        billing_cycle: cycle,
        payment_provider: 'omise',
        provider_customer_id: customerId,
        status: 'pending',
        metadata: { card_token: opts.cardToken, trial_until: trialEnd.toISOString() },
      });

      return {
        ok: true,
        success: true,
        redirectUrl: '/pricing/test-checkout?type=subscription&cycle=' + cycle,
      };
    } catch (e: any) {
      console.error('subscription create:', e?.message);
      return { ok: false, error: 'subscription_create_failed' };
    }
  }

  // For credit pack — charge immediately
  if (opts.type === 'credits' && opts.paymentMethod === 'card' && opts.cardToken) {
    try {
      const charge = await createCharge({
        amount: amountThb * 100, // satang
        currency: 'thb',
        description,
        card: opts.cardToken,
        customer: customerId,
        return_uri: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://lumenfi.projectostech.com'}/th/pricing/test-checkout?type=credits&size=${packSize}`,
        metadata: {
          user_id: user.id,
          tx_type: 'credits',
          pack_size: packSize ?? 0,
        },
      });

      await admin.from('payment_transactions').insert({
        user_id: user.id,
        type: 'credit_pack',
        amount_thb: amountThb,
        credits_pack_size: packSize,
        credits_added: packSize,
        payment_provider: 'omise',
        provider_charge_id: charge.id,
        provider_customer_id: customerId,
        status: charge.status === 'successful' ? 'succeeded' : 'pending',
        receipt_url: charge.authorize_uri ?? null,
        metadata: charge.metadata,
      });

      // If 3DS required, return authorize URI
      if (charge.authorize_uri && charge.status !== 'successful') {
        return { ok: true, authorizeUri: charge.authorize_uri };
      }

      // If charge successful, add credits and redirect
      if (charge.status === 'successful' && packSize) {
        const { data: cur } = await admin
          .from('ai_credits')
          .select('advisor_report_balance, total_purchased')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cur) {
          await admin
            .from('ai_credits')
            .update({
              advisor_report_balance: (cur.advisor_report_balance ?? 0) + packSize,
              total_purchased: (cur.total_purchased ?? 0) + packSize,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        } else {
          await admin.from('ai_credits').insert({
            user_id: user.id,
            advisor_report_balance: packSize,
            total_purchased: packSize,
          });
        }
        return { ok: true, success: true, redirectUrl: '/settings/billing' };
      }

      return { ok: true, success: true, redirectUrl: '/settings/billing' };
    } catch (e: any) {
      console.error('charge create:', e?.message);
      return { ok: false, error: e?.message?.slice(0, 200) ?? 'charge_failed' };
    }
  }

  // PromptPay flow — TODO (separate source create)
  if (opts.paymentMethod === 'promptpay') {
    return {
      ok: false,
      error: 'PromptPay ยังไม่พร้อมใช้งาน — ใช้บัตรเครดิตได้เลย',
    };
  }

  return { ok: false, error: 'invalid_method' };
}
