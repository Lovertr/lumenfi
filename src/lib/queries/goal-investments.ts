// ─────────────────────────────────────────────────────────
// Goal-linked investment value lookup
// ─────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';
import { getRatesToTHB } from '@/lib/fx/rates';

export interface GoalInvestmentValue {
  goalId: string;
  totalValueTHB: number;
  count: number;
  holdings: {
    id: string;
    symbol: string | null;
    name: string;
    valueTHB: number;
  }[];
}

export async function getGoalInvestmentMap(): Promise<Record<string, GoalInvestmentValue>> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data: investments } = await supabase
    .from('investments')
    .select('id, name, symbol, quantity, avg_cost, current_price, currency, goal_id')
    .eq('user_id', user.id)
    .eq('archived', false)
    .not('goal_id', 'is', null);

  if (!investments || investments.length === 0) return {};

  const fxRates = await getRatesToTHB();

  const result: Record<string, GoalInvestmentValue> = {};
  for (const inv of investments as any[]) {
    if (!inv.goal_id) continue;
    const qty = Number(inv.quantity);
    const cur = inv.current_price !== null ? Number(inv.current_price) : Number(inv.avg_cost);
    const fx = fxRates[inv.currency || 'THB'] ?? 1;
    const valueTHB = qty * cur * fx;

    if (!result[inv.goal_id]) {
      result[inv.goal_id] = {
        goalId: inv.goal_id,
        totalValueTHB: 0,
        count: 0,
        holdings: [],
      };
    }
    result[inv.goal_id].totalValueTHB += valueTHB;
    result[inv.goal_id].count += 1;
    result[inv.goal_id].holdings.push({
      id: inv.id,
      symbol: inv.symbol,
      name: inv.name,
      valueTHB,
    });
  }

  return result;
}
