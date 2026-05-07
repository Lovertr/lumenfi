// ─────────────────────────────────────────────────────────
// Portfolio snapshot — daily total_value/total_cost for risk metrics
// ─────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';
import { getRatesToTHB } from '@/lib/fx/rates';

export async function snapshotPortfolioForUser(userId: string) {
  const supabase = createClient();

  const { data: investments } = await supabase
    .from('investments')
    .select('quantity, avg_cost, current_price, currency')
    .eq('user_id', userId)
    .eq('archived', false);

  const inv = investments ?? [];
  if (inv.length === 0) {
    return { totalValue: 0, totalCost: 0, holdingsCount: 0 };
  }

  // Need FX to convert all to THB
  const currencies = Array.from(new Set(inv.map((i: any) => i.currency || 'THB')));
  const rates = await getRatesToTHB();
  void currencies;

  let totalValue = 0;
  let totalCost = 0;
  for (const h of inv as any[]) {
    const qty = Number(h.quantity);
    const avg = Number(h.avg_cost);
    const cur = h.current_price !== null ? Number(h.current_price) : avg;
    const fx = rates[h.currency || 'THB'] ?? 1;
    totalValue += qty * cur * fx;
    totalCost += qty * avg * fx;
  }

  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from('portfolio_snapshots').upsert(
    {
      user_id: userId,
      snapshot_date: today,
      total_value: totalValue,
      total_cost: totalCost,
      holdings_count: inv.length,
    },
    { onConflict: 'user_id,snapshot_date' }
  );

  if (error) console.error('snapshotPortfolioForUser:', error);

  return { totalValue, totalCost, holdingsCount: inv.length };
}

export interface PortfolioSnapshot {
  snapshot_date: string;
  total_value: number;
  total_cost: number;
  unrealized_pl: number;
  holdings_count: number;
}

export async function getPortfolioSnapshots(userId: string, daysBack = 365): Promise<PortfolioSnapshot[]> {
  const supabase = createClient();
  const since = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from('portfolio_snapshots')
    .select('snapshot_date, total_value, total_cost, unrealized_pl, holdings_count')
    .eq('user_id', userId)
    .gte('snapshot_date', since)
    .order('snapshot_date');
  return (data ?? []) as PortfolioSnapshot[];
}

// ─────────────────────────────────────────────────────────
// Risk metrics computed from snapshots
// ─────────────────────────────────────────────────────────

export interface RiskMetrics {
  daysOfData: number;
  volatility: number; // annualized %
  maxDrawdown: number; // %
  sharpe: number | null; // assuming risk-free 2%
  bestDay: number | null;
  worstDay: number | null;
  totalReturn: number; // % since first snapshot
}

export function computeRiskMetrics(snapshots: PortfolioSnapshot[], riskFreeAnnual = 0.02): RiskMetrics {
  if (snapshots.length < 2) {
    return {
      daysOfData: snapshots.length,
      volatility: 0,
      maxDrawdown: 0,
      sharpe: null,
      bestDay: null,
      worstDay: null,
      totalReturn: 0,
    };
  }

  const values = snapshots.map((s) => Number(s.total_value));
  const dailyReturns: number[] = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] > 0) {
      dailyReturns.push((values[i] - values[i - 1]) / values[i - 1]);
    }
  }

  // Mean daily return
  const meanDaily = dailyReturns.reduce((s, r) => s + r, 0) / Math.max(1, dailyReturns.length);
  // Std dev daily
  const variance = dailyReturns.reduce((s, r) => s + (r - meanDaily) ** 2, 0) / Math.max(1, dailyReturns.length);
  const stdDaily = Math.sqrt(variance);

  // Annualize: × √252 trading days
  const volatility = stdDaily * Math.sqrt(252) * 100;

  // Max drawdown
  let peak = values[0];
  let maxDrawdown = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (peak - v) / peak : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }
  maxDrawdown *= 100;

  // Sharpe ratio (annualized)
  const annualReturn = meanDaily * 252;
  const sharpe = stdDaily > 0
    ? (annualReturn - riskFreeAnnual) / (stdDaily * Math.sqrt(252))
    : null;

  // Best/worst day
  const bestDay = dailyReturns.length > 0 ? Math.max(...dailyReturns) * 100 : null;
  const worstDay = dailyReturns.length > 0 ? Math.min(...dailyReturns) * 100 : null;

  // Total return
  const first = values[0];
  const last = values[values.length - 1];
  const totalReturn = first > 0 ? ((last - first) / first) * 100 : 0;

  return {
    daysOfData: snapshots.length,
    volatility,
    maxDrawdown,
    sharpe,
    bestDay,
    worstDay,
    totalReturn,
  };
}
