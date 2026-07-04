import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSb } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = createClient();
  const { data: { user: adminUser } } = await supabase.auth.getUser();
  if (!adminUser || adminUser.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: order } = await admin
    .from('subscription_orders')
    .select('id, user_id, order_ref, plan_code, billing_cycle, amount_thb, duration_days, status')
    .eq('id', id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (order.status !== 'pending_review') {
    return NextResponse.json({ error: 'invalid_status', status: order.status }, { status: 409 });
  }

  const nowIso = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + Number(order.duration_days) * 24 * 3600 * 1000
  ).toISOString();

  await admin.from('subscription_orders').update({
    status: 'approved',
    approved_by: adminUser.id,
    approved_at: nowIso,
    activated_at: nowIso,
    expires_at: expiresAt,
  }).eq('id', id);

  await admin.from('user_subscriptions').upsert({
    user_id: order.user_id,
    plan_code: order.plan_code,
    status: 'active',
    billing_cycle: order.billing_cycle,
    started_at: nowIso,
    current_period_start: nowIso,
    current_period_end: expiresAt,
    payment_provider: 'promptpay_manual',
    provider_subscription_id: order.order_ref,
  }, { onConflict: 'user_id' });

  // Notify user via email
  if (process.env.RESEND_API_KEY) {
    const { data: profile } = await admin
      .from('profiles')
      .select('email, display_name')
      .eq('id', order.user_id)
      .maybeSingle();
    if (profile?.email) {
      void notifyUser(profile.email, 'approved', {
        orderRef: order.order_ref,
        amount: Number(order.amount_thb),
        expiresAt,
      }).catch((e) => console.warn('[approve] notify failed:', e));
    }
  }

  return NextResponse.json({ ok: true, expires_at: expiresAt });
}

async function notifyUser(
  toEmail: string,
  kind: 'approved' | 'rejected',
  x: { orderRef: string; amount?: number; expiresAt?: string; reason?: string }
) {
  const resendKey = process.env.RESEND_API_KEY!;
  const emailFrom = process.env.RESEND_FROM ?? 'noreply@lumenfi.projectostech.com';
  const subject = kind === 'approved'
    ? `✅ Lumenfi Pro activated — ${x.orderRef}`
    : `❌ Payment verification failed — ${x.orderRef}`;
  const lines = kind === 'approved'
    ? [
        `ยินดีต้อนรับสู่ Lumenfi Pro! 🎉`,
        ``,
        `Order: ${x.orderRef}`,
        `จำนวน: ฿${x.amount?.toLocaleString()}`,
        `Pro หมดอายุ: ${x.expiresAt ? new Date(x.expiresAt).toLocaleDateString('th-TH') : '?'}`,
        ``,
        `ใช้งาน Lumenfi Pro ได้เลยที่ https://lumenfi.projectostech.com`,
      ]
    : [
        `ขออภัย การยืนยันการชำระเงินไม่สำเร็จ`,
        ``,
        `Order: ${x.orderRef}`,
        `เหตุผล: ${x.reason ?? '(ไม่ระบุ)'}`,
        ``,
        `หากมีข้อสงสัย ติดต่อ tintanee.t@gmail.com`,
      ];
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: emailFrom, to: [toEmail], subject, text: lines.join('\n') }),
  });
}
