import { createClient } from '@/lib/supabase/server';
import { calculateHealthScore } from '@/lib/utils';

export interface DashboardData {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthIncome: number;
  monthExpense: number;
  monthBalance: number;
  savingsRate: number;
  dti: number;
  emergencyFundMonths: number;
  healthScore: number;
  topCategories: Array<{ name: string; icon: string; color: string; amount: number }>;
  goalsCount: number;
  accountsCount: number;
  debtsCount: number;
}

export async function getDashboardData(): Promise<DashboardData> {
  const empty: DashboardData = {
    netWorth: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    monthIncome: 0,
    monthExpense: 0,
    monthBalance: 0,
    savingsRate: 0,
    dti: 0,
    emergencyFundMonths: 0,
    healthScore: 50,
    topCategories: [],
    goalsCount: 0,
    accountsCount: 0,
    debtsCount: 0,
  };

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return empty;

    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const [accountsRes, debtsRes, txRes, goalsRes] = await Promise.all([
      supabase
        .from('accounts')
        .select('type, initial_balance, include_in_net_worth')
        .eq('archived', false),
      supabase
        .from('debts')
        .select('current_balance, monthly_payment')
        .eq('status', 'active'),
      supabase
        .from('transactions')
        .select('type, amount, category:categories(name, icon, color)')
        .gte('date', start.toISOString()),
      supabase.from('goals').select('id, current_amount, is_emergency_fund').eq('status', 'active'),
    ]);

    // Assets / Liabilities from accounts
    let totalAssets = 0;
    let totalLiabilitiesAcc = 0;
    for (const a of (accountsRes.data ?? []) as any[]) {
      if (!a.include_in_net_worth) continue;
      const bal = Number(a.initial_balance);
      if (a.type === 'credit_card') {
        totalLiabilitiesAcc += bal;
      } else {
        totalAssets += bal;
      }
    }

    // Debts → liabilities
    let totalDebt = 0;
    let totalMonthlyDebt = 0;
    for (const d of (debtsRes.data ?? []) as any[]) {
      totalDebt += Number(d.current_balance);
      totalMonthlyDebt += Number(d.monthly_payment ?? 0);
    }
    const totalLiabilities = totalLiabilitiesAcc + totalDebt;
    const netWorth = totalAssets - totalLiabilities;

    // Month income / expense
    let monthIncome = 0;
    let monthExpense = 0;
    const catMap = new Map<string, { name: string; icon: string; color: string; amount: number }>();
    for (const t of (txRes.data ?? []) as any[]) {
      const amt = Number(t.amount);
      if (t.type === 'income') monthIncome += amt;
      if (t.type === 'expense') {
        monthExpense += amt;
        if (t.category) {
          const k = t.category.name;
          const existing = catMap.get(k);
          if (existing) existing.amount += amt;
          else
            catMap.set(k, {
              name: t.category.name,
              icon: t.category.icon,
              color: t.category.color,
              amount: amt,
            });
        }
      }
    }
    const monthBalance = monthIncome - monthExpense;
    const savingsRate = monthIncome > 0 ? monthBalance / monthIncome : 0;
    const dti = monthIncome > 0 ? totalMonthlyDebt / monthIncome : 0;

    // Emergency fund
    const goals = (goalsRes.data ?? []) as any[];
    const emergencyGoal = goals.find((g: any) => g.is_emergency_fund);
    const avgMonthlyExpense = monthExpense > 0 ? monthExpense : 30000;
    const emergencyFundMonths = emergencyGoal
      ? Number(emergencyGoal.current_amount) / avgMonthlyExpense
      : 0;

    const topCategories = Array.from(catMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const healthScore = calculateHealthScore({
      savingsRate,
      dti,
      emergencyFundMonths,
      assetClassCount: 1,
      goalsOnTrack: goals.length > 0,
    });

    return {
      netWorth,
      totalAssets,
      totalLiabilities,
      monthIncome,
      monthExpense,
      monthBalance,
      savingsRate,
      dti,
      emergencyFundMonths,
      healthScore,
      topCategories,
      goalsCount: goals.length,
      accountsCount: (accountsRes.data ?? []).length,
      debtsCount: (debtsRes.data ?? []).length,
    };
  } catch (e) {
    console.warn('getDashboardData:', e);
    return empty;
  }
}
