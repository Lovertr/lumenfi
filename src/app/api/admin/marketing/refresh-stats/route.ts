import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSbClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

// Fetch post-level FB insights.
// Strategy: use the post DETAIL endpoint with reactions/comments/shares summaries,
// which works across image + reel + video without version-sensitive metric names.
// Insights endpoint is called SEPARATELY per-metric with try/catch so one bad
// metric name doesn't kill the whole request. FB v19+ changes metric availability
// by post type — this graceful approach is robust to that.

const SAFE_METRICS = [
  'post_impressions',       // total views
  'post_impressions_unique', // reach (falls back if unsupported)
  'post_clicks',            // link clicks
];

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

// Try a single field on the post detail endpoint — returns null if unsupported
async function tryField(postId: string, field: string, token: string): Promise<Record<string, unknown> | null> {
  const url = `https://graph.facebook.com/v19.0/${postId}?fields=${field}&access_token=${token}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const body = await res.json();
  return body as Record<string, unknown>;
}

async function fetchInsights(postId: string, token: string) {
  const out: Record<string, number> = {};

  // Query each engagement field INDEPENDENTLY — different post types support different fields:
  //   - Photos/link posts: reactions, comments, shares
  //   - Reels/videos:      likes (not reactions), comments, no shares
  const [reactionsRes, likesRes, commentsRes, sharesRes] = await Promise.all([
    tryField(postId, 'reactions.summary(true).limit(0)', token),
    tryField(postId, 'likes.summary(true).limit(0)', token),
    tryField(postId, 'comments.summary(true).limit(0)', token),
    tryField(postId, 'shares', token),
  ]);

  // Nothing loaded at all → real permission/ID problem, throw so it counts as failed
  if (!reactionsRes && !likesRes && !commentsRes && !sharesRes) {
    throw new Error('all_fields_unavailable — check FB_PAGE_ACCESS_TOKEN or post ID');
  }

  const reactionsCount = (reactionsRes as { reactions?: { summary?: { total_count?: number } } })?.reactions?.summary?.total_count;
  const likesCount = (likesRes as { likes?: { summary?: { total_count?: number } } })?.likes?.summary?.total_count;
  const commentsCount = (commentsRes as { comments?: { summary?: { total_count?: number } } })?.comments?.summary?.total_count;
  const sharesCount = (sharesRes as { shares?: { count?: number } })?.shares?.count;

  out.likes = Number(reactionsCount ?? likesCount ?? 0);
  out.comments = Number(commentsCount ?? 0);
  out.shares = Number(sharesCount ?? 0);

  // Insights — try each metric individually, tolerate failures
  const results = await Promise.all(SAFE_METRICS.map((m) => tryMetric(postId, m, token)));
  const [imp, reach, clicks] = results;
  if (imp !== null) out.impressions = imp;
  if (reach !== null) out.reach = reach;
  if (clicks !== null) out.link_clicks = clicks;

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
    return NextResponse.json({
      error: 'no_token',
      message: 'FB_PAGE_ACCESS_TOKEN not set in Vercel env. Go to Vercel → Settings → Environment Variables and add it.',
    }, { status: 500 });
  }

  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Diagnostic: count all posts + published posts
  const { count: totalPosts } = await admin
    .from('marketing_posts')
    .select('id', { count: 'exact', head: true });
  const { count: publishedPosts } = await admin
    .from('marketing_posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published');
  const { count: postsWithId } = await admin
    .from('marketing_posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .not('external_post_id', 'is', null);

  const { data: posts } = await admin
    .from('marketing_posts')
    .select('id, external_post_id, media_type')
    .eq('status', 'published')
    .not('external_post_id', 'is', null)
    .not('external_post_id', 'like', 'test-%')  // skip test rows
    .not('external_post_id', 'like', 'LUM-%')   // skip our internal LUM- refs (not real FB IDs)
    .order('published_at', { ascending: false })
    .limit(50);

  let updated = 0;
  const errors: string[] = [];
  const samples: { post_id: string; reach?: number; likes?: number; note?: string }[] = [];

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
      if (samples.length < 3) {
        samples.push({ post_id: p.external_post_id!, reach: stats.reach, likes: stats.likes });
      }
    } catch (e: unknown) {
      errors.push(String(e).slice(0, 300));
    }
  }

  return NextResponse.json({
    ok: true,
    updated,
    diagnostic: {
      total_posts_in_db: totalPosts ?? 0,
      published_posts: publishedPosts ?? 0,
      published_with_fb_id: postsWithId ?? 0,
      attempted: (posts ?? []).length,
      succeeded: updated,
      failed: errors.length,
    },
    samples,
    errors: errors.slice(0, 5),
  });
}
