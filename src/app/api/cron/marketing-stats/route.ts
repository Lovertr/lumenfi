import { NextResponse } from 'next/server';
import { createClient as createSbClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Marketing stats poller — hourly cron.
 *
 * Reads marketing_posts that were published in the last 7 days and pulls
 * fresh FB Graph insights for each. Upserts the current numbers into
 * marketing_post_stats.
 *
 * Runs against the FB Page identified by env FB_PAGE_ACCESS_TOKEN (page
 * token, same one the n8n workflows use to publish). Page-level insights
 * live at /{post-id}/insights/... — we ask for the metrics that align
 * with the marketing_post_stats columns.
 *
 * FB Graph doesn't return "reach" for text-only feed posts identically,
 * so we ask for the ones that work universally and default missing ones
 * to null. Insights for videos and photos have slightly different metric
 * names — we cover the common ones.
 */

const METRICS = [
  'post_impressions_unique', // reach
  'post_impressions',        // impressions
  'post_clicks',
].join(',');

// Safe per-metric fetch — some metrics are deprecated in FB v19+ per post type
async function tryMetric(postId: string, metric: string, token: string): Promise<number | null> {
  const url = `https://graph.facebook.com/v19.0/${postId}/insights?metric=${metric}&access_token=${token}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const body = await res.json();
  const val = body?.data?.[0]?.values?.[0]?.value;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null) {
    return Object.values(val).reduce((s: number, v: unknown) => s + Number(v ?? 0), 0);
  }
  return null;
}

interface Row {
  id: string;
  external_post_id: string;
  media_type: string;
}

async function fetchInsights(postId: string, token: string) {
  const out: Record<string, number> = {};

  // Post detail — reactions/comments/shares (universal across media types)
  const detailUrl = `https://graph.facebook.com/v19.0/${postId}?fields=reactions.summary(true).limit(0),comments.summary(true).limit(0),shares&access_token=${token}`;
  const dRes = await fetch(detailUrl, { cache: 'no-store' });
  const dBody = await dRes.json();
  if (!dRes.ok) throw new Error(JSON.stringify(dBody?.error ?? dBody));
  out.likes = Number(dBody?.reactions?.summary?.total_count ?? 0);
  out.comments = Number(dBody?.comments?.summary?.total_count ?? 0);
  out.shares = Number(dBody?.shares?.count ?? 0);

  // Insights — try each metric independently (tolerate per-metric failures)
  const [imp, reach, clicks] = await Promise.all([
    tryMetric(postId, 'post_impressions', token),
    tryMetric(postId, 'post_impressions_unique', token),
    tryMetric(postId, 'post_clicks', token),
  ]);
  if (imp !== null) out.impressions = imp;
  if (reach !== null) out.reach = reach;
  if (clicks !== null) out.link_clicks = clicks;

  return out;
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const fbToken = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!fbToken) {
    return NextResponse.json({ error: 'no_fb_token' }, { status: 500 });
  }

  const supabase = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Only recent published posts (7 days) with a real external_post_id
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await supabase
    .from('marketing_posts')
    .select('id, external_post_id, media_type')
    .eq('status', 'published')
    .not('external_post_id', 'is', null)
    .not('external_post_id', 'like', 'test-%')
    .not('external_post_id', 'like', 'LUM-%')
    .gte('published_at', since);

  const list = (rows ?? []) as Row[];
  let updated = 0;
  let failed = 0;

  for (const r of list) {
    try {
      const stats = await fetchInsights(r.external_post_id, fbToken);
      const { error } = await supabase.from('marketing_post_stats').upsert(
        {
          post_id: r.id,
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
      if (error) throw error;
      updated++;
    } catch (e: any) {
      failed++;
      console.warn(
        `[marketing-stats] ${r.external_post_id} failed:`,
        e?.message ?? e
      );
    }
  }

  return NextResponse.json({
    ok: true,
    total: list.length,
    updated,
    failed,
  });
}
