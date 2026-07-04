import { NextResponse } from 'next/server';
import { createClient as createSbClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Weekly marketing report — Mondays at 09:00 BKK (02:00 UTC).
 *
 * Pulls last 7 days of marketing posts + stats from Supabase, formats a
 * digest (best/worst posts, totals by pillar, engagement rate), sends
 * email to ADMIN_EMAIL via Resend if configured; otherwise logs.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

interface Post {
  id: string;
  message: string;
  media_type: string;
  content_pillar: string | null;
  external_post_id: string | null;
  published_at: string | null;
  status: string;
}

interface Stats {
  post_id: string;
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  link_clicks: number | null;
}

function n(v: number | null | undefined): number {
  return Number(v ?? 0);
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .maybeSingle();
  if (!adminProfile?.id) {
    return NextResponse.json({ error: 'admin_not_found' }, { status: 500 });
  }
  const userId = adminProfile.id as string;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: posts } = await supabase
    .from('marketing_posts')
    .select('id, message, media_type, content_pillar, external_post_id, published_at, status')
    .eq('user_id', userId)
    .gte('scheduled_at', since)
    .order('scheduled_at', { ascending: false });

  const { data: stats } = await supabase
    .from('marketing_post_stats')
    .select('post_id, reach, impressions, likes, comments, shares, link_clicks');

  const list = (posts ?? []) as Post[];
  const statsMap = new Map<string, Stats>();
  for (const s of (stats ?? []) as Stats[]) statsMap.set(s.post_id, s);

  // Aggregates
  const total = list.length;
  const published = list.filter(p => p.status === 'published').length;
  const failed = list.filter(p => p.status === 'failed').length;

  let totalReach = 0, totalLikes = 0, totalComments = 0, totalShares = 0, totalClicks = 0;
  const byPillar: Record<string, { count: number; reach: number; engage: number }> = {};

  for (const p of list) {
    const s = statsMap.get(p.id);
    if (!s) continue;
    totalReach += n(s.reach);
    totalLikes += n(s.likes);
    totalComments += n(s.comments);
    totalShares += n(s.shares);
    totalClicks += n(s.link_clicks);
    const pillar = p.content_pillar ?? 'unknown';
    byPillar[pillar] = byPillar[pillar] || { count: 0, reach: 0, engage: 0 };
    byPillar[pillar].count++;
    byPillar[pillar].reach += n(s.reach);
    byPillar[pillar].engage += n(s.likes) + n(s.comments) + n(s.shares);
  }

  const totalEngagement = totalLikes + totalComments + totalShares;
  const engagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

  // Best 3 posts by engagement
  const scored = list
    .map(p => {
      const s = statsMap.get(p.id);
      const engage = n(s?.likes) + n(s?.comments) + n(s?.shares);
      return { post: p, stats: s, engage };
    })
    .sort((a, b) => b.engage - a.engage);
  const best = scored.slice(0, 3);

  // Build report text
  const lines: string[] = [];
  lines.push(`📊 Lumenfi — Weekly Marketing Report`);
  lines.push(`Period: ${since.slice(0,10)} → ${new Date().toISOString().slice(0,10)}`);
  lines.push('');
  lines.push(`## Overall`);
  lines.push(`- Posts: ${total} (published: ${published}, failed: ${failed})`);
  lines.push(`- Reach: ${totalReach.toLocaleString()}`);
  lines.push(`- Likes: ${totalLikes.toLocaleString()}`);
  lines.push(`- Comments: ${totalComments.toLocaleString()}`);
  lines.push(`- Shares: ${totalShares.toLocaleString()}`);
  lines.push(`- Link clicks: ${totalClicks.toLocaleString()}`);
  lines.push(`- Engagement rate: ${engagementRate.toFixed(2)}%`);
  lines.push('');

  lines.push(`## By Pillar`);
  for (const [pillar, data] of Object.entries(byPillar).sort((a, b) => b[1].engage - a[1].engage)) {
    const er = data.reach > 0 ? (data.engage / data.reach * 100).toFixed(1) : '0';
    lines.push(`- ${pillar}: ${data.count} posts, reach ${data.reach.toLocaleString()}, engagement ${data.engage.toLocaleString()} (${er}% ER)`);
  }
  lines.push('');

  lines.push(`## Top 3 Posts`);
  best.forEach((b, i) => {
    const preview = (b.post.message ?? '').slice(0, 80).replace(/\n/g, ' ');
    lines.push(`${i+1}. [${b.post.content_pillar}] ${preview}...`);
    lines.push(`   Engagement: ${b.engage}, Reach: ${n(b.stats?.reach).toLocaleString()}, Clicks: ${n(b.stats?.link_clicks).toLocaleString()}`);
    if (b.post.external_post_id) {
      lines.push(`   https://facebook.com/${b.post.external_post_id}`);
    }
  });
  lines.push('');

  lines.push(`## Recommendations`);
  const topPillar = Object.entries(byPillar).sort((a, b) => b[1].engage - a[1].engage)[0];
  if (topPillar) lines.push(`- 🎯 Winning pillar this week: ${topPillar[0]} — เพิ่มความถี่ pillar นี้`);
  if (engagementRate < 3) lines.push(`- ⚠️ Engagement rate ต่ำ (<3%) — ปรับ hook + image style`);
  if (failed > 0) lines.push(`- 🔧 ${failed} posts ล้ม — เช็ค token/quota`);
  if (totalClicks < 10) lines.push(`- 🔗 Link clicks น้อย — ปรับ CTA ใน comment ให้ชัดขึ้น`);

  const report = lines.join('\n');

  // Send via Resend if configured
  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.RESEND_FROM ?? 'noreply@lumenfi.projectostech.com';
  if (resendKey && ADMIN_EMAIL) {
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [ADMIN_EMAIL],
          subject: `📊 Lumenfi Weekly Report — ${totalReach.toLocaleString()} reach, ${engagementRate.toFixed(1)}% ER`,
          text: report,
        }),
      });
      if (!emailRes.ok) {
        console.warn('[weekly-report] resend failed:', await emailRes.text());
      }
    } catch (e) {
      console.warn('[weekly-report] resend error:', e);
    }
  } else {
    console.log('[weekly-report] no RESEND_API_KEY, printing report:');
    console.log(report);
  }

  return NextResponse.json({
    ok: true,
    total,
    published,
    failed,
    totalReach,
    engagementRate: engagementRate.toFixed(2),
    report,
  });
}
