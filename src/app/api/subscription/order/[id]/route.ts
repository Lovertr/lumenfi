import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildPromptPayQrImageUrl } from '@/lib/payment/promptpay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: order } = await supabase
    .from('subscription_orders')
    .select('id, order_ref, plan_code, billing_cycle, amount_thb, status, admin_notes, slip_uploaded_at, activated_at, expires_at, created_at, slip_auto_verified')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const promptpayId = process.env.LUMENFI_PROMPTPAY_ID ?? '';
  const { imageUrl } = buildPromptPayQrImageUrl(promptpayId, Number(order.amount_thb));

  return NextResponse.json({
    ok: true,
    order,
    qr_image_url: imageUrl,
  });
}
