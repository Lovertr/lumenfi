import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/auth/logout-button';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { formatTHB } from '@/lib/utils';
import { getRecentTransactions, getMonthlyTotals } from '@/lib/queries/transactions';
import { Plus, Wallet, ArrowLeft, Trash2, Camera } from 'lucide-react';
import { deleteTransaction } from './actions';

export const dynamic = 'force-dynamic';

function formatDate(dateStr: string, locale: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}

export default async function TransactionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Transactions');

  const [transactions, totals] = await Promise.all([
    getRecentTransactions(50),
    getMonthlyTotals(),
  ]);

  // Group by date
  const grouped: Record<string, typeof transactions> = {};
  for (const tx of transactions) {
    const day = tx.date.slice(0, 10);
    grouped[day] = grouped[day] || [];
    grouped[day].push(tx);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{t('title')}</h1>
            <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild size="sm" variant="outline">
            <Link href="/transactions/scan">
              <Camera className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">{t('scan')}</span>
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/transactions/new">
              <Plus className="mr-1 h-4 w-4" />
              {t('add')}
            </Link>
          </Button>
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      {/* Month summary */}
      <Card className="bg-gradient-to-br from-[#0A0F1F] to-[#1E293B] text-white">
        <CardContent className="p-4">
          <p className="text-xs opacity-80">{t('monthSummary')}</p>
          <p className="mt-1 text-2xl font-bold">
            {totals.balance >= 0 ? '+' : ''}
            {formatTHB(totals.balance)}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="opacity-70">{t('income')}</p>
              <p className="font-semibold text-[#10B981]">+{formatTHB(totals.income)}</p>
            </div>
            <div>
              <p className="opacity-70">{t('expense')}</p>
              <p className="font-semibold text-[#FCA5A5]">-{formatTHB(totals.expense)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction list */}
      {transactions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Wallet className="h-6 w-6" />
            </div>
            <p className="font-semibold">{t('noTransactions')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('noTransactionsHint')}</p>
            <Button asChild className="mt-4">
              <Link href="/transactions/new">
                <Plus className="h-4 w-4" />
                {t('form.submit')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day}>
              <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                {formatDate(day, locale)}
              </p>
              <Card>
                <CardContent className="divide-y p-0">
                  {items.map((tx) => {
                    const isIncome = tx.type === 'income';
                    const isExpense = tx.type === 'expense';
                    const isTransfer = tx.type === 'transfer';
                    const amountClass = isIncome
                      ? 'font-bold text-green-600'
                      : isExpense
                        ? 'font-bold text-red-600'
                        : 'font-bold text-foreground';
                    const sign = isIncome ? '+' : isExpense ? '-' : '';
                    const fallbackLabel = isIncome ? 'Income' : isExpense ? 'Expense' : 'Transfer';
                    const fallbackIcon = isTransfer ? '🔄' : '💰';
                    return (
                      <div key={tx.id} className="flex items-center gap-3 p-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl"
                          style={{
                            backgroundColor: tx.category?.color
                              ? `${tx.category.color}1A`
                              : '#F1F5F9',
                          }}
                        >
                          {tx.category?.icon ?? fallbackIcon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {tx.category?.name ?? fallbackLabel}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {tx.account?.name}
                            {tx.note && ` · ${tx.note}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={amountClass}>
                            {sign}
                            {formatTHB(Number(tx.amount))}
                          </p>
                        </div>
                        <form action={deleteTransaction}>
                          <input type="hidden" name="id" value={tx.id} />
                          <button
                            type="submit"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
