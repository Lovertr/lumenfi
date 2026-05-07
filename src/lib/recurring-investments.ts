// ─────────────────────────────────────────────────────────
// Materialize due recurring investments — called from cron
// Auto-creates investment_transactions (buy) for each due rule,
// updates the linked investment.quantity + avg_cost, and
// advances next_run_on.
// ─────────────────────────────────────────────────────────

import { createServiceClient } from '@/lib/supabase/admin';

function effectiveDay(year: number, month: number, day: number): string {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last)).toISOString().slice(0, 10);
}

function advanceMonth(currentRun: string, dayOfMonth: number): string {
  const cur = new Date(currentRun);
  return effectiveDay(cur.getFullYear(), cur.getMonth() + 1, dayOfMonth);
}

async function fetchYahooPrice(symbol: string, type: string): Promise<number | null> {
  if (!symbol) return null;
  try {
    let yfSymbol = symbol;
    if (type === 'thai_stock' && !symbol.includes('.')) yfSymbol = `${symbol}.BK`;
    if (type === 'crypto' && !symbol.includes('-')) yfSymbol = `${symbol}-USD`;
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === 'number' ? price : null;
  } catch {
    return null;
  }
}

export async function materializeDueRecurringInvestments(): Promise<{ executed: number; skipped: number }> {
  const supabase = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: rules } = await supabase
    .from('recurring_investments')
    .select('id, user_id, investment_id, amount_per_run, quantity_per_run, day_of_month, next_run_on, total_runs, total_invested')
    .eq('is_active', true)
    .lte('next_run_on', today);

  if (!rules || rules.length === 0) return { executed: 0, skipped: 0 };

  let executed = 0;
  let skipped = 0;

  for (const r of rules as any[]) {
    try {
      // Fetch the investment to get current_price + avg_cost + quantity + symbol
      const { data: inv } = await supabase
        .from('investments')
        .select('id, symbol, type, quantity, avg_cost, current_price')
        .eq('id', r.investment_id)
        .eq('user_id', r.user_id)
        .maybeSingle();

      if (!inv) {
        skipped++;
        continue;
      }

      // Determine quantity + price
      let price: number;
      let quantity: number;

      if (r.amount_per_run && Number(r.amount_per_run) > 0) {
        // Amount-based: try to get fresh price, fallback to current_price or avg_cost
        const fresh = await fetchYahooPrice(String(inv.symbol ?? ''), inv.type as string);
        price = fresh ?? Number(inv.current_price ?? inv.avg_cost);
        if (price <= 0) {
          skipped++;
          continue;
        }
        quantity = Number(r.amount_per_run) / price;
      } else if (r.quantity_per_run && Number(r.quantity_per_run) > 0) {
        quantity = Number(r.quantity_per_run);
        // Use latest price if symbol available, else avg_cost
        const fresh = inv.symbol ? await fetchYahooPrice(String(inv.symbol), inv.type as string) : null;
        price = fresh ?? Number(inv.current_price ?? inv.avg_cost);
        if (price <= 0) price = Number(inv.avg_cost);
      } else {
        skipped++;
        continue;
      }

      const totalCostThis = quantity * price;

      // Insert the transaction
      const { error: txErr } = await supabase.from('investment_transactions').insert({
        user_id: r.user_id,
        investment_id: r.investment_id,
        type: 'buy',
        quantity,
        price_per_unit: price,
        fee: 0,
        date: r.next_run_on,
        note: 'DCA อัตโนมัติ',
        realized_pl: null,
      });

      if (txErr) {
        console.error('rec inv tx insert:', txErr);
        skipped++;
        continue;
      }

      // Update the investment quantity + avg_cost (weighted average)
      const oldQty = Number(inv.quantity);
      const oldAvg = Number(inv.avg_cost);
      const newQty = oldQty + quantity;
      const newAvg = newQty > 0 ? (oldQty * oldAvg + totalCostThis) / newQty : 0;

      await supabase
        .from('investments')
        .update({
          quantity: newQty,
          avg_cost: newAvg,
          current_price: price,
          updated_at: new Date().toISOString(),
        })
        .eq('id', r.investment_id)
        .eq('user_id', r.user_id);

      // Advance schedule
      const nextRun = advanceMonth(r.next_run_on, r.day_of_month);
      await supabase
        .from('recurring_investments')
        .update({
          last_run_on: r.next_run_on,
          next_run_on: nextRun,
          total_runs: (r.total_runs ?? 0) + 1,
          total_invested: Number(r.total_invested ?? 0) + totalCostThis,
        })
        .eq('id', r.id);

      executed++;
    } catch (e) {
      console.error('materializeDueRecurringInvestments item failed:', e);
      skipped++;
    }
  }

  return { executed, skipped };
}
