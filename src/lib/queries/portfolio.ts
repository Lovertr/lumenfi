// ─────────────────────────────────────────────────────────
// Portfolio analytics — for /investments dashboard
// ─────────────────────────────────────────────────────────

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getRatesToTHB } from '@/lib/fx/rates';

export interface HoldingMetric {
  id: string;
  name: string;
  symbol: string | null;
  type: string;
  broker: string | null;
  currency: string;
  quantity: number;
  avg_cost: number;
  current_price: number | null;
  cost: number;          // qty * avg_cost
  value: number;         // qty * current_price (or fallback to cost)
  costTHB: number;
  valueTHB: number;
  pl: number;            // value - cost (in THB)
  plPercent: number;
  is_tax_saving: boolean;
  tax_fund_type: string | null;
  lock_in_until: string | null;
  goal_id: string | null;
}

export interface PortfolioMetrics {
  holdings: HoldingMetric[];
  totalValue: number;        // THB
  totalCost: number;         // THB
  totalPL: number;
  totalPLPercent: number;
  countByType: Record<string, number>;
  valueByType: Record<string, number>;     // THB sum per type
  valueByCurrency: Record<string, number>; // THB sum per currency
  valueByMarket: { thai: number; foreign: number };
  topGainers: HoldingMetric[];
  topLosers: HoldingMetric[];
}

const THAI_TYPES = new Set(['thai_stock', 'mutual_fund', 'reit', 'gold', 'fixed_deposit', 'lottery_savings']);

async function _getPortfolioMetrics(): Promise<PortfolioMetrics> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const empty: PortfolioMetrics = {
    holdings: [],
    totalValue: 0,
    totalCost: 0,
    totalPL: 0,
    totalPLPercent: 0,
    countByType: {},
    valueByType: {},
    valueByCurrency: {},
    valueByMarket: { thai: 0, foreign: 0 },
    topGainers: [],
    topLosers: [],
  };
  if (!user) return empty;

  const { data: invs } = await supabase
    .from('investments')
    .select('id, name, symbol, type, broker_account, currency, quantity, avg_cost, current_price, is_tax_saving, tax_fund_type, lock_in_until, goal_id')
    .eq('user_id', user.id);

  if (!invs || invs.length === 0) return empty;

  const fxRates = await getRatesToTHB();

  const holdings: HoldingMetric[] = invs.map((i: any) => {
    const qty = Number(i.quantity ?? 0);
    const avgCost = Number(i.avg_cost ?? 0);
    const cur = i.current_price !== null ? Number(i.current_price) : avgCost;
    const cost = qty * avgCost;
    const value = qty * cur;
    const currency = i.currency ?? 'THB';
    const fxRate = currency === 'THB' ? 1 : (fxRates[currency] ?? 1);
    const costTHB = cost * fxRate;
    const valueTHB = value * fxRate;
    const pl = valueTHB - costTHB;
    const plPercent = costTHB > 0 ? (pl / costTHB) * 100 : 0;
    return {
      id: i.id,
      name: i.name,
      symbol: i.symbol,
      type: i.type,
      broker: i.broker_account,
      currency,
      quantity: qty,
      avg_cost: avgCost,
      current_price: i.current_price !== null ? Number(i.current_price) : null,
      cost,
      value,
      costTHB,
      valueTHB,
      pl,
      plPercent,
      is_tax_saving: !!i.is_tax_saving,
      tax_fund_type: i.tax_fund_type,
      lock_in_until: i.lock_in_until,
      goal_id: i.goal_id,
    };
  });

  let totalValue = 0;
  let totalCost = 0;
  const countByType: Record<string, number> = {};
  const valueByType: Record<string, number> = {};
  const valueByCurrency: Record<string, number> = {};
  let thaiValue = 0;
  let foreignValue = 0;

  for (const h of holdings) {
    totalValue += h.valueTHB;
    totalCost += h.costTHB;
    countByType[h.type] = (countByType[h.type] ?? 0) + 1;
    valueByType[h.type] = (valueByType[h.type] ?? 0) + h.valueTHB;
    valueByCurrency[h.currency] = (valueByCurrency[h.currency] ?? 0) + h.valueTHB;
    if (THAI_TYPES.has(h.type) || h.currency === 'THB') {
      thaiValue += h.valueTHB;
    } else {
      foreignValue += h.valueTHB;
    }
  }

  const totalPL = totalValue - totalCost;
  const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  // Sort for top gainers/losers (by absolute THB P/L for impact)
  const sorted = [...holdings].sort((a, b) => b.pl - a.pl);
  const topGainers = sorted.slice(0, 3).filter((h) => h.pl > 0);
  const topLosers = sorted.slice(-3).reverse().filter((h) => h.pl < 0);

  return {
    holdings,
    totalValue,
    totalCost,
    totalPL,
    totalPLPercent,
    countByType,
    valueByType,
    valueByCurrency,
    valueByMarket: { thai: thaiValue, foreign: foreignValue },
    topGainers,
    topLosers,
  };
}


export const getPortfolioMetrics = cache(_getPortfolioMetrics);
