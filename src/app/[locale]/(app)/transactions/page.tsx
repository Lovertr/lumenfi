import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/auth/logout-button';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { formatTHB } from '@/lib/utils';
import { getRecentTransactions } from '@/lib/queries/transactions';
import { getCategories } from '@/lib/categories';
import { TransactionFilters } from '@/components/transactions/transaction-filters';
import { Plus, Wallet, ArrowLeft, Camera } from 'lucide-react';

export const dynamic = 'force-dynamic';

function formatDate(dateStr: string, locale: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}

function resolveDateRange(
  range: string,
  customFrom?: string,
  customTo?: string
): { from?: string; to?: string; label: string } {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const todayStr = today.toISOString().slice(0, 10);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  switch (range) {
    case 'all':
      return { label: 'ทั้งหมด' };
    case 'last_month': {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { from: iso(start), to: iso(end), label: 'เดือนที่แล้ว' };
    }
    case 'last_3': {
      const start = new Date(y, m - 2, 1);
      return { from: iso(start), to: todayStr, label: '3 เดือนล่าสุด' };
    }
    case 'last_6': {
      const start = new Date(y, m - 5, 1);
      return { from: iso(start), to: todayStr, label: '6 เดือนล่าสุด' };
    }
    case 'this_year': {
      const start = new Date(y, 0, 1);
      return { from: iso(start), to: todayStr, label: 'ปีนี้' };
    }
    case 'custom':
      return {
        from: customFrom || undefined,
        to: customTo || undefined,
        label:
          customFrom && customTo
            ? `${customFrom} → ${customTo}`
            : customFrom
              ? `จาก ${customFrom}`
              : customTo
                ? `ถึง ${customTo}`
                : 'เลือกช่วง',
      };
    case 'this_month':
    default: {
      const start = new Date(y, m, 1);
      return { from: iso(start), to: todayStr, label: 'เดือนนี้' };
    }
  }
}

export default async function TransactionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    category?: string;
    type?: string;
    account?: string;
    range?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('Transactions');

  const filterType =
    sp.type === 'income' || sp.type === 'expense' || sp.type === 'transfer'
      ? sp.type
      : undefined;

  const range = sp.range || 'this_month';
  const { from, to, label: rangeLabel } = resolveDateRange(range, sp.from, sp.to);

  const [transactions, categories] = await Promise.all([
    getRecentTransactions(500, {
      categoryId: sp.category,
      type: filterType,
      accountId: sp.account,
      fromDate: from,
      toDate: to,
    }),
    getCategories(),
  ]);

  // Calculate totals from filtered transactions
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    const amt = Number(tx.amount);
    if (tx.type === 'income') income += amt;
    else if (tx.type === 'expense') expense += amt;
  }
  const balance = income - expense;

  // Selected category info (for display in summary)
  const selectedCat = sp.category ? (categories as any[]).find((c) => c.id === sp.category) : null;

  // Group by date
  const grouped: Record<string, typeof transactions> = {};
  for (const tx of transactions) {
    const day = tx.date.slice(0, 10);
    grouped[day] = grouped[day] || [];
    grouped[day].push(tx);
  }

  const isFiltered = !!(sp.category || sp.type || sp.account || sp.range || sp.from || sp.to);

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

      {/* Summary — adapts to filters */}
      <Card className="bg-gradient-to-br from-[#0A0F1F] to-[#1E293B] text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs opacity-80">
              {selectedCat ? (
                <>
                  <span className="mr-1">{selectedCat.icon}</span>
                  {selectedCat.name}
                </>
              ) : filterType === 'income' ? (
                'รายรับ'
              ) : filterType === 'expense' ? (
                'รายจ่าย'
              ) : filterType === 'transfer' ? (
                'โอน'
              ) : (
                t('monthSummary')
              )}
              {' · '}
              <span className="opacity-90">{rangeLabel}</span>
            </p>
            <p className="text-[10px] opacity-70">{transactions.length} รายการ</p>
          </div>

          {/* Show appropriate primary number based on filter */}
          {filterType === 'income' ? (
            <p className="mt-1 text-2xl font-bold text-[#10B981]">+{formatTHB(income)}</p>
          ) : filterType === 'expense' ? (
            <p className="mt-1 text-2xl font-bold text-[#FCA5A5]">-{formatTHB(expense)}</p>
          ) : (
            <p className="mt-1 text-2xl font-bold">
              {balance >= 0 ? '+' : ''}
              {formatTHB(balance)}
            </p>
          )}

          {!filterType && (
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="opacity-70">{t('income')}</p>
                <p className="font-semibold text-[#10B981]">+{formatTHB(income)}</p>
              </div>
              <div>
                <p className="opacity-70">{t('expense')}</p>
                <p className="font-semibold text-[#FCA5A5]">-{formatTHB(expense)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionFilters categories={categories as any} />

      {transactions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Wallet className="h-6 w-6" />
            </div>
            <p className="font-semibold">
              {isFiltered ? 'ไม่พบรายการตามตัวกรอง' : t('noTransactions')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isFiltered ? 'ลองเปลี่ยนตัวกรองหรือล้างตัวกรอง' : t('noTransactionsHint')}
            </p>
            {!isFiltered && (
              <Button asChild className="mt-4">
                <Link href="/transactions/new">
                  <Plus className="h-4 w-4" />
                  {t('form.submit')}
                </Link>
              </Button>
            )}
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
                      <Link
                        key={tx.id}
                        href={`/transactions/${tx.id}/edit`}
                        className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors"
                      >
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
                      </Link>
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
