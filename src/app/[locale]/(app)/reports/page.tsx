import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import {
  ArrowLeft, FileBarChart, Sparkles, TrendingUp, TrendingDown, ChevronRight,
  Star, AlertTriangle, AlertCircle, CheckCircle2, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { LogoutButton } from '@/components/auth/logout-button';
import { formatTHB } from '@/lib/utils';
import { getComprehensiveReport, type DimensionAnalysis, type Severity, type Recommendation } from '@/lib/queries/comprehensive-report';

export const dynamic = 'force-dynamic';

const SEVERITY_CLASSES: Record<Severity, { bg: string; text: string; border: string; ring: string }> = {
  good: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300/50', ring: 'ring-emerald-400/30' },
  ok: { bg: 'bg-sky-50 dark:bg-sky-950/20', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-300/50', ring: 'ring-sky-400/30' },
  warn: { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300/50', ring: 'ring-amber-400/30' },
  critical: { bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300/50', ring: 'ring-rose-400/30' },
};

const PRIORITY_LABEL: Record<string, { text: string; color: string }> = {
  high: { text: 'ด่วน', color: 'bg-rose-500/15 text-rose-700' },
  medium: { text: 'ควรทำ', color: 'bg-amber-500/15 text-amber-700' },
  low: { text: 'พิจารณา', color: 'bg-sky-500/15 text-sky-700' },
};

function MetricChip({ label, value, severity, benchmark }: { label: string; value: string; severity: Severity; benchmark?: string }) {
  const cls = SEVERITY_CLASSES[severity];
  return (
    <div className={`rounded-lg border ${cls.border} ${cls.bg} p-3`}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-base font-bold ${cls.text}`}>{value}</p>
      {benchmark && <p className="mt-0.5 text-[10px] text-muted-foreground">{benchmark}</p>}
    </div>
  );
}

function DimensionCard({ d }: { d: DimensionAnalysis }) {
  const cls = SEVERITY_CLASSES[d.severity];
  const SeverityIcon = d.severity === 'good' ? CheckCircle2 : d.severity === 'critical' ? AlertCircle : AlertTriangle;
  return (
    <Card className={`${cls.border}`}>
      <CardContent className="p-4 lg:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${cls.bg}`}>{d.icon}</div>
            <div>
              <h3 className="text-sm font-bold">{d.title}</h3>
              <p className="text-[11px] text-muted-foreground">{d.summary}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${cls.bg} ${cls.text}`}>
              <SeverityIcon className="h-3 w-3" />
              {d.score}/100
            </div>
          </div>
        </div>

        {d.metrics.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {d.metrics.map((m, i) => (
              <MetricChip key={i} {...m} />
            ))}
          </div>
        )}

        {d.recommendations.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">คำแนะนำ</p>
            {d.recommendations.map((r, i) => {
              const inner = (
                <>
                  <span className="text-base">{r.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold">{r.title}</p>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${PRIORITY_LABEL[r.priority].color}`}>
                        {PRIORITY_LABEL[r.priority].text}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{r.body}</p>
                  </div>
                  {r.url && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </>
              );
              const className = `flex items-start gap-2 rounded-lg border bg-background p-2.5 transition-colors ${
                r.url ? 'cursor-pointer hover:border-primary/40 hover:bg-primary/5' : ''
              }`;
              return r.url ? (
                <Link key={i} href={r.url} className={className}>{inner}</Link>
              ) : (
                <div key={i} className={className}>{inner}</div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const report = await getComprehensiveReport();

  if (!report) {
    return (
      <div className="mx-auto max-w-md p-4 pt-10 text-center">
        <p>กรุณา login เพื่อดูรายงาน</p>
      </div>
    );
  }

  const overallCls = SEVERITY_CLASSES[
    report.overallScore >= 80 ? 'good' : report.overallScore >= 60 ? 'ok' : report.overallScore >= 40 ? 'warn' : 'critical'
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <FileBarChart className="h-5 w-5 text-primary" />
              รายงานสุขภาพการเงิน
            </h1>
            <p className="text-xs text-muted-foreground">
              วิเคราะห์ครบ 8 มิติ + คำแนะนำ · {new Date(report.generatedAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild size="sm" variant="outline">
            <Link href="/advisor">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              ขอ AI วิเคราะห์ลึก
            </Link>
          </Button>
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      {/* Overall hero */}
      <Card className={`overflow-hidden ${overallCls.border}`}>
        <CardContent className="p-5 lg:p-7">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Score */}
            <div className="text-center lg:text-left">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">คะแนนรวม</p>
              <div className="mt-1 flex items-baseline gap-2 justify-center lg:justify-start">
                <span className={`text-5xl font-black ${overallCls.text}`}>{report.overallScore}</span>
                <span className="text-2xl font-bold text-muted-foreground">/ 100</span>
                <span className={`rounded-full px-2 py-0.5 text-sm font-bold ${overallCls.bg} ${overallCls.text}`}>
                  {report.overallGrade}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {report.overallScore >= 80 ? '🎉 สุขภาพการเงินดีเยี่ยม' :
                 report.overallScore >= 60 ? 'พอใช้ — มีจุดให้ปรับ' :
                 report.overallScore >= 40 ? '⚠️ ต้องปรับปรุงหลายจุด' :
                 '🚨 ต้องเร่งแก้ด่วน'}
              </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 lg:col-span-2">
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-[10px] text-muted-foreground">Net Worth</p>
                <p className="mt-0.5 text-xl font-bold">{formatTHB(report.netWorth)}</p>
                {report.netWorthChange !== 0 && (
                  <p className={`mt-0.5 flex items-center gap-1 text-[11px] ${report.netWorthChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {report.netWorthChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {report.netWorthChange >= 0 ? '+' : ''}{formatTHB(Math.abs(report.netWorthChange))} ({report.netWorthChangePct.toFixed(1)}%) · 30 วัน
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-[10px] text-muted-foreground">รายรับ - รายจ่าย เดือนนี้</p>
                <p className={`mt-0.5 text-xl font-bold ${report.monthBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {report.monthBalance >= 0 ? '+' : ''}{formatTHB(report.monthBalance)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Savings rate: {(report.savingsRate * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top recommendations */}
      {report.topRecommendations.length > 0 && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold">5 ข้อที่ควรทำเลย</h2>
            </div>
            <div className="space-y-2">
              {report.topRecommendations.slice(0, 5).map((r, i) => {
                const inner = (
                  <>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-base">{r.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold">{r.title}</p>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${PRIORITY_LABEL[r.priority].color}`}>
                          {PRIORITY_LABEL[r.priority].text}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{r.body}</p>
                    </div>
                    {r.url && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  </>
                );
                const className = 'flex items-start gap-2 rounded-lg border bg-background p-3 transition-colors hover:border-primary/40';
                return r.url ? (
                  <Link key={i} href={r.url} className={className}>{inner}</Link>
                ) : (
                  <div key={i} className={className}>{inner}</div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 8 dimensions */}
      <div className="grid gap-3 lg:grid-cols-2">
        <DimensionCard d={report.cashflow} />
        <DimensionCard d={report.emergency} />
        <DimensionCard d={report.debt} />
        <DimensionCard d={report.savings} />
        <DimensionCard d={report.investments} />
        <DimensionCard d={report.tax} />
        <DimensionCard d={report.insurance} />
      </div>

      {/* CTA: AI Advisor */}
      <Card className="border-dashed bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">ต้องการคำแนะนำลึกกว่านี้?</p>
            <p className="text-[11px] text-muted-foreground">
              AI Advisor วิเคราะห์ข้อมูลเฉพาะของคุณ + แผน 30/60/90 วัน
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/advisor">
              ขอ AI วิเคราะห์
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
