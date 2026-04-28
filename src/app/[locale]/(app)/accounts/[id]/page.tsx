import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { ArrowLeft, Pencil, Plus, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { getAccountBalanceMap } from '@/lib/queries/balances';
import { formatTHB } from '@/lib/utils';
import { accountTypeConfig, type AccountType } from '@/components/accounts/account-type-config';
import { AccountMovementFilters } from '@/components/accounts/account-movement-filters';

interface Tx {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  note: string | null;
  account_id: string;
  to_account_id: string | null;
  category: { name: string; icon: string; color: string } | null;
  fromAccount: { name: string } | null;
  toAccount: { name: string } | null;
}

function periodToRange(period: string): { gte: string; lte: string } | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (period === 'this_month') {
    return {
      gte: new Date(y, m, 1).toISOString().slice(0, 10),
      lte: new Date(y, m + 1, 0).toISOString().slice(0, 10),
    };
  }
  if (period === 'last_3') {
    return {
      gte: new Date(y, m - 2, 1).toISOString().slice(0, 10),
      lte: new Date(y, m + 1, 0).toISOString().slice(0, 10),
    };
  }
  return null; // all
}

async function getAccount(id: string) {
  const supabase = createClient();
  const { data } = await supabase.from('accounts').select('*').eq('id', id).maybeSingle();
  return data;
}

async function getMovement(accountId: string, period: string) {
  const supabase = createClient();
  const range = periodToRange(period);

  let q = supabase
    .from('transactions')
    .select(`
      id, type, amount, date, note, account_id, to_account_id,
      category:categories(name, icon, color),
      fromAccount:accounts!transactions_account_id_fkey(name),
      toAccount:accounts!transactions_to_account_id_fkey(name)
    `)
    .or(`account_id.eq.${accountId},to_account_id.eq.${accountId}`)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);

  if (range) {
    q = q.gte('date', range.gte).lte('date', range.lte);
  }

  const { data } = await q;
  return (data ?? []) as unknown as Tx[];
}

function summarize(rows: Tx[], accountId: string) {
  let inflow = 0;
  let outflow = 0;
  for (const r of rows) {
    const amt = Number(r.amount);
    if (r.type === 'transfer') {
      if (r.to_account_id === accountId) inflow += amt;
      else if (r.account_id === accountId) outflow += amt;
    } else if (r.type === 'income' && r.account_id === accountId) {
      inflow += amt;
    } else if (r.type === 'expense' && r.account_id === accountId) {
      outflow += amt;
    }
  }
  return { inflow, outflow, net: inflow - outflow };
}

function formatDate(s: string, locale: string) {
  return new Date(s).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { locale, id } = await params;
  const { period = 'this_month' } = await searchParams;
  setRequestLocale(locale);

  const [account, balances] = await Promise.all([getAccount(id), getAccountBalanceMap()]);
  if (!account) notFound();

  const [t, tType, tForm, rows] = await Promise.all([
    getTranslations('Accounts'),
    getTranslations('Accounts.types'),
    getTranslations('Transactions'),
    getMovement(id, period),
  ]);

  const cfg = accountTypeConfig[account.type as AccountType] ?? accountTypeConfig.other;
  const Icon = cfg.icon;
  const isLiability = cfg.isLiability;

  const { inflow, outflow, net } = summarize(rows, id);

  // Group by date
  const grouped: Record<string, Tx[]> = {};
  rows.forEach((tx) => {
    (grouped[tx.date] ||= []).push(tx);
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/accounts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{account.name}</h1>
            <p className="text-xs text-muted-foreground">{tType(account.type as AccountType)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild size="sm" variant="ghost">
            <Link href={`/accounts/${id}/edit`}>
              <Pencil className="mr-1 h-4 w-4" />
              {t('edit')}
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/transactions/new">
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Balance card */}
      <Card>
        <CardContent className="flex items-center gap-3 p-5">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl ${cfg.bg} ${cfg.color}`}
            style={account.color ? { backgroundColor: `${account.color}1A`, color: account.color } : undefined}
          >
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {isLiability ? t('outstanding') : t('balance')}
            </p>
            <p className={`text-2xl font-bold ${isLiability ? 'text-destructive' : ''}`}>
              {formatTHB(balances[id] ?? Number(account.initial_balance))}
            </p>
            {account.bank_name && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {account.bank_name}
                {account.account_number && ` · ${account.account_number}`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Period filter */}
      <AccountMovementFilters accountId={id} period={period} />

      {/* In/Out summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3">
            <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-600" />
              {t('movementIn')}
            </p>
            <p className="mt-1 text-base font-bold text-green-600">
              +{formatTHB(inflow)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              <TrendingDown className="h-3 w-3 text-red-600" />
              {t('movementOut')}
            </p>
            <p className="mt-1 text-base font-bold text-red-600">
              -{formatTHB(outflow)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t('movementNet')}
            </p>
            <p className={`mt-1 text-base font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {net >= 0 ? '+' : ''}
              {formatTHB(net)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Movement list */}
      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('noMovement')}</p>
            <Button asChild size="sm" className="mt-2">
              <Link href="/transactions/new">
                <Plus className="mr-1 h-4 w-4" />
                {tForm('addTitle')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day}>
              <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">
                {formatDate(day, locale)}
              </p>
              <Card>
                <CardContent className="divide-y p-0">
                  {items.map((tx) => {
                    const isTransferIn = tx.type === 'transfer' && tx.to_account_id === id;
                    const isTransferOut = tx.type === 'transfer' && tx.account_id === id;
                    const isTransfer = tx.type === 'transfer';
                    const sign =
                      tx.type === 'income'
                        ? '+'
                        : tx.type === 'expense'
                          ? '-'
                          : isTransferIn
                            ? '+'
                            : '-';
                    const colorClass = isTransfer
                      ? 'font-bold text-foreground'
                      : tx.type === 'income'
                        ? 'font-bold text-green-600'
                        : 'font-bold text-red-600';

                    let icon: string;
                    let label: string;
                    let subtitle: string;

                    if (tx.type === 'transfer') {
                      icon = '🔄';
                      if (isTransferIn) {
                        label = t('transferFrom');
                        subtitle = tx.fromAccount?.name ?? '';
                      } else {
                        label = t('transferTo');
                        subtitle = tx.toAccount?.name ?? '';
                      }
                    } else {
                      icon = tx.category?.icon ?? (tx.type === 'income' ? '💰' : '💸');
                      label = tx.category?.name ?? (tx.type === 'income' ? 'Income' : 'Expense');
                      subtitle = tx.note ?? '';
                    }

                    return (
                      <div key={tx.id} className="flex items-center gap-3 p-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl"
                          style={{
                            backgroundColor: tx.category?.color ? `${tx.category.color}1A` : '#F1F5F9',
                          }}
                        >
                          {icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{label}</p>
                          {subtitle && (
                            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
                          )}
                        </div>
                        <p className={colorClass}>
                          {sign}
                          {formatTHB(Number(tx.amount))}
                        </p>
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
