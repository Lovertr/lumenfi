import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoanSimulator } from '@/components/tools/loan-simulator';
import { createClient } from '@/lib/supabase/server';

async function getFinancialContext() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { monthly_income: 0, monthly_fixed_expenses: 0, existing_debt_payments: 0, total_debt: 0 };

  // Last-30-day income / fixed expenses
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().slice(0, 10);

  const [debtsRes, txRes] = await Promise.all([
    supabase
      .from('debts')
      .select('current_balance, monthly_payment')
      .eq('status', 'active'),
    supabase
      .from('transactions')
      .select('type, amount')
      .gte('date', sinceStr),
  ]);

  let monthlyIncome = 0;
  let monthlyExpense = 0;
  (txRes.data ?? []).forEach((t: any) => {
    if (t.type === 'income') monthlyIncome += Number(t.amount);
    else if (t.type === 'expense') monthlyExpense += Number(t.amount);
  });

  let totalDebt = 0;
  let existingDebtPayments = 0;
  (debtsRes.data ?? []).forEach((d: any) => {
    totalDebt += Number(d.current_balance ?? 0);
    existingDebtPayments += Number(d.monthly_payment ?? 0);
  });

  return {
    monthly_income: Math.round(monthlyIncome),
    monthly_fixed_expenses: Math.round(monthlyExpense - existingDebtPayments),
    existing_debt_payments: Math.round(existingDebtPayments),
    total_debt: Math.round(totalDebt),
  };
}



async function getActiveDebts() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('debts')
    .select('id, name, type, current_balance, interest_rate, monthly_payment')
    .eq('status', 'active')
    .order('current_balance', { ascending: false });
  return ((data ?? []) as any[]).map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    current_balance: Number(d.current_balance),
    interest_rate: Number(d.interest_rate),
    monthly_payment: d.monthly_payment ? Number(d.monthly_payment) : 0,
  }));
}

export default async function LoanPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Loan');

  const [context, debts] = await Promise.all([getFinancialContext(), getActiveDebts()]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/more">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Calculator className="h-5 w-5 text-primary" />
            {t('title')}
          </h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
      </header>

      <LoanSimulator context={context} debts={debts} />

      <p className="rounded-lg border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
        ℹ️ {t('disclaimer')}
      </p>
    </div>
  );
}
