import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// All supported checkout packages. Plan code convention:
//   pro_*                       -> user Pro subscription (user_subscriptions)
//   credits_10/50/100_monthly   -> one-off credit packs (ai_credits.advisor_report_balance)
//   agent_starter/pro/team_*    -> agent plan subscription (agent_subscriptions)
const PACKAGES: Record<string, { amount: number; duration: number }> = {
  pro_monthly: { amount: 149, duration: 30 },
  pro_yearly: { amount: 1490, duration: 365 },
  credits_10_monthly: { amount: 79, duration: 0 },
  credits_50_monthly: { amount: 349, duration: 0 },
  credits_100_monthly: { amount: 599, duration: 0 },
  agent_starter_monthly: { amount: 299, duration: 30 },
  agent_starter_yearly: { amount: 2990, duration: 365 },
  agent_pro_monthly: { amount: 699, duration: 30 },
  agent_pro_yearly: { amount: 6990, duration: 365 },
  agent_team_monthly: { amount: 1990, duration: 30 },
  agent_team_yearly: { amount: 19900, duration: 365 },
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

  // Normalize: agent billing UI passes 'annual', schema uses 'yearly'
  const rawCycle = cycle === 'annual' ? 'yearly' : cycle;
  const billingCycle = rawCycle === 'yearly' ? 'yearly' : 'monthly';
  const key = `${planCode}_${billingCycle}`;
  const pkg = PACKAGES[key];
  if (!pkg) redirect(`/${locale}/pricing?error=invalid_package&plan=${planCode}`);

  // Rate limit: max 3 orders per user per hour
  const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from('subscription_orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', oneHourAgo);
  if ((recentCount ?? 0) >= 3) {
    redirect(`/${locale}/pricing?error=rate_limit&msg=${encodeURIComponent('สร้าง order เกิน 3 ครั้งใน 1 ชม. ลองใหม่ในภายหลัง')}`);
  }

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
    const code = error?.code ?? 'unknown';
    const msg = error?.message ? encodeURIComponent(error.message.slice(0, 100)) : '';
    redirect(`/${locale}/pricing?error=create_failed&code=${code}&msg=${msg}`);
  }

  // Fire-and-forget user email — non-blocking (won't slow redirect)
  if (process.env.RESEND_API_KEY && user.email) {
    void sendOrderCreatedEmail(user.email, {
      orderRef,
      amount: pkg.amount,
      planCode,
      billingCycle,
      paymentUrl: `https://lumenfi.projectostech.com/${locale}/subscription/payment/${inserted.id}`,
    }).catch((e) => console.warn('[checkout] confirmation email failed:', e));
  }

  redirect(`/${locale}/subscription/payment/${inserted.id}`);
}

async function sendOrderCreatedEmail(
  toEmail: string,
  x: { orderRef: string; amount: number; planCode: string; billingCycle: string; paymentUrl: string }
) {
  const resendKey = process.env.RESEND_API_KEY!;
  const emailFrom = process.env.RESEND_FROM ?? 'noreply@lumenfi.projectostech.com';
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: emailFrom,
      to: [toEmail],
      subject: 'Lumenfi order created - ' + x.orderRef,
      text: [
        'ขอบคุณสำหรับการสั่งซื้อ Lumenfi',
        '',
        'Order: ' + x.orderRef,
        'แพลน: ' + x.planCode + ' (' + x.billingCycle + ')',
        'ยอดชำระ: THB ' + x.amount.toLocaleString(),
        '',
        'ทำการชำระเงินได้ที่:',
        x.paymentUrl,
        '',
        'สแกน QR PromptPay -> อัพโหลดสลิป -> auto-verify',
        'ปกติได้ Pro ทันที (หรือ admin ตรวจสอบไม่เกิน 2 ชม.)',
      ].join('\n'),
    }),
  });
}
