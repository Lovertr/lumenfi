import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSb } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = createClient();
  const { data: { user: adminUser } } = await supabase.auth.getUser();
  if (!adminUser || adminUser.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { reason?: string } = {};
  try { body = await req.json(); } catch {}
  const reason = String(body.reason ?? '').trim() || 'ไม่พบการชำระเงิน';

  const admin = createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: order } = await admin
    .from('subscription_orders')
    .select('id, user_id, order_ref, amount_thb, status')
    .eq('id', id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (order.status !== 'pending_review') {
    return NextResponse.json({ error: 'invalid_status', status: order.status }, { status: 409 });
  }

  await admin.from('subscription_orders').update({
    status: 'rejected',
    admin_notes: reason,
    rejected_at: new Date().toISOString(),
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
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: emailFrom,
          to: [profile.email],
          subject: `❌ Lumenfi payment verification failed — ${order.order_ref}`,
          text: [
            `ขออภัย การยืนยันการชำระเงินไม่สำเร็จ`,
            ``,
            `Order: ${order.order_ref}`,
            `จำนวน: ฿${Number(order.amount_thb).toLocaleString()}`,
            `เหตุผล: ${reason}`,
            ``,
            `กรุณาลองส่งสลิปใหม่ที่ https://lumenfi.projectostech.com/subscription`,
            ``,
            `หากมีข้อสงสัย ติดต่อ tintanee.t@gmail.com`,
          ].join('\n'),
        }),
      }).catch((e) => console.warn('[reject] notify failed:', e));
    }
  }

  return NextResponse.json({ ok: true });
}
