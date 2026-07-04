'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

interface CheckoutResult {
  ok: boolean;
  checkoutUrl?: string;
  error?: string;
}

export async function startCreditCheckout(packSize: number): Promise<CheckoutResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  if (![10, 50, 100].includes(packSize)) {
    return { ok: false, error: 'invalid_pack' };
  }

  return {
    ok: true,
    checkoutUrl: `/subscription/checkout/credits_${packSize}`,
  };
}

export async function startSubscriptionCheckout(
  cycle: 'monthly' | 'yearly'
): Promise<CheckoutResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  return {
    ok: true,
    checkoutUrl: `/subscription/checkout/pro?cycle=${cycle}`,
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

  redirect('/settings/billing');
}
