import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { LogoutButton } from '@/components/auth/logout-button';
import { NotificationBellServer } from '@/components/notifications/notification-bell-server';
import { formatTHB } from '@/lib/utils';
import { getDashboardData, getDashboardDataForCycle } from '@/lib/queries/dashboard';
import { getCurrentCycle } from '@/lib/pay-cycle';
import { ExpensePieChart } from '@/components/dashboard/expense-pie-chart';
import { CycleToggle } from '@/components/dashboard/cycle-toggle';
import { materializeDueRecurring } from '@/lib/recurring';
import { DashboardQuickActions } from '@/components/dashboard/dashboard-quick-actions';
import { IncomeExpenseChart } from '@/components/dashboard/income-expense-chart';
import { GoalProgressCard } from '@/components/dashboard/goal-progress-card';
import { NetWorthMini } from '@/components/dashboard/net-worth-mini';
import { AdvisorEntry } from '@/components/dashboard/advisor-entry';
import { WhatsNewBanner } from '@/components/dashboard/whats-new-banner';
import { SpotlightCard } from '@/components/dashboard/spotlight-card';
import { FeatureTour } from '@/components/dashboard/feature-tour';
import { ProfileCompletenessCard } from '@/components/dashboard/profile-completeness-card';
import { getUnseenVersion } from '@/lib/queries/versions';
import { getSpotlight } from '@/lib/queries/feature-spotlight';
import { createClient } from '@/lib/supabase/server';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Sparkles,
  ArrowRight,
  Wallet,
  CreditCard,
  Activity,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function HealthBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-success/15 text-success'
      : score >= 60
        ? 'bg-warning/15 text-warning'
        : 'bg-destructive/15 text-destructive';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      <Sparkles className="h-3 w-3" />
      {score}/100
    </span>
  );
}

