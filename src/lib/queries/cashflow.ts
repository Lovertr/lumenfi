import { createClient } from '@/lib/supabase/server';
import { computeAccountBalances } from './balances';

export interface CashFlowDataPoint {
  date: string;
  income: number;
  expense: number;
  net: number;
  cumulative: number;
}

export interface CashFlowAnalysis {
  // Last 30/60/90 days
  last30: { income: number; expense: number; net: number };
  last60: { income: number; expense: number; net: number };
  last90: { income: number; expense: number; net: number };

  // Daily / monthly averages
  avgDailyIncome: number;
  avgDailyExpense: number;
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
  avgMonthlyNet: number;

  // Burn rate / runway
  totalCashOnHand: number;
  monthsOfRunway: number; // how long can sustain at current burn

  // Recurring upcoming (next 30 days estimate)
  upcomingFixedExpense: number; // recurring + debt payments
  upcomingFixedIncome: number; // recurring incomes
  projectedNet30: number;

  // Health
  status: 'healthy' | 'tight' | 'critical';
  statusReason: string;

  // Time series for chart (last 30 days)
  daily: CashFlowDataPoint[];
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

export async function getCashFlowAnalysis(): Promise<CashFlowAnalysis> {
  const empty: CashFlowAnalysis = {
    last30: { income: 0, expense: 0, net: 0 },
    last60: { income: 0, expense: 0, net: 0 },
    last90: { income: 0, expense: 0, net: 0 },
    avgDailyIncome: 0,
    avgDailyExpense: 0,
    avgMonthlyIncome: 0,
    avgMonthlyExpense: 0,
    avgMonthlyNet: 0,
    totalCashOnHand: 0,
    monthsOfRunway: 0,
    upcomingFixedExpense: 0,
    upcomingFixedIncome: 0,
    projectedNet30: 0,
    status: 'healthy',
    statusReason: '',
    daily: [],
  };

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return empty;

    const start90 = daysAgo(90);

    const [txRes, accRes, debtsRes, recurRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('type, amount, date')
        .gte('date', start90.toISOString())
        .order('date', { ascending: true }),
      supabase
        .from('accounts')
        .select('id, type, initial_balance, include_in_net_worth, created_at')
        .eq('archived', false),
      supabase
        .from('debts')
        .select('monthly_payment')
        .eq('status', 'active'),
      supabase
        .from('recurring_transactions')
        .select('type, amount, day_of_month')
        .eq('user_id', user.id)
        .eq('is_active', true),
    ]);

    const txs = (txRes.data ?? []) as { type: string; amount: number; date: string }[];

    // Bucket by day for last 90
    const dayMap = new Map<string, { income: number; expense: number }>();
    for (let i = 0; i <= 90; i++) {
      const key = daysAgo(90 - i).toISOString().slice(0, 10);
      dayMap.set(key, { income: 0, expense: 0 });
    }

    for (const tx of txs) {
      const key = tx.date.slice(0, 10);
      const bucket = dayMap.get(key);
      if (!bucket) continue;
      const amt = Number(tx.amount);
      if (tx.type === 'income') bucket.income += amt;
      if (tx.type === 'expense') bucket.expense += amt;
    }

    // Aggregate periods
    const periods = { last30: { income: 0, expense: 0 }, last60: { income: 0, expense: 0 }, last90: { income: 0, expense: 0 } };
    let i = 0;
    for (const [, v] of dayMap) {
      const fromEnd = 90 - i;
      if (fromEnd < 30) {
        periods.last30.income += v.income;
        periods.last30.expense += v.expense;
      }
      if (fromEnd < 60) {
        periods.last60.income += v.income;
        periods.last60.expense += v.expense;
      }
      periods.last90.income += v.income;
      periods.last90.expense += v.expense;
      i++;
    }

    const avgDailyIncome = periods.last30.income / 30;
    const avgDailyExpense = periods.last30.expense / 30;
    // Count months that actually contain data so a new user with 1 month doesn't get divided by 3
    const monthsWithData = new Set<string>();
    for (const tx of txs) monthsWithData.add(tx.date.slice(0, 7));
    const monthDivisor = Math.min(3, Math.max(1, monthsWithData.size));
    const avgMonthlyIncome = periods.last90.income / monthDivisor;
    const avgMonthlyExpense = periods.last90.expense / monthDivisor;
    const avgMonthlyNet = avgMonthlyIncome - avgMonthlyExpense;

