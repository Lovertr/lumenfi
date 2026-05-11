import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, TrendingUp, Target, Clock, Trophy, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  new: { label: 'ใหม่', color: 'text-blue-700 bg-blue-50' },
  contacted: { label: 'ติดต่อแล้ว', color: 'text-amber-700 bg-amber-50' },
  meeting: { label: 'นัดหมาย', color: 'text-violet-700 bg-violet-50' },
  won: { label: 'ปิดได้', color: 'text-emerald-700 bg-emerald-50' },
  lost: { label: 'ไม่ปิด', color: 'text-slate-600 bg-slate-100' },
};

export default async function AgentAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = searchParams ? await searchParams : {};
  const range = (sp.range as '30d' | '90d' | '365d' | 'all') ?? '90d';

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!agent) redirect('/agents/signup');

  // Subscription tier check
  const { data: sub } = await supabase
    .from('agent_subscriptions')
    .select('plan, status')
    .eq('agent_id', (agent as any).id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const plan = (sub as any)?.plan ?? 'trial';
  const hasAnalytics = ['pro', 'team', 'founder', 'starter'].includes(plan);

  // Date range
  const daysAgo = range === '30d' ? 30 : range === '90d' ? 90 : range === '365d' ? 365 : 365 * 10;
  const since = new Date(Date.now() - daysAgo * 86400000).toISOString();

  // Pull leads in range
  const { data: leads } = await supabase
    .from('insurance_leads')
    .select('id, status, type, preferred_carrier, estimated_sum_insured, created_at')
    .eq('agent_id', (agent as any).id)
    .gte('created_at', since);

  const allLeads = (leads ?? []) as any[];
  const total = allLeads.length;
  const byStatus: Record<string, number> = {};
  for (const l of allLeads) {
    byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
  }
  const won = byStatus.won ?? 0;
  const lost = byStatus.lost ?? 0;
  const inFlight = total - won - lost;
  const conversionRate = total > 0 ? (won / total) * 100 : 0;

  // By type
  const byType: Record<string, { total: number; won: number }> = {};
  for (const l of allLeads) {
    const t = l.type || 'unknown';
    byType[t] = byType[t] ?? { total: 0, won: 0 };
    byType[t].total++;
    if (l.status === 'won') byType[t].won++;
  }
  const typeRows = Object.entries(byType)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  // Total sum insured (potential)
  const potentialAUM = allLeads.reduce(
    (s, l) => s + Number(l.estimated_sum_insured ?? 0),
    0
  );
  const wonAUM = allLeads
    .filter((l) => l.status === 'won')
    .reduce((s, l) => s + Number(l.estimated_sum_insured ?? 0), 0);

  // Activity heatmap — leads per day
  const byDay: Record<string, number> = {};
  for (const l of allLeads) {
    const d = l.created_at.slice(0, 10);
    byDay[d] = (byDay[d] ?? 0) + 1;
  }
  const recentDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    return { date: d, count: byDay[d] ?? 0 };
  }).reverse();
  const maxDay = Math.max(1, ...recentDays.map((d) => d.count));

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/agents/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">📈 Analytics</h1>
          <p className="text-xs text-muted-foreground">ดู conversion rate · trend · best product</p>
        </div>
      </header>

      {!hasAnalytics && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-700">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            ฟีเจอร์นี้สำหรับแพ็คเกจ Starter ขึ้นไป — <Link href="/agents/pricing" className="font-semibold underline">อัพเกรด</Link>
          </CardContent>
        </Card>
      )}

      {/* Range selector */}
      <div className="flex gap-1.5 overflow-x-auto">
        {([
          { id: '30d', label: '30 วัน' },
          { id: '90d', label: '90 วัน' },
          { id: '365d', label: '1 ปี' },
          { id: 'all', label: 'ทั้งหมด' },
        ] as const).map((r) => (
          <Link
            key={r.id}
            href={`?range=${r.id}`}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              range === r.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background hover:bg-muted/40'
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground">Leads ทั้งหมด</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-emerald-600" />
              <p className="text-[10px] text-muted-foreground">ปิดได้</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{won}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] text-muted-foreground">Conversion</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{conversionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <p className="text-[10px] text-muted-foreground">ยังไม่ปิด</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{inFlight}</p>
          </CardContent>
        </Card>
      </div>

      {/* AUM / sum insured */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold">💰 ทุนรวม</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground">ขอใบเสนอรวม (potential)</p>
              <p className="mt-1 text-xl font-bold">฿{potentialAUM.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">ที่ปิดได้แล้ว</p>
              <p className="mt-1 text-xl font-bold text-emerald-700">฿{wonAUM.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status breakdown */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold">📊 สถานะ leads</p>
          <div className="mt-3 space-y-2">
            {(['new', 'contacted', 'meeting', 'won', 'lost'] as const).map((s) => {
              const count = byStatus[s] ?? 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              const meta = STATUS_LABEL[s];
              return (
                <div key={s}>
                  <div className="flex items-center justify-between text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs font-medium">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Best types */}
      {typeRows.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-semibold">🏆 ประเภทที่ปิดดีที่สุด</p>
            <div className="mt-3 space-y-2">
              {typeRows.map(([type, stats]) => {
                const winRate = stats.total > 0 ? (stats.won / stats.total) * 100 : 0;
                return (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{type}</span>
                    <span className="text-xs text-muted-foreground">
                      {stats.won}/{stats.total} ปิด · <strong className="text-emerald-700">{winRate.toFixed(0)}%</strong>
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity heatmap */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold">📅 Lead รายวัน (14 วันล่าสุด)</p>
          <div className="mt-3 flex items-end gap-1">
            {recentDays.map((d) => {
              const h = d.count > 0 ? Math.max(8, (d.count / maxDay) * 60) : 4;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-sm ${d.count > 0 ? 'bg-primary' : 'bg-muted'}`}
                    style={{ height: `${h}px` }}
                    title={`${d.date}: ${d.count} leads`}
                  />
                  <span className="text-[8px] text-muted-foreground">{d.date.slice(8, 10)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {total === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium">ยังไม่มี leads ในช่วงนี้</p>
            <p className="mt-1 text-xs text-muted-foreground">
              แชร์ invite link ของคุณเพิ่มเติม
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
