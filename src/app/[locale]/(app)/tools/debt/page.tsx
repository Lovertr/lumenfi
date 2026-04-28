import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DebtCalculator } from '@/components/tools/debt-calculator';
import { createClient } from '@/lib/supabase/server';
import { getCashFlowAnalysis } from '@/lib/queries/cashflow';

interface Debt {
  id: string;
  name: string;
  current_balance: number;
  interest_rate: number;
  monthly_payment: number | null;
}

interface ActivePlan {
  id: string;
  strategy: 'avalanche' | 'snowball';
  extra_per_month: number;
  total_months: number | null;
  total_interest: number | null;
  payoff_order: { debt_id?: string; name: string; month: number }[] | null;
  created_at: string;
}

async function getRealDebts(): Promise<Debt[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('debts')
    .select('id, name, current_balance, interest_rate, monthly_payment')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  return ((data ?? []) as any[]).map((d) => ({
    id: d.id,
    name: d.name,
    current_balance: Number(d.current_balance),
    interest_rate: Number(d.interest_rate),
    monthly_payment: d.monthly_payment ? Number(d.monthly_payment) : null,
  }));
}

async function getActivePlan(): Promise<ActivePlan | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('debt_plans')
    .select('id, strategy, extra_per_month, total_months, total_interest, payoff_order, created_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  return data as any;
}



async function getFinancialSnapshot() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const WINDOW_MONTHS = 6;
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - WINDOW_MONTHS + 1, 1);
  const sinceStr = since.toISOString().slice(0, 10);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [txRes, debtsRes, accRes, budgetsRes, currentMonthTx] = await Promise.all([
    supabase
      .from('transactions')
      .select('type, amount, date')
      .eq('user_id', user.id)
      .gte('date', sinceStr),
    supabase
      .from('debts')
      .select('current_balance, monthly_payment')
      .eq('status', 'active'),
    supabase
      .from('accounts')
      .select('id, type, initial_balance, include_in_net_worth')
      .eq('archived', false),
    supabase
      .from('budgets')
      .select('amount, category:categories(id, name)')
      .eq('user_id', user.id),
    supabase
      .from('transactions')
      .select('category_id, amount, type')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', startOfMonth),
  ]);

  let totalIncome = 0, totalExpense = 0;
  const monthsSeen = new Set<string>();
  (txRes.data ?? []).forEach((t: any) => {
    if (t.type === 'income') totalIncome += Number(t.amount);
    else if (t.type === 'expense') totalExpense += Number(t.amount);
    monthsSeen.add(((t.date as string) ?? '').slice(0, 7));
  });
  const activeMonths = Math.max(1, monthsSeen.size);
  const divisor = Math.min(WINDOW_MONTHS, activeMonths);
  const avgIncome = Math.round(totalIncome / divisor);
  const avgExpense = Math.round(totalExpense / divisor);

  let totalDebt = 0, monthlyPayments = 0;
  (debtsRes.data ?? []).forEach((d: any) => {
    totalDebt += Number(d.current_balance ?? 0);
    monthlyPayments += Number(d.monthly_payment ?? 0);
  });

  let totalAssets = 0, cashAvailable = 0;
  (accRes.data ?? []).forEach((a: any) => {
    if (!a.include_in_net_worth) return;
    const bal = Number(a.initial_balance);
    if (a.type === 'cash' || a.type === 'bank' || a.type === 'savings' || a.type === 'e_wallet') {
      cashAvailable += bal;
    }
    if (a.type !== 'credit_card') totalAssets += bal;
  });

  // Budget status: spent vs budget per category (current month)
  const spendingByCat: Record<string, number> = {};
  (currentMonthTx.data ?? []).forEach((t: any) => {
    if (!t.category_id) return;
    spendingByCat[t.category_id] = (spendingByCat[t.category_id] ?? 0) + Number(t.amount);
  });
  const budgetCategories = (budgetsRes.data ?? []).map((b: any) => {
    const cat = Array.isArray(b.category) ? b.category[0] : b.category;
    return {
      name: cat?.name ?? 'Unknown',
      budget: Number(b.amount ?? 0),
      spent: spendingByCat[cat?.id ?? ''] ?? 0,
    };
  });

  // Goals
  const { data: goalsRes } = await supabase
    .from('goals')
    .select('id, name, target_amount, current_amount, deadline, is_emergency_fund, linked_account_ids')
    .eq('user_id', user.id)
    .eq('status', 'active');
  const goals = (goalsRes ?? []).map((g: any) => ({
    name: g.name,
    target: Number(g.target_amount),
    current: Number(g.current_amount),
    deadline: g.deadline,
    is_emergency_fund: !!g.is_emergency_fund,
    is_linked: Array.isArray(g.linked_account_ids) && g.linked_account_ids.length > 0,
    monthly_required: g.deadline ? (() => {
      const months = Math.max(1, (new Date(g.deadline).getFullYear() - now.getFullYear()) * 12 + (new Date(g.deadline).getMonth() - now.getMonth()));
      const remaining = Math.max(0, Number(g.target_amount) - Number(g.current_amount));
      return Math.round(remaining / months);
    })() : null,
  }));

  // Cash flow analysis (re-use existing query)
  let cashflow: any = null;
  try {
    cashflow = await getCashFlowAnalysis();
  } catch {}

  return {
    monthly_income: avgIncome,
    monthly_expense_total: avgExpense,
    existing_debt_payments: Math.round(monthlyPayments),
    total_debt: Math.round(totalDebt),
    cash_available: Math.round(cashAvailable),
    total_assets: Math.round(totalAssets),
    active_months: activeMonths,
    budget_categories: budgetCategories,
    goals,
    cashflow: cashflow ? {
      status: cashflow.status,
      status_reason: cashflow.statusReason,
      months_of_runway: cashflow.monthsOfRunway,
      avg_monthly_net: cashflow.avgMonthlyNet,
      projected_net_30: cashflow.projectedNet30,
      upcoming_fixed_expense: cashflow.upcomingFixedExpense,
      upcoming_fixed_income: cashflow.upcomingFixedIncome,
    } : null,
  };
}

export default async function DebtCalcPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('DebtCalc');

  const [realDebts, activePlan, snapshot] = await Promise.all([getRealDebts(), getActivePlan(), getFinancialSnapshot()]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/more">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <CreditCard className="h-5 w-5 text-primary" />
            {t('title')}
          </h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
      </header>

      <DebtCalculator initialDebts={realDebts} activePlan={activePlan} snapshot={snapshot} />
    </div>
  );
}
