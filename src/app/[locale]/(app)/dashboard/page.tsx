import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { LogoutButton } from '@/components/auth/logout-button';
import { formatTHB } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Wallet,
  CreditCard,
} from 'lucide-react';

const mockData = {
  netWorth: 285000,
  netWorthChange: 12500,
  netWorthChangePercent: 4.6,
  monthIncome: 65000,
  monthExpense: 42300,
  healthScore: 78,
  savingsRate: 0.35,
  dti: 0.28,
  emergencyFundMonths: 4.2,
  topCategories: [
    { key: 'food', label: { th: 'อาหาร', en: 'Food' }, amount: 12500, color: '#F59E0B', icon: '🍔' },
    { key: 'transport', label: { th: 'เดินทาง', en: 'Transport' }, amount: 8200, color: '#3B82F6', icon: '🚗' },
    { key: 'housing', label: { th: 'ค่าที่อยู่อาศัย', en: 'Housing' }, amount: 9000, color: '#8B5CF6', icon: '🏠' },
    { key: 'shopping', label: { th: 'ของใช้', en: 'Shopping' }, amount: 5400, color: '#06B6D4', icon: '🛒' },
    { key: 'entertainment', label: { th: 'บันเทิง', en: 'Entertainment' }, amount: 3200, color: '#A855F7', icon: '🎬' },
  ],
};

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
  const data = mockData;
  const isPositive = data.netWorthChange >= 0;
  const localeTyped = locale as 'th' | 'en';

  return (
    <div className="space-y-4 p-4 pt-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t('greeting')} 👋</p>
          <h1 className="text-xl font-bold">{t('subtitle')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <HealthBadge score={data.healthScore} />
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      {/* Net Worth Hero Card */}
      <Card className="overflow-hidden bg-gradient-to-br from-[#0A0F1F] to-[#1E293B] text-white">
        <CardContent className="p-6">
          <p className="text-sm opacity-90">{t('netWorth')}</p>
          <p className="mt-1 text-3xl font-bold">{formatTHB(data.netWorth)}</p>
          <div className="mt-3 flex items-center gap-2 text-sm">
            {isPositive ? <TrendingUp className="h-4 w-4 text-[#FCD34D]" /> : <TrendingDown className="h-4 w-4" />}
            <span>
              {isPositive ? '+' : ''}
              {formatTHB(data.netWorthChange)} ({data.netWorthChangePercent}%) {t('monthChange')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t('monthIncome')}</span>
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <p className="mt-1 text-lg font-bold text-success">
              {formatTHB(data.monthIncome, { compact: true })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t('monthExpense')}</span>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
            <p className="mt-1 text-lg font-bold text-destructive">
              {formatTHB(data.monthExpense, { compact: true })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Health Stats */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">{t('healthSection')}</h2>
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

      {/* Top Categories */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t('topCategories')}</h2>
            <Link href="/transactions" className="text-xs text-primary">
              {locale === 'th' ? 'ดูทั้งหมด' : 'View all'}
            </Link>
          </div>
          <div className="space-y-2">
            {data.topCategories.map((cat) => {
              const percent = (cat.amount / data.monthExpense) * 100;
              return (
                <div key={cat.key} className="flex items-center gap-3">
                  <span className="text-xl">{cat.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span>{cat.label[localeTyped]}</span>
                      <span className="font-medium">{formatTHB(cat.amount, { compact: true })}</span>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickAction href="/debts" icon={CreditCard} label={t('quickActions.debts')} color="text-red-600" />
        <QuickAction href="/investments" icon={TrendingUp} label={t('quickActions.investments')} color="text-green-600" />
        <QuickAction href="/goals" icon={Target} label={t('quickActions.goals')} color="text-purple-600" />
        <QuickAction href="/accounts" icon={Wallet} label={t('quickActions.accounts')} color="text-blue-600" />
      </div>

      {/* AI CTA */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{t('aiCta.title')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('aiCta.subtitle')}</p>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/ai">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mock notice */}
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
            <div className="text-xs">
              <p className="font-semibold">{t('mockNotice.title')}</p>
              <p className="mt-0.5 text-muted-foreground">{t('mockNotice.body')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatRow({
  label,
  value,
  hint,
  status,
}: {
  label: string;
  value: string;
  hint: string;
  status: 'good' | 'warn' | 'bad';
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
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-all active:scale-95">
        <CardContent className="flex items-center gap-3 p-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="font-medium">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
