import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DebtCalculator } from '@/components/tools/debt-calculator';
import { createClient } from '@/lib/supabase/server';
import { getCashFlowAnalysis } from '@/lib/queries/cashflow';
import { getCurrentCycle, getCycleForDate, type CycleRange } from '@/lib/pay-cycle';

export const dynamic = 'force-dynamic';

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
  ai_advice_md: string | null;
  plan_options: any | null;
  selected_option_id: string | null;
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
    .select('id, strategy, extra_per_month, total_months, total_interest, payoff_order, ai_advice_md, plan_options, selected_option_id, created_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  return data as any;
}



async function getFinancialSnapshot() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Read pay-cycle setting from profile
  const { data: profileForCycle } = await supabase
    .from('profiles')
    .select('pay_cycle_day')
    .eq('id', user.id)
    .maybeSingle();
  const payCycleDay: number | null = (profileForCycle as any)?.pay_cycle_day ?? null;

  // Build cycle windows: current + 3 previous cycles (walk back day-by-day)
  const cyclesBack = 4;
  const cycleWindows: CycleRange[] = [getCurrentCycle(payCycleDay)];
  for (let i = 1; i < cyclesBack; i++) {
    const lastStart = new Date(cycleWindows[i - 1].startDate);
    const oneDayBack = new Date(lastStart.getTime() - 86400000);
    cycleWindows.push(getCycleForDate(payCycleDay, oneDayBack));
  }

  const WINDOW_MONTHS = 6;
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - WINDOW_MONTHS + 1, 1);
  // Use earliest cycle start or 6-month back, whichever is earlier
  const earliestCycleStart = cycleWindows.reduce(
    (min, c) => (new Date(c.startDate) < new Date(min) ? c.startDate : min),
    cycleWindows[0].startDate,
  );
  const sinceStr = (new Date(since) < new Date(earliestCycleStart)
    ? since.toISOString().slice(0, 10)
    : earliestCycleStart);

  const currentCycle = cycleWindows[0];

  const [txRes, debtsRes, accRes, budgetsRes, currentCycleTx] = await Promise.all([
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
      .select('category_id, amount, type, date')
      .eq('user_id', user.id)
      .gte('date', currentCycle.startDate)
      .lte('date', currentCycle.endDate),
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

  // ── Pay-cycle aware aggregation ───────────────────────────────────
  // Bucket every transaction into the cycle it belongs to, then compute
  // (a) current cycle totals (what user sees on Dashboard) and
  // (b) average over last 3 full cycles.
  function cycleIndex(dateStr: string): number {
    const d = new Date(dateStr);
    for (let i = 0; i < cycleWindows.length; i++) {
      const c = cycleWindows[i];
      if (dateStr >= c.startDate && dateStr <= c.endDate) return i;
    }
    return -1;
  }
  const cycleBuckets = cycleWindows.map(() => ({ income: 0, expense: 0 }));
  (txRes.data ?? []).forEach((t: any) => {
    const idx = cycleIndex(t.date as string);
    if (idx >= 0) {
      if (t.type === 'income') cycleBuckets[idx].income += Number(t.amount);
      else if (t.type === 'expense') cycleBuckets[idx].expense += Number(t.amount);
    }
  });
  const cycleNow = cycleBuckets[0]; // current cycle
  // Avg over the prior cycles only (exclude current — it's still in progress)
  const priorCycles = cycleBuckets.slice(1).filter((c) => c.income > 0 || c.expense > 0);
  const cycleAvgIncome = priorCycles.length
    ? Math.round(priorCycles.reduce((s, c) => s + c.income, 0) / priorCycles.length)
    : Math.round(cycleNow.income);
  const cycleAvgExpense = priorCycles.length
    ? Math.round(priorCycles.reduce((s, c) => s + c.expense, 0) / priorCycles.length)
    : Math.round(cycleNow.expense);

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
  (currentCycleTx.data ?? []).forEach((t: any) => {
    if (!t.category_id || t.type !== 'expense') return;
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
    // Use pay-cycle aware numbers if user has set pay_cycle_day,
    // otherwise fall back to 6-month average (calendar month aggregation).
    monthly_income: payCycleDay ? cycleAvgIncome : avgIncome,
    monthly_expense_total: payCycleDay ? cycleAvgExpense : avgExpense,
    // Always expose pay-cycle aware data so AI can use the freshest numbers
    pay_cycle: payCycleDay ? {
      day: payCycleDay,
      cycle_label: currentCycle.label,
      cycle_range: currentCycle.rangeLabel,
      this_cycle_income: Math.round(cycleNow.income),
      this_cycle_expense: Math.round(cycleNow.expense),
      this_cycle_net: Math.round(cycleNow.income - cycleNow.expense),
      avg_cycle_income: cycleAvgIncome,
      avg_cycle_expense: cycleAvgExpense,
      cycles_analyzed: priorCycles.length,
    } : null,
    fallback_avg_income: avgIncome,
    fallback_avg_expense: avgExpense,
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
