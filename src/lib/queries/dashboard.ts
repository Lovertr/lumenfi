import { cache } from 'react';
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
  activeGoals: Array<{
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    current: number;
    target: number;
    progress: number;
    deadline: string | null;
  }>;
  goalsCount: number;
  accountsCount: number;
  debtsCount: number;
}

async function _getDashboardData(cycleStart?: string, cycleEnd?: string): Promise<DashboardData> {
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
    activeGoals: [],
    goalsCount: 0,
    accountsCount: 0,
    debtsCount: 0,
  };

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return empty;

    // Cycle window — caller passes startDate / optional endDate (ISO YYYY-MM-DD).
    // Default: 1st of current calendar month → end of month.
    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startStrIn = cycleStart ?? defaultStart.toISOString().slice(0, 10);
    const endStrIn = cycleEnd ?? defaultEnd.toISOString().slice(0, 10);

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
      supabase.from('goals').select('id, name, current_amount, target_amount, is_emergency_fund, icon, color, deadline').eq('status', 'active').order('created_at'),
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

    // Month income / expense (filter by cycle window: startStrIn ≤ date ≤ endStrIn)
    let monthIncome = 0;
    let monthExpense = 0;
    const catMap = new Map<string, { name: string; icon: string; color: string; amount: number }>();
    for (const t of (txRes.data ?? []) as any[]) {
      const d = (t.date ?? '').slice(0, 10);
      if (d < startStrIn || d > endStrIn) continue;
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
      activeGoals: goals.map((g: any) => {
        const tgt = Number(g.target_amount ?? 0);
        const cur = Number(g.current_amount ?? 0);
        return {
          id: g.id,
          name: g.name,
          icon: g.icon,
          color: g.color,
          current: cur,
          target: tgt,
          progress: tgt > 0 ? Math.min(1, cur / tgt) : 0,
          deadline: g.deadline,
        };
      }),
      goalsCount: goals.length,
      accountsCount: (accountsRes.data ?? []).length,
      debtsCount: (debtsRes.data ?? []).length,
    };
  } catch (e) {
    console.warn('getDashboardData:', e);
    return empty;
  }
}


export const getDashboardData = cache(_getDashboardData);
/** Same as getDashboardData but accepts an explicit cycle window. */
export const getDashboardDataForCycle = cache(
  (cycleStart: string, cycleEnd: string) => _getDashboardData(cycleStart, cycleEnd)
);