export default async function DashboardPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = searchParams ? await searchParams : {};
  const cycleMode = sp.cycle === 'calendar' ? 'calendar' : 'pay';
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Dashboard');

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const greeting = user?.user_metadata?.full_name?.split(' ')[0] ?? '';

  // Onboarding gate — only show wizard for genuinely new users (no data yet)
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded')
      .eq('id', user.id)
      .maybeSingle();
    if (profile && profile.onboarded === false) {
      // Check if user already has data — if so, auto-mark onboarded
      const { count: accountCount } = await supabase
        .from('accounts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if ((accountCount ?? 0) > 0) {
        await supabase.from('profiles').update({ onboarded: true }).eq('id', user.id);
      } else {
        const { redirect } = await import('next/navigation');
        redirect(`/${locale}/onboarding`);
      }
    }
  }

  await materializeDueRecurring();

  // Take net worth snapshot (idempotent — upserts today's row) + fetch history for chart
  let nwHistory: Array<{ date: string; total_assets: number; total_liabilities: number; net_worth: number }> = [];
  let lastAdvisorReport: { domain: string; created_at: string; title: string } | null = null;
  if (user) {
    try {
      const mod = await import('@/lib/queries/net-worth-snapshot');
      await mod.snapshotTodayForUser(user.id);
      nwHistory = (await mod.getNetWorthHistory(user.id, 365)) as typeof nwHistory;
    } catch (e) {
      console.warn('Net worth snapshot failed:', e);
    }
    try {
      const { data: r } = await supabase
        .from('advisor_reports')
        .select('domain, created_at, title')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (r) lastAdvisorReport = r as any;
    } catch {}
  }

  const unseenVersion = await getUnseenVersion().catch(() => null);
  const spotlight = await getSpotlight().catch(() => null);

  // Compute profile completeness — surface a reminder if low
  let profilePercent = 100;
  if (user) {
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('occupation, employment_type, risk_tolerance, financial_goal_summary, income_salary_monthly, expense_food_monthly, expense_housing_monthly, monthly_income, monthly_expense_estimate, pay_cycle_day')
        .eq('id', user.id)
        .maybeSingle();
      if (prof) {
        const fields = [
          prof.occupation, prof.employment_type, prof.risk_tolerance, prof.financial_goal_summary,
          prof.income_salary_monthly, prof.expense_food_monthly, prof.expense_housing_monthly,
          prof.monthly_income, prof.monthly_expense_estimate,
        ];
        const filled = fields.filter((f) => f !== null && f !== undefined && f !== '').length;
        profilePercent = Math.round((filled / fields.length) * 100);
      }
    } catch {}
  }
  const showProfileReminder = profilePercent < 50;

  // Pay cycle: if user set pay_cycle_day, use that; otherwise calendar month
  let payCycleDay: number | null = null;
  if (user) {
    try {
      const { data: prof2 } = await supabase
        .from('profiles')
        .select('pay_cycle_day')
        .eq('id', user.id)
        .maybeSingle();
      payCycleDay = (prof2 as any)?.pay_cycle_day ?? null;
    } catch {}
  }
  // If user toggled to 'calendar' view, ignore payCycleDay
  const cycle = getCurrentCycle(cycleMode === 'calendar' ? null : payCycleDay);
  const data = await getDashboardDataForCycle(cycle.startDate, cycle.endDate);

  return (
    <div className="space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {t('greeting')} {greeting}
          </p>
          <h1 className="text-xl font-bold lg:text-2xl">{t('subtitle')}</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-[11px] text-muted-foreground">
              📊 {cycle.label} · {cycle.rangeLabel}
            </p>
            <CycleToggle
              hasPayCycleDay={payCycleDay != null}
              currentMode={cycleMode}
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5 lg:hidden">
          <HealthBadge score={data.healthScore} />
          <NotificationBellServer />
          <LanguageSwitcher />
          <LogoutButton />
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <HealthBadge score={data.healthScore} />
          <NotificationBellServer />
        </div>
      </header>

      {/* Discovery row: Spotlight + Feature Tour */}
      <div className="grid gap-3 lg:grid-cols-2">
        {spotlight ? (
          <SpotlightCard
            id={spotlight.id}
            icon={spotlight.icon}
            title={spotlight.title}
            description={spotlight.description}
            url={spotlight.url}
            cta={spotlight.cta}
          />
        ) : (
          <div className="hidden lg:block" />
        )}
        <FeatureTour />
      </div>

      {showProfileReminder && (
        <ProfileCompletenessCard percent={profilePercent} />
      )}

      {unseenVersion && (
        <WhatsNewBanner
          version={unseenVersion.version}
          title={unseenVersion.title}
          isMajor={unseenVersion.is_major}
          highlightCount={unseenVersion.highlights?.length ?? 0}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden bg-gradient-to-br from-[#0A0F1F] to-[#1E293B] text-white lg:col-span-2">
          <CardContent className="p-6 lg:p-8">
            <div className="flex items-center justify-between">
              <p className="text-sm opacity-90">เงินใช้ได้ตอนนี้</p>
              <Link href="/networth" className="text-[11px] opacity-70 hover:opacity-100 transition-opacity">
                ฐานะการเงินรวม →
              </Link>
            </div>
            <p className="mt-1 text-3xl font-bold lg:text-5xl">
              {formatTHB(data.availableCash)}
            </p>
            <p className="mt-1 text-xs opacity-70">
              ยอดรวมในบัญชี cash + ธนาคาร + ออมทรัพย์ + e-Wallet
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3 text-xs lg:gap-6 lg:text-sm">
              <div>
                <p className="opacity-70">รายรับ{cycle.isPayCycle ? 'งวดนี้' : 'เดือนนี้'}</p>
                <p className="mt-0.5 font-semibold text-[#10B981] lg:text-lg">+{formatTHB(data.monthIncome)}</p>
              </div>
              <div>
                <p className="opacity-70">รายจ่าย{cycle.isPayCycle ? 'งวดนี้' : 'เดือนนี้'}</p>
                <p className="mt-0.5 font-semibold text-[#FCA5A5] lg:text-lg">-{formatTHB(data.monthExpense)}</p>
              </div>
              <div>
                <p className="opacity-70">สุทธิ{cycle.isPayCycle ? 'งวดนี้' : 'เดือนนี้'}</p>
                <p className={`mt-0.5 font-semibold lg:text-lg ${data.monthBalance < 0 ? 'text-[#FCA5A5]' : 'text-[#10B981]'}`}>
                  {data.monthBalance >= 0 ? '+' : ''}{formatTHB(data.monthBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
          <GoalProgressCard goals={data.activeGoals} />
          <Card className="cursor-pointer transition-all hover:shadow-md">
            <Link href="/cashflow">
              <CardContent className="p-4 lg:p-5">
                <p className="text-xs text-muted-foreground lg:text-sm">Cash Flow</p>
                <p className="mt-1 text-lg font-bold lg:text-2xl">
                  {(data.savingsRate * 100).toFixed(0)}%
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">อัตราการออม →</p>
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>

      <AdvisorEntry lastReport={lastAdvisorReport} />

      <Card>
        <CardContent className="p-4 lg:p-5">
          <h2 className="mb-3 text-sm font-semibold">รายรับ-รายจ่าย</h2>
          <IncomeExpenseChart payCycleDay={payCycleDay} />
        </CardContent>
      </Card>

      {nwHistory.length >= 2 && (
        <Card>
          <CardContent className="p-4 lg:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Net Worth ตามเวลา</h2>
              <p className="text-[11px] text-muted-foreground">{nwHistory.length} จุดข้อมูล</p>
            </div>
            <NetWorthMini data={nwHistory} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4 lg:p-6">
            <h2 className="mb-3 text-sm font-semibold lg:text-base">{t('healthSection')}</h2>
            <div className="space-y-3">
              <StatRow
                label={t('savingsRate')}
                value={`${(data.savingsRate * 100).toFixed(0)}%`}
                hint={t('savingsRateHint')}
                status={data.savingsRate >= 0.2 ? 'good' : data.savingsRate >= 0.1 ? 'warn' : 'bad'}
              />
              <StatRow
                label={t('dti')}
                value={`${(data.dti * 100).toFixed(0)}%`}
                hint={t('dtiHint')}
                status={data.dti < 0.3 ? 'good' : data.dti < 0.4 ? 'warn' : 'bad'}
              />
              <StatRow
                label={t('emergencyFund')}
                value={`${data.emergencyFundMonths.toFixed(1)} ${t('monthsLabel')}`}
                hint={t('emergencyFundHint')}
                status={data.emergencyFundMonths >= 6 ? 'good' : data.emergencyFundMonths >= 3 ? 'warn' : 'bad'}
              />
            </div>
          </CardContent>
        </Card>

        {data.topCategories.length > 0 ? (
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold lg:text-base">{t('topCategories')}</h2>
                <Link href="/transactions" className="text-xs text-primary">
                  {locale === 'th' ? 'ดูทั้งหมด' : 'View all'}
                </Link>
              </div>
              <ExpensePieChart
                categories={data.topCategories}
                total={data.monthExpense}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {locale === 'th'
                  ? `ยังไม่มีรายการใน${cycle.isPayCycle ? 'งวด' : 'เดือน'}นี้`
                  : 'No transactions this cycle'}
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/transactions/new">+ Add</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <DashboardQuickActions counts={{
        accountsCount: data.accountsCount,
        debtsCount: data.debtsCount,
        goalsCount: data.goalsCount,
      }} />

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary lg:h-12 lg:w-12">
              <Sparkles className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold lg:text-lg">{t('aiCta.title')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground lg:text-sm">{t('aiCta.subtitle')}</p>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/ai">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatRow({
  label, value, hint, status,
}: {
  label: string; value: string; hint: string; status: 'good' | 'warn' | 'bad';
}) {
  const dotColor = { good: 'bg-success', warn: 'bg-warning', bad: 'bg-destructive' }[status];
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        <div>
          <p className="text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function QuickAction({
  href, icon: Icon, label, count, color,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  color: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-all hover:shadow-md active:scale-95">
        <CardContent className="flex items-center gap-3 p-4 lg:flex-col lg:items-start lg:p-5">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg lg:h-12 lg:w-12 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 lg:flex-initial">
            <p className="font-medium">{label}</p>
            {count !== undefined && count > 0 && (
              <p className="text-xs text-muted-foreground lg:mt-0.5">
                {count} items
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
