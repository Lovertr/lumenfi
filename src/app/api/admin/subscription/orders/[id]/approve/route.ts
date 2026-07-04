import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSb } from '@supabase/supabase-js';
import { activateApprovedOrder } from '@/lib/payment/activate-order';

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
  const result = await activateApprovedOrder(admin, order, nowIso);

  await admin.from('subscription_orders').update({
    status: 'approved',
    approved_by: adminUser.id,
    approved_at: nowIso,
    activated_at: nowIso,
    expires_at: result.expiresAt,
  }).eq('id', id);

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
            result.detail,
            '',
            'Order: ' + order.order_ref,
            'Amount: THB ' + Number(order.amount_thb).toLocaleString(),
            result.expiresAt ? 'Valid until: ' + new Date(result.expiresAt).toLocaleDateString('th-TH') : '',
            '',
            'https://lumenfi.projectostech.com',
          ].filter(Boolean).join('\n'),
        }),
      }).catch((e) => console.warn('[approve] notify failed:', e));
    }
  }

  return NextResponse.json({
    ok: true,
    kind: result.kind,
    expires_at: result.expiresAt,
    detail: result.detail,
  });
}
