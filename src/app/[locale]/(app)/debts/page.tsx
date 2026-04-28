import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/auth/logout-button';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { formatTHB } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { Plus, CreditCard, ArrowLeft, Trash2 } from 'lucide-react';
import { debtTypeConfig, type DebtType } from '@/components/debts/debt-type-config';
import { deleteDebt } from './actions';

interface Debt {
  id: string;
  name: string;
  type: DebtType;
  lender: string | null;
  current_balance: number;
  interest_rate: number;
  monthly_payment: number | null;
  remaining_term: number | null;
}

async function getDebts(): Promise<Debt[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('debts')
      .select('id, name, type, lender, current_balance, interest_rate, monthly_payment, remaining_term')
      .eq('status', 'active')
      .order('current_balance', { ascending: false });
    if (error) return [];
    return (data as Debt[]) ?? [];
  } catch {
    return [];
  }
}

export default async function DebtsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Debts');
  const tType = await getTranslations('Debts.types');

  const debts = await getDebts();
  const totalDebt = debts.reduce((s, d) => s + Number(d.current_balance), 0);
  const totalMonthly = debts.reduce((s, d) => s + Number(d.monthly_payment ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 pt-6 lg:pt-10">
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
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      {debts.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t('totalDebt')}</p>
              <p className="mt-1 text-lg font-bold text-destructive">
                {formatTHB(totalDebt, { compact: true })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t('monthlyPayment')}</p>
              <p className="mt-1 text-lg font-bold">{formatTHB(totalMonthly, { compact: true })}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {debts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CreditCard className="h-6 w-6" />
            </div>
            <p className="font-semibold">{t('noDebts')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('noDebtsHint')}</p>
            <Button asChild className="mt-4">
              <Link href="/debts/new">
                <Plus className="h-4 w-4" />
                {t('addDebt')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2 lg:gap-3">
          {debts.map((debt) => {
            const cfg = debtTypeConfig[debt.type];
            const Icon = cfg.icon;
            return (
              <Card key={debt.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${cfg.bg} ${cfg.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold">{debt.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tType(debt.type)} · {Number(debt.interest_rate).toFixed(2)}%
                      {debt.remaining_term && ` · ${debt.remaining_term} เดือน`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-destructive">
                      {formatTHB(Number(debt.current_balance), { compact: true })}
                    </p>
                    {debt.monthly_payment && (
                      <p className="text-xs text-muted-foreground">
                        {formatTHB(Number(debt.monthly_payment), { compact: true })}/mo
                      </p>
                    )}
                  </div>
                  <form action={deleteDebt}>
                    <input type="hidden" name="id" value={debt.id} />
                    <button
                      type="submit"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </CardContent>
              </Card>
            );
          })}
          <Button asChild size="lg" className="fixed bottom-24 right-4 h-14 rounded-full shadow-lg sm:right-[calc(50%-208px)] lg:bottom-8 lg:right-8">
            <Link href="/debts/new">
              <Plus className="h-5 w-5" />
              {t('addDebt')}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
