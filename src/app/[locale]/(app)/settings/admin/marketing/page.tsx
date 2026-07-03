import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, ExternalLink, BarChart3, Eye, ThumbsUp, MessageCircle, Share2, MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

interface PostRow {
  id: string;
  platform: string;
  message: string;
  media_type: string;
  media_urls: string[] | null;
  content_pillar: string | null;
  hashtags: string[] | null;
  external_post_id: string | null;
  scheduled_at: string;
  published_at: string | null;
  status: string;
  ai_generated: boolean;
  error: string | null;
  created_at: string;
}

interface StatsRow {
  post_id: string;
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  link_clicks: number | null;
  fetched_at: string;
}

const PILLAR_LABEL: Record<string, { th: string; emoji: string; color: string }> = {
  education: { th: 'Education', emoji: '💡', color: 'bg-amber-100 text-amber-800' },
  use_case: { th: 'Use case', emoji: '🎯', color: 'bg-blue-100 text-blue-800' },
  demo: { th: 'Product demo', emoji: '🎬', color: 'bg-purple-100 text-purple-800' },
  engagement: { th: 'Engagement', emoji: '💬', color: 'bg-green-100 text-green-800' },
  promo: { th: 'Promo', emoji: '🎁', color: 'bg-rose-100 text-rose-800' },
  launch: { th: 'Launch', emoji: '🚀', color: 'bg-indigo-100 text-indigo-800' },
};

const STATUS_LABEL: Record<string, { th: string; color: string }> = {
  draft: { th: 'ร่าง', color: 'bg-gray-100 text-gray-700' },
  scheduled: { th: 'รอโพส', color: 'bg-yellow-100 text-yellow-800' },
  publishing: { th: 'กำลังโพส', color: 'bg-orange-100 text-orange-800' },
  published: { th: 'โพสแล้ว', color: 'bg-emerald-100 text-emerald-800' },
  failed: { th: 'ล้มเหลว', color: 'bg-red-100 text-red-800' },
  cancelled: { th: 'ยกเลิก', color: 'bg-gray-200 text-gray-600' },
};

export default async function MarketingAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) notFound();

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [postsRes, statsRes] = await Promise.all([
    supabase
      .from('marketing_posts')
      .select('id, platform, message, media_type, media_urls, content_pillar, hashtags, external_post_id, scheduled_at, published_at, status, ai_generated, error, created_at')
      .eq('user_id', user.id)
      .gte('scheduled_at', since)
      .order('scheduled_at', { ascending: false })
      .limit(100),
    supabase
      .from('marketing_post_stats')
      .select('post_id, reach, impressions, likes, comments, shares, link_clicks, fetched_at'),
  ]);

  const posts = (postsRes.data ?? []) as PostRow[];
  const statsMap = new Map<string, StatsRow>();
  for (const s of (statsRes.data ?? []) as StatsRow[]) statsMap.set(s.post_id, s);

  // Aggregate 7-day metrics
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let totalPosts = 0;
  let totalReach = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalClicks = 0;
  for (const p of posts) {
    if (p.status !== 'published' || (p.published_at ?? p.scheduled_at) < weekAgo) continue;
    totalPosts++;
    const s = statsMap.get(p.id);
    if (s) {
      totalReach += Number(s.reach ?? 0);
      totalLikes += Number(s.likes ?? 0);
      totalComments += Number(s.comments ?? 0);
      totalClicks += Number(s.link_clicks ?? 0);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/settings/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Marketing · Auto-post
          </h1>
          <p className="text-xs text-muted-foreground">n8n workflows publish → Lumenfi logs + stats</p>
        </div>
      </header>

      {/* 7-day summary */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <SummaryTile label="โพสต์" value={totalPosts} icon="📝" hint="7 วันที่ผ่านมา" />
        <SummaryTile label="Reach" value={totalReach} icon="👁" />
        <SummaryTile label="Likes" value={totalLikes} icon="👍" />
        <SummaryTile label="Comments" value={totalComments} icon="💬" />
        <SummaryTile label="Link clicks" value={totalClicks} icon="🔗" />
      </div>

      {/* Posts table */}
      <Card>
        <CardContent className="p-0">
          {posts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              ยังไม่มีโพส · เมื่อ n8n webhook เข้ามาแล้วจะเห็นที่นี่
            </div>
          ) : (
            <ul className="divide-y">
              {posts.map((p) => {
                const s = statsMap.get(p.id);
                const pillar = p.content_pillar ? PILLAR_LABEL[p.content_pillar] : null;
                const status = STATUS_LABEL[p.status] ?? { th: p.status, color: 'bg-gray-100 text-gray-700' };
                const when = new Date(p.published_at ?? p.scheduled_at);
                return (
                  <li key={p.id} className="p-4 space-y-2 hover:bg-muted/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className={`rounded px-1.5 py-0.5 font-semibold ${status.color}`}>{status.th}</span>
                          {pillar && (
                            <span className={`rounded px-1.5 py-0.5 font-semibold ${pillar.color}`}>
                              {pillar.emoji} {pillar.th}
                            </span>
                          )}
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                            {p.media_type}
                          </span>
                          {p.ai_generated && (
                            <span className="rounded bg-violet-100 px-1.5 py-0.5 font-medium text-violet-800">🤖 AI</span>
                          )}
                        </div>
                        <p className="mt-1.5 line-clamp-3 text-sm">{p.message}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {when.toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {p.external_post_id && (
                        <a
                          href={`https://facebook.com/${p.external_post_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded p-1.5 hover:bg-muted"
                          title="เปิดบน Facebook"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>

                    {s && (
                      <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-muted-foreground">
                        <Metric icon={<Eye className="h-3 w-3" />} value={s.reach} label="reach" />
                        <Metric icon={<ThumbsUp className="h-3 w-3" />} value={s.likes} label="likes" />
                        <Metric icon={<MessageCircle className="h-3 w-3" />} value={s.comments} label="comments" />
                        <Metric icon={<Share2 className="h-3 w-3" />} value={s.shares} label="shares" />
                        <Metric icon={<MousePointerClick className="h-3 w-3" />} value={s.link_clicks} label="clicks" />
                      </div>
                    )}

                    {p.error && (
                      <p className="text-[11px] text-red-700">⚠️ {p.error}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({ label, value, icon, hint }: { label: string; value: number; icon: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-xl font-bold">
          <span className="mr-1 text-sm">{icon}</span>
          {value.toLocaleString('th-TH')}
        </p>
        {hint && <p className="mt-0.5 text-[9px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: number | null; label: string }) {
  return (
    <span className="flex items-center gap-1">
      {icon}
      <span className="font-semibold">{value == null ? '—' : value.toLocaleString('th-TH')}</span>
      <span>{label}</span>
    </span>
  );
}
