import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Server action page — creates the order then redirects to payment page.
 * Handles both existing pending orders (reuse) and new orders.
 */
export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; planCode: string }>;
  searchParams: Promise<{ cycle?: string }>;
}) {
  const { locale, planCode } = await params;
  const { cycle } = await searchParams;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/subscription/checkout/${planCode}`);

  const billingCycle = cycle === 'yearly' ? 'yearly' : 'monthly';

  // Call create-order API (server-to-server via cookie forwarding is auto for same-origin)
  const url = new URL(
    '/api/subscription/order/create',
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://lumenfi.projectostech.com'
  );

  // Server-side fetch with auth headers requires cookie forwarding.
  // Simplest: do the DB write here directly.
  const { data: existingPending } = await supabase
    .from('subscription_orders')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('plan_code', planCode)
    .eq('billing_cycle', billingCycle)
    .in('status', ['pending_upload', 'pending_review'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPending) {
    redirect(`/${locale}/subscription/payment/${existingPending.id}`);
  }

  const PACKAGES: Record<string, { amount: number; duration: number }> = {
    pro_monthly: { amount: 149, duration: 30 },
    pro_yearly: { amount: 1490, duration: 365 },
  };
  const pkg = PACKAGES[`${planCode}_${billingCycle}`];
  if (!pkg) redirect(`/${locale}/pricing`);

  const orderRef = `LMN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  const { data: inserted, error } = await supabase
    .from('subscription_orders')
    .insert({
      user_id: user.id,
      order_ref: orderRef,
      plan_code: planCode,
      billing_cycle: billingCycle,
      amount_thb: pkg.amount,
      duration_days: pkg.duration,
      status: 'pending_upload',
    })
    .select('id')
    .single();

  if (error || !inserted) {
    console.error('[checkout] create failed:', error);
    redirect(`/${locale}/pricing?error=create_failed`);
  }

  redirect(`/${locale}/subscription/payment/${inserted.id}`);
}
