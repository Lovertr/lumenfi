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
  const isCredits = order.plan_code.startsWith('credits_');
  const expiresAt = isCredits
    ? null
    : new Date(Date.now() + Number(order.duration_days) * 24 * 3600 * 1000).toISOString();

  await admin.from('subscription_orders').update({
    status: 'approved',
    approved_by: adminUser.id,
    approved_at: nowIso,
    activated_at: nowIso,
    expires_at: expiresAt,
  }).eq('id', id);

  if (isCredits) {
    const packSize = parseInt(order.plan_code.replace('credits_', ''), 10) || 0;
    const { data: existing } = await admin
      .from('ai_credits')
      .select('user_id, advisor_report_balance, total_purchased')
      .eq('user_id', order.user_id)
      .maybeSingle();
    if (existing) {
      await admin.from('ai_credits').update({
        advisor_report_balance: Number(existing.advisor_report_balance) + packSize,
        total_purchased: Number(existing.total_purchased) + packSize,
        updated_at: nowIso,
      }).eq('user_id', order.user_id);
    } else {
      await admin.from('ai_credits').insert({
        user_id: order.user_id,
        advisor_report_balance: packSize,
        total_purchased: packSize,
        total_used: 0,
      });
    }
  } else {
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
  }

  if (process.env.RESEND_API_KEY) {
    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', order.user_id)
      .maybeSingle();
    if (profile?.email) {
      const resendKey = process.env.RESEND_API_KEY;
      const emailFrom = process.env.RESEND_FROM ?? 'noreply@lumenfi.projectostech.com';
      void fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: emailFrom,
          to: [profile.email],
          subject: 'Lumenfi payment approved - ' + order.order_ref,
          text: [
            isCredits ? 'Credits added successfully!' : 'Welcome to Lumenfi Pro!',
            '',
            'Order: ' + order.order_ref,
            'Amount: THB ' + Number(order.amount_thb).toLocaleString(),
            expiresAt ? 'Pro expires: ' + new Date(expiresAt).toLocaleDateString('th-TH') : '',
            '',
            'Use Lumenfi at https://lumenfi.projectostech.com',
          ].filter(Boolean).join('\n'),
        }),
      }).catch((e) => console.warn('[approve] notify failed:', e));
    }
  }

  return NextResponse.json({ ok: true, expires_at: expiresAt, kind: isCredits ? 'credits' : 'subscription' });
}
