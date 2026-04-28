import { createClient } from '@/lib/supabase/server';

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
        .select('type, initial_balance, include_in_net_worth')
        .eq('archived', false),
      supabase
        .from('debts')
        .select('monthly_payment')
        .eq('status', 'active'),
      supabase
        .from('recurring_templates')
        .select('type, amount, frequency, next_occurrence')
        .eq('active', true),
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
    const avgMonthlyIncome = periods.last90.income / 3;
    const avgMonthlyExpense = periods.last90.expense / 3;
    const avgMonthlyNet = avgMonthlyIncome - avgMonthlyExpense;

    // Cash on hand from accounts (exclude credit cards)
    let totalCashOnHand = 0;
    for (const a of (accRes.data ?? []) as any[]) {
      if (a.type === 'credit_card') continue;
      if (!a.include_in_net_worth) continue;
      totalCashOnHand += Number(a.initial_balance);
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
      // approximate: monthly = once, weekly = 4x, daily = 30x, etc.
      const freqMap: Record<string, number> = {
        daily: 30,
        weekly: 4.3,
        biweekly: 2.15,
        monthly: 1,
        quarterly: 1 / 3,
        yearly: 1 / 12,
      };
      const occurrences = freqMap[r.frequency] ?? 1;
      const monthAmt = Number(r.amount) * occurrences;
      if (r.type === 'income') upcomingFixedIncome += monthAmt;
      if (r.type === 'expense') upcomingFixedExpense += monthAmt;
    }

    const projectedNet30 = avgMonthlyIncome + upcomingFixedIncome - avgMonthlyExpense - upcomingFixedExpense;

    // Status
    let status: 'healthy' | 'tight' | 'critical' = 'healthy';
    let statusReason = '';
    if (monthsOfRunway < 1) {
      status = 'critical';
      statusReason = 'เงินสดน้อยกว่ารายจ่าย 1 เดือน — ความเสี่ยงสูง';
    } else if (monthsOfRunway < 3) {
      status = 'tight';
      statusReason = 'เงินสดเหลือน้อยกว่า 3 เดือน — ควรเพิ่ม emergency fund';
    } else if (avgMonthlyNet < 0) {
      status = 'tight';
      statusReason = 'รายจ่ายเฉลี่ยมากกว่ารายรับ — กำลังกินทุน';
    } else if (projectedNet30 < 0) {
      status = 'tight';
      statusReason = '30 วันข้างหน้าอาจติดลบ — มีค่าใช้จ่ายประจำสูง';
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
