import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSb } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'pending_review';

  const { data: orders } = await admin
    .from('subscription_orders')
    .select('id, user_id, order_ref, plan_code, billing_cycle, amount_thb, status, admin_notes, slip_url, slip_uploaded_at, slip_auto_verified, slip_verify_meta, created_at')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100);

  // Enrich with user emails + signed slip URLs
  const list = orders ?? [];
  const userIds = Array.from(new Set(list.map((o) => o.user_id)));
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, display_name')
    .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);
  const profileMap = new Map<string, { email: string; display_name?: string }>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, { email: p.email, display_name: p.display_name });
  }

  const enriched = await Promise.all(
    list.map(async (o) => {
      let signedSlipUrl: string | null = null;
      if (o.slip_url) {
        const { data: signed } = await admin.storage
          .from('subscription-slips')
          .createSignedUrl(o.slip_url, 3600);
        signedSlipUrl = signed?.signedUrl ?? null;
      }
      const profile = profileMap.get(o.user_id);
      return {
        ...o,
        signed_slip_url: signedSlipUrl,
        user_email: profile?.email ?? '?',
        user_display_name: profile?.display_name ?? null,
      };
    })
  );

  return NextResponse.json({ ok: true, orders: enriched });
}
