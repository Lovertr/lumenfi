import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildPromptPayQrImageUrl } from '@/lib/payment/promptpay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  plan_code?: string;         // 'pro'
  billing_cycle?: 'monthly' | 'yearly';
}

const PACKAGES: Record<string, { amount: number; duration: number }> = {
  pro_monthly: { amount: 149, duration: 30 },
  pro_yearly: { amount: 1490, duration: 365 },
};

function packageKey(plan: string, cycle: string): string {
  return `${plan}_${cycle}`;
}

function generateOrderRef(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LMN-${date}-${rand}`;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: Body = {};
  try { body = await req.json(); } catch {}

  const planCode = body.plan_code ?? 'pro';
  const billingCycle = body.billing_cycle ?? 'monthly';
  const pkg = PACKAGES[packageKey(planCode, billingCycle)];
  if (!pkg) return NextResponse.json({ error: 'invalid_package' }, { status: 400 });

  const promptpayId = process.env.LUMENFI_PROMPTPAY_ID;
  if (!promptpayId) {
    return NextResponse.json({ error: 'promptpay_not_configured' }, { status: 500 });
  }

  // Check for existing pending order — avoid duplicates
  const { data: existing } = await supabase
    .from('subscription_orders')
    .select('id, order_ref, promptpay_qr_payload, amount_thb, status')
    .eq('user_id', user.id)
    .eq('plan_code', planCode)
    .eq('billing_cycle', billingCycle)
    .in('status', ['pending_upload', 'pending_review'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { imageUrl } = buildPromptPayQrImageUrl(promptpayId, Number(existing.amount_thb));
    return NextResponse.json({
      ok: true,
      order_id: existing.id,
      order_ref: existing.order_ref,
      amount_thb: Number(existing.amount_thb),
      qr_image_url: imageUrl,
      status: existing.status,
      reused: true,
    });
  }

  const orderRef = generateOrderRef();
  const { payload, imageUrl } = buildPromptPayQrImageUrl(promptpayId, pkg.amount);

  const { data: inserted, error: insertErr } = await supabase
    .from('subscription_orders')
    .insert({
      user_id: user.id,
      order_ref: orderRef,
      plan_code: planCode,
      billing_cycle: billingCycle,
      amount_thb: pkg.amount,
      duration_days: pkg.duration,
      promptpay_qr_payload: payload,
      status: 'pending_upload',
    })
    .select('id, order_ref, amount_thb, status')
    .single();

  if (insertErr) {
    console.error('[order/create] insert failed:', insertErr);
    return NextResponse.json({ error: 'db' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    order_id: inserted.id,
    order_ref: inserted.order_ref,
    amount_thb: Number(inserted.amount_thb),
    qr_image_url: imageUrl,
    status: inserted.status,
  });
}
