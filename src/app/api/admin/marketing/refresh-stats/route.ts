import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSbClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

const METRICS = [
  'post_impressions_unique',
  'post_impressions',
  'post_reactions_by_type_total',
  'post_clicks',
].join(',');

async function fetchInsights(postId: string, token: string) {
  const url = `https://graph.facebook.com/v19.0/${postId}/insights?metric=${METRICS}&access_token=${token}`;
  const res = await fetch(url, { cache: 'no-store' });
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body?.error ?? body));

  const out: Record<string, number> = {};
  for (const item of body.data ?? []) {
    const val = item.values?.[0]?.value;
    if (item.name === 'post_impressions_unique') out.reach = Number(val ?? 0);
    else if (item.name === 'post_impressions') out.impressions = Number(val ?? 0);
    else if (item.name === 'post_clicks') out.link_clicks = Number(val ?? 0);
    else if (item.name === 'post_reactions_by_type_total') {
      const total = Object.values(val ?? {}).reduce(
        (s: number, v: unknown) => s + Number(v ?? 0),
        0
      );
      out.likes = total;
    }
  }
  const detailUrl = `https://graph.facebook.com/v19.0/${postId}?fields=comments.summary(true).limit(0),shares&access_token=${token}`;
  const dRes = await fetch(detailUrl, { cache: 'no-store' });
  const dBody = await dRes.json();
  if (dRes.ok) {
    out.comments = Number(dBody?.comments?.summary?.total_count ?? 0);
    out.shares = Number(dBody?.shares?.count ?? 0);
  }
  return out;
}

/**
 * Admin-triggered refresh — fetches insights for ALL published posts
 * regardless of age. Used from marketing dashboard "Refresh Now" button.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'no_token', message: 'FB_PAGE_ACCESS_TOKEN not set in Vercel env' }, { status: 500 });
  }

  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: posts } = await admin
    .from('marketing_posts')
    .select('id, external_post_id, media_type')
    .eq('status', 'published')
    .not('external_post_id', 'is', null)
    .order('published_at', { ascending: false })
    .limit(50);

  let updated = 0;
  const errors: string[] = [];

  for (const p of posts ?? []) {
    try {
      const stats = await fetchInsights(p.external_post_id!, token);
      await admin.from('marketing_post_stats').upsert(
        {
          post_id: p.id,
          reach: stats.reach ?? null,
          impressions: stats.impressions ?? null,
          likes: stats.likes ?? null,
          comments: stats.comments ?? null,
          shares: stats.shares ?? null,
          link_clicks: stats.link_clicks ?? null,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: 'post_id' }
      );
      updated++;
    } catch (e: unknown) {
      errors.push(String(e).slice(0, 200));
    }
  }

  return NextResponse.json({ ok: true, updated, errors: errors.slice(0, 5) });
}
