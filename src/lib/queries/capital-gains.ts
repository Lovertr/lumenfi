// ─────────────────────────────────────────────────────────
// Capital gains report — yearly summary for tax filing
// ─────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';

export interface RealizedSale {
  id: string;
  investment_id: string;
  symbol: string | null;
  name: string;
  type: string;
  date: string;
  quantity: number;
  price_per_unit: number;
  fee: number;
  total_value: number;
  realized_pl: number;
}

export interface DividendIncome {
  id: string;
  investment_id: string;
  symbol: string | null;
  name: string;
  pay_date: string;
  amount: number;
  withholding_tax: number;
  net_amount: number;
}

export interface YearlySummary {
  year: number;
  totalSales: number; // gross proceeds
  totalRealizedPL: number; // sum of realized_pl
  totalDividendsGross: number;
  totalWithholdingTax: number;
  totalDividendsNet: number;
  salesCount: number;
  dividendCount: number;
  sales: RealizedSale[];
  dividends: DividendIncome[];
}

export async function getCapitalGainsReport(year: number): Promise<YearlySummary> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return emptySummary(year);
  }

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  // Sells with realized P/L
  const { data: txData } = await supabase
    .from('investment_transactions')
    .select(`
      id, investment_id, type, quantity, price_per_unit, fee, total_value, date, realized_pl,
      investment:investments(symbol, name, type)
    `)
    .eq('user_id', user.id)
    .eq('type', 'sell')
    .gte('date', yearStart)
    .lte('date', yearEnd)
    .order('date', { ascending: false });

  const sales: RealizedSale[] = (txData ?? []).map((t: any) => ({
    id: t.id,
    investment_id: t.investment_id,
    symbol: t.investment?.symbol ?? null,
    name: t.investment?.name ?? '',
    type: t.investment?.type ?? '',
    date: t.date,
    quantity: Number(t.quantity),
    price_per_unit: Number(t.price_per_unit),
    fee: Number(t.fee),
    total_value: Number(t.total_value),
    realized_pl: Number(t.realized_pl ?? 0),
  }));

  // Dividends in year
  const { data: divData } = await supabase
    .from('investment_dividends')
    .select(`
      id, investment_id, amount, withholding_tax, net_amount, pay_date,
      investment:investments(symbol, name)
    `)
    .eq('user_id', user.id)
    .gte('pay_date', yearStart)
    .lte('pay_date', yearEnd)
    .order('pay_date', { ascending: false });

  const dividends: DividendIncome[] = (divData ?? []).map((d: any) => ({
    id: d.id,
    investment_id: d.investment_id,
    symbol: d.investment?.symbol ?? null,
    name: d.investment?.name ?? '',
    pay_date: d.pay_date,
    amount: Number(d.amount),
    withholding_tax: Number(d.withholding_tax),
    net_amount: Number(d.net_amount),
  }));

  return {
    year,
    totalSales: sales.reduce((s, x) => s + x.total_value, 0),
    totalRealizedPL: sales.reduce((s, x) => s + x.realized_pl, 0),
    totalDividendsGross: dividends.reduce((s, x) => s + x.amount, 0),
    totalWithholdingTax: dividends.reduce((s, x) => s + x.withholding_tax, 0),
    totalDividendsNet: dividends.reduce((s, x) => s + x.net_amount, 0),
    salesCount: sales.length,
    dividendCount: dividends.length,
    sales,
    dividends,
  };
}

function emptySummary(year: number): YearlySummary {
  return {
    year,
    totalSales: 0,
    totalRealizedPL: 0,
    totalDividendsGross: 0,
    totalWithholdingTax: 0,
    totalDividendsNet: 0,
    salesCount: 0,
    dividendCount: 0,
    sales: [],
    dividends: [],
  };
}

// Get list of years that have data — for year picker
export async function getYearsWithData(): Promise<number[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const [txYears, divYears] = await Promise.all([
    supabase
      .from('investment_transactions')
      .select('date')
      .eq('user_id', user.id)
      .eq('type', 'sell'),
    supabase
      .from('investment_dividends')
      .select('pay_date')
      .eq('user_id', user.id),
  ]);

  const set = new Set<number>();
  (txYears.data ?? []).forEach((r: any) => set.add(new Date(r.date).getFullYear()));
  (divYears.data ?? []).forEach((r: any) => set.add(new Date(r.pay_date).getFullYear()));
  return Array.from(set).sort((a, b) => b - a);
}
