import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSb } from '@supabase/supabase-js';
import { verifySlipWithSlip2Go } from '@/lib/payment/slip2go';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'invalid_form' }, { status: 400 });

  const orderId = String(formData.get('order_id') ?? '');
  const slipFile = formData.get('slip') as File | null;
  if (!orderId || !slipFile) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const { data: order } = await supabase
    .from('subscription_orders')
    .select('id, user_id, order_ref, amount_thb, duration_days, plan_code, billing_cycle, status')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
  if (order.status !== 'pending_upload') {
    return NextResponse.json({ error: 'invalid_order_status', status: order.status }, { status: 409 });
  }

  const ext = slipFile.type === 'image/png' ? 'png'
    : slipFile.type === 'image/webp' ? 'webp'
    : 'jpg';
  const path = `${user.id}/${orderId}.${ext}`;
  const bytes = await slipFile.arrayBuffer();
  const { error: uploadErr } = await supabase.storage
    .from('subscription-slips')
    .upload(path, bytes, { contentType: slipFile.type, upsert: true });
  if (uploadErr) {
    console.error('[upload-slip] storage upload failed:', uploadErr);
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  }

  const admin = createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: signed } = await admin.storage
    .from('subscription-slips')
    .createSignedUrl(path, 900);
  const slipUrl = signed?.signedUrl ?? '';

  const promptpayId = process.env.LUMENFI_PROMPTPAY_ID!;
  const verify = await verifySlipWithSlip2Go({
    slipImageUrl: slipUrl,
    expectedAmount: Number(order.amount_thb),
    expectedReceiverPromptPay: promptpayId,
  });

  const nowIso = new Date().toISOString();
  const durationMs = Number(order.duration_days) * 24 * 3600 * 1000;

  if (verify.autoApprove) {
    const isCredits = order.plan_code.startsWith('credits_');
    const expiresAt = isCredits ? null : new Date(Date.now() + durationMs).toISOString();

    await admin.from('subscription_orders').update({
      slip_url: path,
      slip_uploaded_at: nowIso,
      slip_auto_verified: true,
      slip_verify_meta: verify as unknown as object,
      status: 'approved',
      approved_at: nowIso,
      activated_at: nowIso,
      expires_at: expiresAt,
    }).eq('id', orderId);

    if (isCredits) {
      const packSize = parseInt(order.plan_code.replace('credits_', ''), 10) || 0;
      const { data: existing } = await admin
        .from('ai_credits')
        .select('user_id, advisor_report_balance, total_purchased')
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing) {
        await admin.from('ai_credits').update({
          advisor_report_balance: Number(existing.advisor_report_balance) + packSize,
          total_purchased: Number(existing.total_purchased) + packSize,
          updated_at: nowIso,
        }).eq('user_id', user.id);
      } else {
        await admin.from('ai_credits').insert({
          user_id: user.id,
          advisor_report_balance: packSize,
          total_purchased: packSize,
          total_used: 0,
        });
      }
    } else {
      await admin.from('user_subscriptions').upsert({
        user_id: user.id,
        plan_code: order.plan_code,
        status: 'active',
        billing_cycle: order.billing_cycle,
        started_at: nowIso,
        current_period_start: nowIso,
        current_period_end: expiresAt,
        payment_provider: 'promptpay_manual',
        provider_subscription_id: order.order_ref,
      }, { onConflict: 'user_id' });
    }

    return NextResponse.json({
      ok: true,
      auto_approved: true,
      status: 'approved',
      expires_at: expiresAt,
      kind: isCredits ? 'credits' : 'subscription',
    });
  }

  await admin.from('subscription_orders').update({
    slip_url: path,
    slip_uploaded_at: nowIso,
    slip_auto_verified: false,
    slip_verify_meta: verify as unknown as object,
    status: 'pending_review',
  }).eq('id', orderId);

  if (process.env.RESEND_API_KEY) {
    void sendAdminAlert({
      orderRef: order.order_ref,
      userEmail: user.email ?? '?',
      amount: Number(order.amount_thb),
      reason: verify.reason ?? 'no_slip2go',
    }).catch((e) => console.warn('[upload-slip] admin email failed:', e));
  }

  return NextResponse.json({
    ok: true,
    auto_approved: false,
    status: 'pending_review',
    verify_reason: verify.reason,
  });
}

async function sendAdminAlert(x: {
  orderRef: string;
  userEmail: string;
  amount: number;
  reason: string;
}) {
  const resendKey = process.env.RESEND_API_KEY!;
  const emailFrom = process.env.RESEND_FROM ?? 'noreply@lumenfi.projectostech.com';
  const url = 'https://lumenfi.projectostech.com/settings/admin/subscription-orders';
  const lines = [
    'New Lumenfi payment awaiting review',
    '',
    'Order: ' + x.orderRef,
    'User: ' + x.userEmail,
    'Amount: THB ' + x.amount.toLocaleString(),
    'Slip auto-verify: FAILED (' + x.reason + ')',
    '',
    'Review at: ' + url,
  ];
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: emailFrom,
      to: [ADMIN_EMAIL],
      subject: 'Lumenfi payment - ' + x.userEmail + ' THB ' + x.amount,
      text: lines.join('\n'),
    }),
  });
}
