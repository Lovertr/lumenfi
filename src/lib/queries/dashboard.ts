import { createClient } from '@/lib/supabase/server';
import { computeAccountBalances } from './balances';
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
  /** Sum of liquid accounts (cash + bank + savings + e-wallet) — money you can spend right now */
  availableCash: number;
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
    availableCash: 0,
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

    const [accountsRes, debtsRes, txRes, goalsRes, investmentsRes] = await Promise.all([
      supabase
        .from('accounts')
        .select('id, type, initial_balance, include_in_net_worth, created_at')
        .eq('archived', false),
      supabase
        .from('debts')
        .select('current_balance, monthly_payment')
        .eq('status', 'active'),
      supabase
        .from('transactions')
        .select('type, amount, date, account_id, to_account_id, category:categories(name, icon, color)'),
      supabase.from('goals').select('id, current_amount, is_emergency_fund').eq('status', 'active'),
      supabase
        .from('investments')
        .select('quantity, avg_cost, current_price')
        .eq('archived', false),
    ]);

    // Assets / Liabilities from accounts (computed from initial + transactions)
    const allAccounts = ((accountsRes.data ?? []) as any[]);
    const allTx = ((txRes.data ?? []) as any[]);
    // Need full tx for balance compute (date, account_id, to_account_id)
    const balanceMap = computeAccountBalances(
      allAccounts.map((a: any) => ({ id: a.id, type: a.type, initial_balance: a.initial_balance, created_at: a.created_at })),
      allTx
    );
    let totalAssets = 0;
    let totalLiabilitiesAcc = 0;
    let availableCash = 0;
    const LIQUID_TYPES = new Set(['cash', 'bank', 'savings', 'e_wallet']);
    for (const a of allAccounts) {
      const bal = balanceMap[a.id] ?? 0;
      if (a.include_in_net_worth) {
        if (a.type === 'credit_card') {
          totalLiabilitiesAcc += bal;
        } else {
          totalAssets += bal;
        }
      }
      if (LIQUID_TYPES.has(a.type as string)) {
        availableCash += bal;
      }
    }

    // Debts → liabilities
    let totalDebt = 0;
    let totalMonthlyDebt = 0;
    for (const d of (debtsRes.data ?? []) as any[]) {
      totalDebt += Number(d.current_balance);
      totalMonthlyDebt += Number(d.monthly_payment ?? 0);
    }
    // Investments → assets
    let totalInvestments = 0;
    for (const inv of (investmentsRes.data ?? []) as any[]) {
      const qty = Number(inv.quantity);
      const price = inv.current_price ? Number(inv.current_price) : Number(inv.avg_cost);
      totalInvestments += qty * price;
    }
    totalAssets += totalInvestments;

    const totalLiabilities = totalLiabilitiesAcc + totalDebt;
    const netWorth = totalAssets - totalLiabilities;

    // Month income / expense (filter by current month start)
    const startStr = start.toISOString().slice(0, 10);
    let monthIncome = 0;
    let monthExpense = 0;
    const catMap = new Map<string, { name: string; icon: string; color: string; amount: number }>();
    for (const t of (txRes.data ?? []) as any[]) {
      if ((t.date ?? '').slice(0, 10) < startStr) continue;
      const amt = Number(t.amount);
      if (t.type === 'income') monthIncome += amt;
      if (t.type === 'expense') {
        monthExpense += amt;
        // category from Supabase join — could be object or array
        const cat = Array.isArray(t.category) ? t.category[0] : t.category;
        if (cat?.name) {
          const k = cat.name as string;
          const existing = catMap.get(k);
          if (existing) existing.amount += amt;
          else
            catMap.set(k, {
              name: cat.name,
              icon: cat.icon,
              color: cat.color,
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
      availableCash,
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
