// ─────────────────────────────────────────────────────────
// Budget overspend detection
// Returns categories where spend has exceeded or is approaching budget
// ─────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';

export interface BudgetAlert {
  category_id: string;
  category_name: string;
  category_icon: string;
  budget: number;
  spent: number;
  percent: number;
  status: 'over' | 'approaching' | 'on_track';
}

export async function getBudgetAlerts(userId: string): Promise<BudgetAlert[]> {
  const supabase = createClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const startStr = startOfMonth.toISOString().slice(0, 10);

  const [budgetsR, txR] = await Promise.all([
    supabase.from('budgets').select('category_id, amount').eq('user_id', userId).gt('amount', 0),
    supabase
      .from('transactions')
      .select('category_id, amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', startStr),
  ]);

  const budgets = budgetsR.data ?? [];
  const txs = txR.data ?? [];

  // Sum spend by category this month
  const spendByCategory: Record<string, number> = {};
  for (const t of txs) {
    if (!t.category_id) continue;
    spendByCategory[t.category_id] = (spendByCategory[t.category_id] ?? 0) + Number(t.amount ?? 0);
  }

  // Get category names
  const categoryIds = budgets.map((b) => b.category_id).filter(Boolean) as string[];
  const { data: cats } = await supabase
    .from('categories')
    .select('id, name, icon')
    .in('id', categoryIds);
  const catMap = new Map((cats ?? []).map((c) => [c.id, c]));

  const alerts: BudgetAlert[] = [];
  for (const b of budgets) {
    const cat = catMap.get(b.category_id);
    if (!cat) continue;
    const spent = spendByCategory[b.category_id] ?? 0;
    const budget = Number(b.amount);
    const percent = (spent / budget) * 100;

    let status: BudgetAlert['status'] = 'on_track';
    if (percent >= 100) status = 'over';
    else if (percent >= 80) status = 'approaching';

    alerts.push({
      category_id: b.category_id,
      category_name: cat.name,
      category_icon: cat.icon,
      budget,
      spent,
      percent,
      status,
    });
  }

  return alerts;
}

export function formatBudgetMessage(alert: BudgetAlert): string {
  const pct = Math.round(alert.percent);
  if (alert.status === 'over') {
    return `🔴 ${alert.category_icon} ${alert.category_name} ใช้เกินงบ ${pct}% (${formatTHB(alert.spent)} / ${formatTHB(alert.budget)})`;
  }
  if (alert.status === 'approaching') {
    return `🟡 ${alert.category_icon} ${alert.category_name} ใช้ไป ${pct}% — ใกล้เกินงบ`;
  }
  return `🟢 ${alert.category_icon} ${alert.category_name} อยู่ในงบ ${pct}%`;
}

function formatTHB(n: number): string {
  return '฿' + Math.round(n).toLocaleString('th-TH');
}
