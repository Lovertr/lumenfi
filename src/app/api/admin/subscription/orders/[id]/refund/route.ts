import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSb } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

/**
 * Admin marks an approved order as refunded and reverses the activation:
 *  - credits_*  → subtract from ai_credits.advisor_report_balance
 *  - agent_*    → mark agent_subscriptions as expired
 *  - pro_*      → mark user_subscriptions as expired
 *
 * Admin does the actual bank transfer manually; this only updates the app state.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = createClient();
  const { data: { user: adminUser } } = await supabase.auth.getUser();
  if (!adminUser || adminUser.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { reason?: string } = {};
  try { body = await req.json(); } catch {}
  const reason = String(body.reason ?? '').trim() || 'refund requested';

  const admin = createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: order } = await admin
    .from('subscription_orders')
    .select('id, user_id, order_ref, plan_code, amount_thb, status')
    .eq('id', id)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (order.status !== 'approved') {
    return NextResponse.json({ error: 'not_approved', status: order.status }, { status: 409 });
  }

  const nowIso = new Date().toISOString();

  // Reverse activation
  if (order.plan_code.startsWith('credits_')) {
    const packSize = parseInt(order.plan_code.replace('credits_', ''), 10) || 0;
    const { data: cur } = await admin
      .from('ai_credits')
      .select('advisor_report_balance')
      .eq('user_id', order.user_id)
      .maybeSingle();
    if (cur) {
      const newBalance = Math.max(0, Number(cur.advisor_report_balance) - packSize);
      await admin.from('ai_credits').update({
        advisor_report_balance: newBalance,
        updated_at: nowIso,
      }).eq('user_id', order.user_id);
    }
  } else if (order.plan_code.startsWith('agent_')) {
    const { data: agent } = await admin
      .from('agents')
      .select('id')
      .eq('user_id', order.user_id)
      .maybeSingle();
    if (agent) {
      await admin.from('agent_subscriptions').update({
        status: 'expired',
        updated_at: nowIso,
      }).eq('agent_id', agent.id).eq('status', 'active');
    }
  } else {
    await admin.from('user_subscriptions').update({
      status: 'expired',
      updated_at: nowIso,
    }).eq('user_id', order.user_id);
  }

  // Update order
  await admin.from('subscription_orders').update({
    status: 'refunded' as unknown as string,
    admin_notes: reason,
    rejected_at: nowIso, // reuse rejected_at as "reversed_at" if no dedicated column
  }).eq('id', id);

  // Notify user
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
          subject: 'Lumenfi refund - ' + order.order_ref,
          text: [
            'การชำระเงินของคุณได้รับการคืนเงินแล้ว',
            '',
            'Order: ' + order.order_ref,
            'จำนวน: THB ' + Number(order.amount_thb).toLocaleString(),
            'เหตุผล: ' + reason,
            '',
            'เงินจะโอนกลับเข้าบัญชีคุณภายใน 1-3 วันทำการ',
          ].join('\n'),
        }),
      }).catch((e) => console.warn('[refund] notify failed:', e));
    }
  }

  return NextResponse.json({ ok: true });
}
