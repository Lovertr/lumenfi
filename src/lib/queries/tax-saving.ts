// ─────────────────────────────────────────────────────────
// Tax-saving fund queries — RMF/SSF/PVD tracking for Thailand
// (server-only — uses next/headers via supabase/server)
// ─────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';
import type { TaxFundType } from '@/lib/tax-saving-config';

// Re-export client-safe config so existing server-side imports keep working
export { TAX_FUND_LIMITS, TAX_FUND_LABELS } from '@/lib/tax-saving-config';
export type { TaxFundType, TaxFundLimits } from '@/lib/tax-saving-config';

export interface TaxFundHolding {
  id: string;
  name: string;
  symbol: string | null;
  tax_fund_type: TaxFundType;
  quantity: number;
  avg_cost: number;
  current_price: number | null;
  lock_in_until: string | null;
  goal_id: string | null;
  cost: number;
  value: number;
  pl: number;
  daysUntilUnlock: number | null;
}

export interface TaxFundSummary {
  totalContributedThisYear: number;
  totalValueAll: number;
  byType: Record<TaxFundType, { count: number; cost: number; value: number }>;
  holdings: TaxFundHolding[];
}

export async function getTaxFundSummary(yearStart: string): Promise<TaxFundSummary> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      totalContributedThisYear: 0,
      totalValueAll: 0,
      byType: {} as Record<TaxFundType, { count: number; cost: number; value: number }>,
      holdings: [],
    };
  }

  const { data } = await supabase
    .from('investments')
    .select('id, name, symbol, tax_fund_type, quantity, avg_cost, current_price, lock_in_until, goal_id, created_at')
    .eq('user_id', user.id)
    .eq('is_tax_saving', true)
    .eq('archived', false)
    .order('created_at', { ascending: false });

  const today = new Date();
  const holdings: TaxFundHolding[] = (data ?? []).map((h: any) => {
    const qty = Number(h.quantity);
    const avg = Number(h.avg_cost);
    const cur = h.current_price !== null ? Number(h.current_price) : avg;
    const cost = qty * avg;
    const value = qty * cur;
    let daysUntilUnlock: number | null = null;
    if (h.lock_in_until) {
      const u = new Date(h.lock_in_until);
      daysUntilUnlock = Math.max(0, Math.ceil((u.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    }
    return {
      id: h.id,
      name: h.name,
      symbol: h.symbol,
      tax_fund_type: h.tax_fund_type as TaxFundType,
      quantity: qty,
      avg_cost: avg,
      current_price: h.current_price !== null ? Number(h.current_price) : null,
      lock_in_until: h.lock_in_until,
      goal_id: h.goal_id,
      cost,
      value,
      pl: value - cost,
      daysUntilUnlock,
    };
  });

  const yearStartDate = new Date(yearStart);
  const totalContributedThisYear = (data ?? [])
    .filter((h: any) => new Date(h.created_at) >= yearStartDate)
    .reduce((sum: number, h: any) => sum + Number(h.quantity) * Number(h.avg_cost), 0);

  const byType: Record<TaxFundType, { count: number; cost: number; value: number }> = {} as any;
  for (const h of holdings) {
    if (!byType[h.tax_fund_type]) {
      byType[h.tax_fund_type] = { count: 0, cost: 0, value: 0 };
    }
    byType[h.tax_fund_type].count += 1;
    byType[h.tax_fund_type].cost += h.cost;
    byType[h.tax_fund_type].value += h.value;
  }

  return {
    totalContributedThisYear,
    totalValueAll: holdings.reduce((s, h) => s + h.value, 0),
    byType,
    holdings,
  };
}
