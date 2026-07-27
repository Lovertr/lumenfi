import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Activity, Users, Eye, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { createClient as createSb } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

// Funnel stages ordered
const FUNNEL_STEPS = [
  { key: 'page_view', label: '📥 Landing (any page view)', color: 'text-slate-600' },
  { key: 'signup_start', label: '✏️ Signup started', color: 'text-blue-600' },
  { key: 'signup_success', label: '✅ Signup completed', color: 'text-emerald-600' },
  { key: 'pricing_view', label: '💳 Pricing page viewed', color: 'text-amber-600' },
  { key: 'checkout_start', label: '🛒 Checkout started', color: 'text-orange-600' },
  { key: 'slip_uploaded', label: '📤 Slip uploaded', color: 'text-purple-600' },
  { key: 'checkout_paid', label: '💰 Pro activated', color: 'text-green-700' },
];

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) notFound();

  const admin = createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const now = Date.now();
  const day = 24 * 3600 * 1000;
  const sevenAgo = new Date(now - 7 * day).toISOString();
  const thirtyAgo = new Date(now - 30 * day).toISOString();

  // Funnel counts — 7 days
  const funnelCounts: Record<string, number> = {};
  for (const step of FUNNEL_STEPS) {
    const { count } = await admin
      .from('site_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_name', step.key)
      .gte('created_at', sevenAgo);
    funnelCounts[step.key] = count ?? 0;
  }

  // Top pages by view count — 7 days
  const { data: topPagesRaw } = await admin
    .from('site_events')
    .select('path')
    .eq('event_name', 'page_view')
    .gte('created_at', sevenAgo)
    .limit(5000);
  const pathCounts = new Map<string, number>();
  for (const r of topPagesRaw ?? []) {
    const p = (r as { path?: string }).path ?? '(unknown)';
    pathCounts.set(p, (pathCounts.get(p) ?? 0) + 1);
  }
  const topPages = Array.from(pathCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // UTM source breakdown
  const { data: utmData } = await admin
    .from('site_events')
    .select('utm_source, utm_campaign')
    .not('utm_source', 'is', null)
    .gte('created_at', sevenAgo)
    .limit(5000);
  const utmMap = new Map<string, number>();
  for (const r of utmData ?? []) {
    const s = (r as { utm_source?: string }).utm_source ?? '(direct)';
    utmMap.set(s, (utmMap.get(s) ?? 0) + 1);
  }
  const utmSources = Array.from(utmMap.entries()).sort((a, b) => b[1] - a[1]);

  // FB Page stats latest
  const { data: fbStats } = await admin
    .from('fb_page_stats')
    .select('page_fans, page_impressions, page_engaged_users, page_new_fans, fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const firstStep = funnelCounts[FUNNEL_STEPS[0].key] || 1;

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
            <Activity className="h-5 w-5 text-primary" />
            User Analytics
          </h1>
          <p className="text-xs text-muted-foreground">Funnel / drop-off / traffic — ล่าสุด 7 วัน</p>
        </div>
      </header>

      {/* Funnel */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <TrendingDown className="h-4 w-4" /> Conversion Funnel (7 วัน)
          </h2>
          <div className="space-y-2">
            {FUNNEL_STEPS.map((step, i) => {
              const count = funnelCounts[step.key] ?? 0;
              const pct = firstStep > 0 ? (count / firstStep) * 100 : 0;
              const prevCount = i > 0 ? (funnelCounts[FUNNEL_STEPS[i - 1].key] ?? 0) : firstStep;
              const stepPct = prevCount > 0 ? (count / prevCount) * 100 : 0;
              const dropPct = 100 - stepPct;
              return (
                <div key={step.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={step.color}>{step.label}</span>
                    <span className="font-semibold">{count.toLocaleString()}</span>
                  </div>
                  <div className="flex h-6 items-center gap-2 text-[10px]">
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className="w-14 text-right text-muted-foreground">
                      {pct.toFixed(1)}% overall
                    </span>
                    {i > 0 && (
                      <span
                        className={
                          'w-24 text-right ' + (dropPct > 50 ? 'text-red-600 font-semibold' : 'text-muted-foreground')
                        }
                      >
                        drop {dropPct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            💡 ที่ step ไหน drop &gt; 50% = จุดที่คน scroll ออก → optimize หน้านั้นก่อน
          </p>
        </CardContent>
      </Card>

      {/* FB Page stats */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> Page Followers (FB)
            </div>
            <p className="mt-1 text-2xl font-bold">
              {fbStats?.page_fans?.toLocaleString() ?? 'ยังไม่มีข้อมูล'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              +{fbStats?.page_new_fans?.toLocaleString() ?? 0} วันนี้
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Eye className="h-3 w-3" /> Page Impressions (7d)
            </div>
            <p className="mt-1 text-2xl font-bold">
              {fbStats?.page_impressions?.toLocaleString() ?? '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" /> Engaged Users (7d)
            </div>
            <p className="mt-1 text-2xl font-bold">
              {fbStats?.page_engaged_users?.toLocaleString() ?? '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top pages */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">📊 Top pages viewed (7 วัน)</h2>
          {topPages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              ยังไม่มีข้อมูล — tracker เพิ่ง deploy รอ user เข้าเว็บ
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="pb-1.5 text-left">Path</th>
                  <th className="pb-1.5 text-right">Views</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map(([path, n]) => (
                  <tr key={path} className="border-b last:border-0">
                    <td className="py-1.5 font-mono text-xs">{path}</td>
                    <td className="py-1.5 text-right font-semibold">{n.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* UTM sources */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">🔗 Traffic sources (UTM — 7 วัน)</h2>
          {utmSources.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              ยังไม่มี UTM data — post FB มี ?utm_source=facebook อยู่แล้ว รอ visit
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="pb-1.5 text-left">Source</th>
                  <th className="pb-1.5 text-right">Visits</th>
                </tr>
              </thead>
              <tbody>
                {utmSources.map(([src, n]) => (
                  <tr key={src} className="border-b last:border-0">
                    <td className="py-1.5">{src}</td>
                    <td className="py-1.5 text-right font-semibold">{n.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
