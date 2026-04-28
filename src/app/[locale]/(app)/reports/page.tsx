import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileBarChart, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { LogoutButton } from '@/components/auth/logout-button';
import { createClient } from '@/lib/supabase/server';
import { formatTHB } from '@/lib/utils';
import { ReportsCharts } from '@/components/reports/reports-charts';

interface TxRow {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  category: { name: string; icon: string; color: string } | null;
}

async function getReportData() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Last 12 months
  const start = new Date();
  start.setMonth(start.getMonth() - 11);
  start.setDate(1);

  const { data } = await supabase
    .from('transactions')
    .select('type, amount, date, category:categories(name, icon, color)')
    .gte('date', start.toISOString().slice(0, 10))
    .order('date');

  return ((data ?? []) as unknown as TxRow[]);
}

function buildMonthly(rows: TxRow[]) {
  const map = new Map<string, { month: string; income: number; expense: number }>();
  // Initialize last 12 months
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map.set(key, { month: key, income: 0, expense: 0 });
  }
  rows.forEach((r) => {
    const key = r.date.slice(0, 7);
    const m = map.get(key);
    if (!m) return;
    const amt = Number(r.amount);
    if (r.type === 'income') m.income += amt;
    else if (r.type === 'expense') m.expense += amt;
  });
  return Array.from(map.values());
}

function buildCategoryBreakdown(rows: TxRow[], type: 'income' | 'expense') {
  // Filter to current month
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const map = new Map<string, { name: string; value: number; color: string; icon: string }>();
  rows.forEach((r) => {
    if (r.type !== type) return;
    if (!r.date.startsWith(ym)) return;
    const key = r.category?.name ?? 'อื่นๆ';
    const cur = map.get(key) ?? { name: key, value: 0, color: r.category?.color ?? '#94A3B8', icon: r.category?.icon ?? '💰' };
    cur.value += Number(r.amount);
    map.set(key, cur);
  });
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Reports');

  const rows = (await getReportData()) ?? [];
  const monthly = buildMonthly(rows);
  const expenseBreakdown = buildCategoryBreakdown(rows, 'expense');
  const incomeBreakdown = buildCategoryBreakdown(rows, 'income');

  const ytdIncome = monthly.reduce((s, m) => s + m.income, 0);
  const ytdExpense = monthly.reduce((s, m) => s + m.expense, 0);
  const ytdNet = ytdIncome - ytdExpense;
  const avgIncome = ytdIncome / 12;
  const avgExpense = ytdExpense / 12;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/more">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <FileBarChart className="h-5 w-5 text-primary" />
              {t('title')}
            </h1>
            <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild size="sm" variant="outline">
            <a href="/api/export/transactions" download="transactions.csv">
              <Download className="mr-1 h-4 w-4" />
              CSV
            </a>
          </Button>
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      {/* YTD summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t('ytdIncome')}</p>
            <p className="mt-1 flex items-center gap-1 text-lg font-bold text-green-600">
              <TrendingUp className="h-4 w-4" />
              {formatTHB(ytdIncome)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              ~ {formatTHB(avgIncome)}/{t('avgPerMonth')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t('ytdExpense')}</p>
            <p className="mt-1 flex items-center gap-1 text-lg font-bold text-red-600">
              <TrendingDown className="h-4 w-4" />
              {formatTHB(ytdExpense)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              ~ {formatTHB(avgExpense)}/{t('avgPerMonth')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t('ytdNet')}</p>
            <p className={`mt-1 text-lg font-bold ${ytdNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {ytdNet >= 0 ? '+' : ''}
              {formatTHB(ytdNet)}
            </p>
            <p className="text-[10px] text-muted-foreground">{t('last12Months')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t('savingsRate')}</p>
            <p className="mt-1 text-lg font-bold">
              {ytdIncome > 0 ? Math.round((ytdNet / ytdIncome) * 100) : 0}%
            </p>
            <p className="text-[10px] text-muted-foreground">{t('savingsRateHint')}</p>
          </CardContent>
        </Card>
      </div>

      <ReportsCharts
        monthly={monthly}
        expenseBreakdown={expenseBreakdown}
        incomeBreakdown={incomeBreakdown}
      />
    </div>
  );
}
