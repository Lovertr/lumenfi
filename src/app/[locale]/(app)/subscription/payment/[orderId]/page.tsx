import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { buildPromptPayQrImageUrl } from '@/lib/payment/promptpay';
import PaymentClient from './payment-client';

export const dynamic = 'force-dynamic';

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: order } = await supabase
    .from('subscription_orders')
    .select('id, order_ref, plan_code, billing_cycle, amount_thb, status, admin_notes, slip_uploaded_at, activated_at, expires_at, slip_auto_verified')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!order) notFound();

  const promptpayId = process.env.LUMENFI_PROMPTPAY_ID ?? '';
  const { imageUrl } = buildPromptPayQrImageUrl(promptpayId, Number(order.amount_thb));

  return (
    <PaymentClient
      order={order}
      qrImageUrl={imageUrl}
      promptpayId={promptpayId}
    />
  );
}
