import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * User cancels their own pending order (before admin approval).
 * Only allowed for statuses that haven't been processed yet.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: order } = await supabase
    .from('subscription_orders')
    .select('id, user_id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!['pending_upload', 'pending_review'].includes(order.status)) {
    return NextResponse.json(
      { error: 'invalid_status', status: order.status },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from('subscription_orders')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[cancel] update failed:', error);
    return NextResponse.json({ error: 'db' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
