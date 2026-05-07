'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { isOmiseConfigured } from '@/lib/billing/omise';
import { redirect } from 'next/navigation';

const PACK_PRICES: Record<number, number> = {
  10: 79,
  50: 349,
  100: 599,
};

const SUBSCRIPTION_PRICES = {
  monthly: 149,
  yearly: 1490,
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lumenfi.projectostech.com';

interface CheckoutResult {
  ok: boolean;
  checkoutUrl?: string;
  error?: string;
}

export async function startCreditCheckout(packSize: number): Promise<CheckoutResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  const price = PACK_PRICES[packSize];
  if (!price) return { ok: false, error: 'invalid_pack' };

  if (!isOmiseConfigured()) {
    // Test mode — record pending payment + return a fake success URL
    const admin = createServiceClient();
    const { data: tx } = await admin
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        type: 'credit_pack',
        amount_thb: price,
        credits_pack_size: packSize,
        credits_added: packSize,
        payment_provider: 'test',
        status: 'pending',
        metadata: { test_mode: true },
      })
      .select('id')
      .single();

    return {
      ok: true,
      checkoutUrl: `/pricing/test-checkout?tx=${tx?.id}&type=credits&size=${packSize}`,
    };
  }

  // Production: create Omise charge with hosted form (Internet Banking / PromptPay etc)
  // For card payments, frontend should tokenize first via Omise.js
  // Here we'll redirect to a hosted-checkout page Lumenfi controls
  return {
    ok: true,
    checkoutUrl: `/pricing/checkout?type=credits&size=${packSize}`,
  };
}

export async function startSubscriptionCheckout(cycle: 'monthly' | 'yearly'): Promise<CheckoutResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  if (!isOmiseConfigured()) {
    // Test mode — activate trial directly
    const admin = createServiceClient();
    const trialEnd = new Date(Date.now() + 14 * 86400000);
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
      payment_provider: 'test',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    });

    return {
      ok: true,
      checkoutUrl: `/pricing/test-checkout?type=subscription&cycle=${cycle}`,
    };
  }

  return {
    ok: true,
    checkoutUrl: `/pricing/checkout?type=subscription&cycle=${cycle}`,
  };
}

export async function cancelSubscription() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createServiceClient();
  await admin
    .from('user_subscriptions')
    .update({
      cancel_at_period_end: true,
      cancelled_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  // TODO: delete Omise schedule if it exists
  redirect('/settings/billing');
}
