import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/auth/logout-button';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { formatTHB } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { Plus, CreditCard, ArrowLeft, Pencil, Target as TargetIcon, Mountain, Snowflake } from 'lucide-react';
import { Link as IntlLink } from '@/i18n/routing';
import { debtTypeConfig, type DebtType } from '@/components/debts/debt-type-config';

export const dynamic = 'force-dynamic';

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

interface ActivePlan {
  id: string;
  strategy: 'avalanche' | 'snowball';
  extra_per_month: number;
  total_months: number | null;
  total_interest: number | null;
  payoff_order: { debt_id?: string; name: string; month: number }[] | null;
}

async function getActivePlan(): Promise<ActivePlan | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('debt_plans')
    .select('id, strategy, extra_per_month, total_months, total_interest, payoff_order')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  return data as any;
}

export default async function DebtsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Debts');
  const tType = await getTranslations('Debts.types');

  const [debts, activePlan] = await Promise.all([getDebts(), getActivePlan()]);
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
          <Button asChild size="sm">
            <Link href="/debts/new">
              <Plus className="mr-1 h-4 w-4" />
              {t('addDebt')}
            </Link>
          </Button>
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
                {formatTHB(totalDebt)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t('monthlyPayment')}</p>
              <p className="mt-1 text-lg font-bold">{formatTHB(totalMonthly)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active plan banner */}
      {activePlan && debts.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              {activePlan.strategy === 'avalanche'
                ? <Mountain className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                : <Snowflake className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />}
              <div className="flex-1 text-xs">
                <p className="font-semibold">
                  {locale === 'th' ? 'แผนชำระหนี้ที่เปิดใช้งาน' : 'Active payoff plan'}: {activePlan.strategy === 'avalanche' ? (locale === 'th' ? 'Avalanche (ดอกสูงก่อน)' : 'Avalanche (highest rate first)') : (locale === 'th' ? 'Snowball (ก้อนเล็กก่อน)' : 'Snowball (smallest first)')}
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  {locale === 'th' ? 'จ่ายเพิ่ม' : 'Extra'}: ฿{Number(activePlan.extra_per_month).toLocaleString()}/{locale === 'th' ? 'เดือน' : 'mo'}
                  {activePlan.total_months && (
                    <> · {locale === 'th' ? 'จบใน' : 'finishes in'} {Math.floor(activePlan.total_months / 12)}{locale === 'th' ? 'ปี' : 'y'} {activePlan.total_months % 12}{locale === 'th' ? 'เดือน' : 'mo'}</>
                  )}
                  {activePlan.total_interest != null && (
                    <> · {locale === 'th' ? 'ดอกรวม' : 'Total interest'} ฿{Number(activePlan.total_interest).toLocaleString()}</>
                  )}
                </p>
              </div>
              <IntlLink href="/tools/debt" className="shrink-0 rounded-md border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted">
                {locale === 'th' ? 'ดูแผน' : 'View'}
              </IntlLink>
            </div>
          </CardContent>
        </Card>
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
            const planIdx = activePlan?.payoff_order?.findIndex((p) => p.debt_id === debt.id) ?? -1;
            const planMonth = planIdx >= 0 ? activePlan!.payoff_order![planIdx].month : null;
            const cfg = debtTypeConfig[debt.type];
            const Icon = cfg.icon;
            return (
              <Link key={debt.id} href={`/debts/${debt.id}/edit`}>
                <Card className="transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.99]">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${cfg.bg} ${cfg.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold">{debt.name}</p>
                      {planIdx >= 0 && planMonth != null && (
                        <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          <TargetIcon className="h-2.5 w-2.5" />
                          {locale === 'th' ? `ลำดับที่ ${planIdx + 1} · ปลดเดือน ${planMonth}` : `#${planIdx + 1} · pays off month ${planMonth}`}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {tType(debt.type)} · {Number(debt.interest_rate).toFixed(2)}%
                        {debt.remaining_term && ` · ${debt.remaining_term} เดือน`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">
                        {formatTHB(Number(debt.current_balance))}
                      </p>
                      {debt.monthly_payment && (
                        <p className="text-xs text-muted-foreground">
                          {formatTHB(Number(debt.monthly_payment))}/mo
                        </p>
                      )}
                    </div>
                    <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
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
