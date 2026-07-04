import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const PACKAGES: Record<string, { amount: number; duration: number }> = {
  pro_monthly: { amount: 149, duration: 30 },
  pro_yearly: { amount: 1490, duration: 365 },
  credits_10_monthly: { amount: 79, duration: 0 },
  credits_50_monthly: { amount: 349, duration: 0 },
  credits_100_monthly: { amount: 599, duration: 0 },
};

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
  const key = `${planCode}_${billingCycle}`;
  const pkg = PACKAGES[key];
  if (!pkg) redirect(`/${locale}/pricing?error=invalid_package&plan=${planCode}`);

  const { data: existingPending } = await supabase
    .from('subscription_orders')
    .select('id')
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

  const orderRef =
    'LMN-' +
    new Date().toISOString().slice(0, 10).replace(/-/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 6).toUpperCase();

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
    // Surface actual error code so user knows what's wrong
    const code = error?.code ?? 'unknown';
    const msg = error?.message ? encodeURIComponent(error.message.slice(0, 100)) : '';
    redirect(`/${locale}/pricing?error=create_failed&code=${code}&msg=${msg}`);
  }

  redirect(`/${locale}/subscription/payment/${inserted.id}`);
}