    // Cash on hand from accounts (exclude credit cards)
    // Cash on hand: use computed balances (initial + all-time tx, cutoff respected)
    const { data: allTxData } = await supabase
      .from('transactions')
      .select('type, amount, date, account_id, to_account_id')
      .eq('user_id', user.id);
    const balanceMap = computeAccountBalances(
      ((accRes.data ?? []) as any[]).map((a: any) => ({
        id: a.id,
        type: a.type,
        initial_balance: a.initial_balance,
        created_at: a.created_at,
      })),
      (allTxData ?? []) as any[]
    );
    let totalCashOnHand = 0;
    for (const a of (accRes.data ?? []) as any[]) {
      if (a.type === 'credit_card') continue;
      if (!a.include_in_net_worth) continue;
      totalCashOnHand += balanceMap[a.id] ?? Number(a.initial_balance);
    }

    // Monthly burn = expenses (avg)
    const monthsOfRunway = avgMonthlyExpense > 0 ? totalCashOnHand / avgMonthlyExpense : 99;

    // Upcoming fixed (next 30 days)
    let upcomingFixedExpense = 0;
    let upcomingFixedIncome = 0;
    for (const d of (debtsRes.data ?? []) as any[]) {
      upcomingFixedExpense += Number(d.monthly_payment ?? 0);
    }
    for (const r of (recurRes.data ?? []) as any[]) {
      // recurring_transactions are always monthly (by design — day_of_month)
      const monthAmt = Number(r.amount);
      if (r.type === 'income') upcomingFixedIncome += monthAmt;
      if (r.type === 'expense') upcomingFixedExpense += monthAmt;
      // 'transfer' type ignored for cashflow (zero-sum between user accounts)
    }

    // Best projection = recent average net (already reflects all actual activity).
    // Recurring 'upcoming' shown separately for transparency, NOT double-counted.
    const projectedNet30 = avgMonthlyNet;

    // Status
    // Status: prioritize Net (the real direction your finances go)
    // Runway becomes a flag only if Net is non-positive
    let status: 'healthy' | 'tight' | 'critical' = 'healthy';
    let statusReason = '';
    if (avgMonthlyNet < 0 && monthsOfRunway < 3) {
      status = 'critical';
      statusReason = 'รายจ่ายมากกว่ารายรับ + เงินสดสำรอง < 3 เดือน — ความเสี่ยงสูง';
    } else if (avgMonthlyNet < 0) {
      status = 'tight';
      statusReason = 'กำลังใช้จ่ายมากกว่าหา — กินทุนทุกเดือน';
    } else if (monthsOfRunway < 3 && avgMonthlyNet < avgMonthlyExpense * 0.2) {
      // Positive Net but very thin + small cash buffer
      status = 'tight';
      statusReason = 'Net เป็นบวกแต่ buffer น้อย — ควรเพิ่มเงินสดสำรองให้ครอบ 3 เดือน';
    } else if (avgMonthlyNet > 0 && monthsOfRunway < 3) {
      status = 'tight';
      statusReason = 'รายได้ดีแต่เงินสดสำรองน้อย — แนะนำกันเงินไว้ฉุกเฉิน 3-6 เดือน';
    } else {
      statusReason = 'Cash flow แข็งแรง รักษาระดับนี้ไว้';
    }

    // Daily series for chart (last 30 days)
    const daily: CashFlowDataPoint[] = [];
    let cumulative = 0;
    let idx = 0;
    for (const [date, v] of dayMap) {
      idx++;
      if (idx <= 60) continue; // skip first 60 days
      const net = v.income - v.expense;
      cumulative += net;
      daily.push({ date, income: v.income, expense: v.expense, net, cumulative });
    }

    return {
      last30: { ...periods.last30, net: periods.last30.income - periods.last30.expense },
      last60: { ...periods.last60, net: periods.last60.income - periods.last60.expense },
      last90: { ...periods.last90, net: periods.last90.income - periods.last90.expense },
      avgDailyIncome,
      avgDailyExpense,
      avgMonthlyIncome,
      avgMonthlyExpense,
      avgMonthlyNet,
      totalCashOnHand,
      monthsOfRunway,
      upcomingFixedExpense,
      upcomingFixedIncome,
      projectedNet30,
      status,
      statusReason,
      daily,
    };
  } catch (e) {
    console.warn('getCashFlowAnalysis:', e);
    return empty;
  }
}
