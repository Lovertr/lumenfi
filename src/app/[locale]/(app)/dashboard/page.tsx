import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { LogoutButton } from '@/components/auth/logout-button';
import { formatTHB } from '@/lib/utils';
import { getDashboardData } from '@/lib/queries/dashboard';
import { materializeDueRecurring } from '@/lib/recurring';
import { DashboardQuickActions } from '@/components/dashboard/dashboard-quick-actions';
import { NetWorthChart } from '@/components/dashboard/net-worth-chart';
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

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
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

  // Take net worth snapshot if needed (idempotent — upserts today's row)
  let nwHistory: Array<{ date: string; total_assets: number; total_liabilities: number; net_worth: number }> = [];
  if (user) {
    try {
      const mod = await import('@/lib/queries/net-worth-snapshot');
      await mod.snapshotTodayForUser(user.id);
      nwHistory = (await mod.getNetWorthHistory(user.id, 90)) as typeof nwHistory;
    } catch (e) {
      console.warn('Net worth snapshot failed:', e);
    }
  }

  const data = await getDashboardData();

  return (
    <div className="space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {t('greeting')} {greeting}
          </p>
          <h1 className="text-xl font-bold lg:text-2xl">{t('subtitle')}</h1>
        </div>
        <div className="flex items-center gap-1.5 lg:hidden">
          <HealthBadge score={data.healthScore} />
          <LanguageSwitcher />
          <LogoutButton />
        </div>
        <div className="hidden lg:block">
          <HealthBadge score={data.healthScore} />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden bg-gradient-to-br from-[#0A0F1F] to-[#1E293B] text-white lg:col-span-2">
          <CardContent className="p-6 lg:p-8">
            <p className="text-sm opacity-90">{t('netWorth')}</p>
            <p className={`mt-1 text-3xl font-bold lg:text-5xl ${data.netWorth < 0 ? 'text-[#FCA5A5]' : ''}`}>
              {formatTHB(data.netWorth)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs lg:mt-6 lg:gap-6 lg:text-sm">
              <div>
                <p className="opacity-70">Assets</p>
                <p className="mt-0.5 font-semibold lg:text-lg">{formatTHB(data.totalAssets)}</p>
              </div>
              <div>
                <p className="opacity-70">Liabilities</p>
                <p className="mt-0.5 font-semibold text-[#FCA5A5] lg:text-lg">
                  -{formatTHB(data.totalLiabilities)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
          <Card>
            <CardContent className="p-4 lg:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground lg:text-sm">{t('monthIncome')}</span>
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <p className="mt-1 text-lg font-bold text-success lg:text-2xl">
                {formatTHB(data.monthIncome)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 lg:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground lg:text-sm">{t('monthExpense')}</span>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </div>
              <p className="mt-1 text-lg font-bold text-destructive lg:text-2xl">
                {formatTHB(data.monthExpense)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {nwHistory.length >= 2 && (
        <Card>
          <CardContent className="p-4 lg:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Net Worth ย้อนหลัง 90 วัน</h2>
              <p className="text-xs text-muted-foreground">{nwHistory.length} จุดข้อมูล</p>
            </div>
            <NetWorthChart data={nwHistory} />
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
              <div className="space-y-2">
                {data.topCategories.map((cat) => {
                  const percent = data.monthExpense > 0 ? (cat.amount / data.monthExpense) * 100 : 0;
                  return (
                    <div key={cat.name} className="flex items-center gap-3">
                      <span className="text-xl">{cat.icon}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span>{cat.name}</span>
                          <span className="font-medium">{formatTHB(cat.amount)}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${percent}%`, backgroundColor: cat.color }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {locale === 'th' ? 'ยังไม่มีรายการในเดือนนี้' : 'No transactions this month'}
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
