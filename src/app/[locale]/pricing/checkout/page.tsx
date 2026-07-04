import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Legacy Omise checkout — deprecated 2026-07-04
 * Redirects all traffic to the new PromptPay + admin approval flow.
 */
export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; size?: string; cycle?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  if (sp.type === 'subscription') {
    const cycle = sp.cycle === 'yearly' ? 'yearly' : 'monthly';
    redirect(`/${locale}/subscription/checkout/pro?cycle=${cycle}`);
  }

  if (sp.type === 'credits' && sp.size) {
    const size = parseInt(sp.size, 10);
    if ([10, 50, 100].includes(size)) {
      redirect(`/${locale}/subscription/checkout/credits_${size}`);
    }
  }

  redirect(`/${locale}/pricing`);
}
