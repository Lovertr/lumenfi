// ─────────────────────────────────────────────────────────
// AI Financial Secretary — proactive insight detection
// Detects significant changes/concerns in user's finances
// and generates short notification messages.
// ─────────────────────────────────────────────────────────

import { createServiceClient } from '@/lib/supabase/admin';

export type InsightSeverity = 'critical' | 'warn' | 'info' | 'good';

export interface SecretaryInsight {
  severity: InsightSeverity;
  title: string;
  body: string;
  url: string; // deep link in Lumenfi
  tag: string; // for push dedup
}

interface DebtRow { current_balance: number; interest_rate: number; monthly_payment: number; }
interface InvRow { quantity: number; current_price: number | null; avg_cost: number; currency: string; }
interface GoalRow { name: string; target_amount: number; current_amount: number; deadline: string | null; is_emergency_fund: boolean; }
interface BudgetRow { category_id: string; amount: number; }

/**
 * Detect insights worth pinging a user about.
 * Rule-based for clear thresholds, returns ALL detected items.
 * Cron picks the highest-severity 1-2 to send (avoid notification fatigue).
 */
export async function detectInsightsForUser(userId: string): Promise<SecretaryInsight[]> {
  const supabase = createServiceClient();
  const insights: SecretaryInsight[] = [];

  // Pull user's data
  const [accountsRes, debtsRes, goalsRes, budgetsRes, txMonthRes, investmentsRes, profileRes] = await Promise.all([
    supabase.from('accounts').select('id, type, initial_balance, include_in_net_worth').eq('user_id', userId).eq('archived', false),
    supabase.from('debts').select('current_balance, interest_rate, monthly_payment').eq('user_id', userId).eq('status', 'active'),
    supabase.from('goals').select('name, target_amount, current_amount, deadline, is_emergency_fund').eq('user_id', userId).eq('status', 'active'),
    supabase.from('budgets').select('category_id, amount').eq('user_id', userId).gt('amount', 0),
    supabase
      .from('transactions')
      .select('type, amount, date, category_id')
      .eq('user_id', userId)
      .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
    supabase.from('investments').select('quantity, current_price, avg_cost, currency').eq('user_id', userId).eq('archived', false),
    supabase
      .from('profiles')
      .select('secretary_last_notified_on, ai_provider, ai_api_key_encrypted, watchlist_alert_last_sent_on')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Skip if already sent today
  if (profileRes.data?.secretary_last_notified_on === todayStr) {
    return [];
  }

  const txs = (txMonthRes.data ?? []) as { type: string; amount: number; date: string; category_id: string | null }[];
  const monthIncome = txs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const monthExpense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const debts = (debtsRes.data ?? []) as DebtRow[];
  const totalDebtPayment = debts.reduce((s, d) => s + Number(d.monthly_payment ?? 0), 0);
  const dti = monthIncome > 0 ? totalDebtPayment / monthIncome : 0;

  // ─── Insight 1: DTI dangerous ───
  if (dti > 0.5 && monthIncome > 0) {
    insights.push({
      severity: 'critical',
      title: '🚨 หนี้สูงเกินอันตราย',
      body: `DTI ของคุณ ${(dti * 100).toFixed(0)}% เกิน 50% — รายได้เกินครึ่งใช้จ่ายหนี้ ควรปลดหนี้ด่วน`,
      url: '/advisor',
      tag: 'lumenfi-dti-critical',
    });
  } else if (dti > 0.4 && monthIncome > 0) {
    insights.push({
      severity: 'warn',
      title: '⚠️ DTI เริ่มเสี่ยง',
      body: `DTI ${(dti * 100).toFixed(0)}% เกิน 40% — ขอ AI วิเคราะห์กลยุทธ์ปลดหนี้`,
      url: '/advisor',
      tag: 'lumenfi-dti-warn',
    });
  }

  // ─── Insight 2: Emergency Fund ───
  // Estimate EF as cash/savings accounts
  const accounts = (accountsRes.data ?? []) as { id: string; type: string; initial_balance: number; include_in_net_worth: boolean }[];
  const cashLikeBalance = accounts
    .filter((a) => ['cash', 'bank', 'savings', 'e-wallet', 'ewallet'].includes(a.type))
    .reduce((s, a) => s + Number(a.initial_balance ?? 0), 0);
  const efMonths = monthExpense > 0 ? cashLikeBalance / monthExpense : 0;
  if (monthExpense > 0 && efMonths < 1) {
    insights.push({
      severity: 'critical',
      title: '🚨 Emergency Fund ต่ำกว่าขั้นต่ำ',
      body: `เงินสดของคุณ < 1 เดือนของรายจ่าย — ถ้ามีเหตุไม่คาดฝันจะลำบาก`,
      url: '/advisor',
      tag: 'lumenfi-ef-critical',
    });
  } else if (monthExpense > 0 && efMonths < 3) {
    insights.push({
      severity: 'warn',
      title: '⚠️ Emergency Fund ยังไม่ถึง 3 เดือน',
      body: `ตอนนี้คุณมีเงินสำรอง ${efMonths.toFixed(1)} เดือน ขั้นต่ำควรมี 3 เดือน`,
      url: '/advisor',
      tag: 'lumenfi-ef-warn',
    });
  }

  // ─── Insight 3: Goal deadline approaching but progress slow ───
  const goals = (goalsRes.data ?? []) as GoalRow[];
  const today = new Date();
  for (const g of goals) {
    if (!g.deadline) continue;
    const target = Number(g.target_amount);
    const current = Number(g.current_amount);
    if (target <= 0) continue;
    const progressPct = (current / target) * 100;
    const daysToGoal = Math.ceil((new Date(g.deadline).getTime() - today.getTime()) / 86400000);
    if (daysToGoal > 0 && daysToGoal <= 90 && progressPct < 75) {
      insights.push({
        severity: 'warn',
        title: `🎯 เป้า "${g.name}" ใกล้ deadline`,
        body: `อีก ${daysToGoal} วัน progress ${progressPct.toFixed(0)}% — ต้องเร่งหรือปรับเป้า`,
        url: '/goals',
        tag: `lumenfi-goal-${g.deadline}`,
      });
      break; // only one goal alert per day
    }
  }

  // ─── Insight 4: Year-end tax cap not used ───
  const month = today.getMonth(); // 0-11
  if (month >= 10) {
    // Nov-Dec
    const yearStart = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const { data: taxFunds } = await supabase
      .from('investments')
      .select('quantity, avg_cost, created_at')
      .eq('user_id', userId)
      .eq('is_tax_saving', true)
      .gte('created_at', yearStart);
    const contributedThisYear = (taxFunds ?? []).reduce(
      (s, h: any) => s + Number(h.quantity) * Number(h.avg_cost),
      0
    );
    // Rough threshold: if contributed < 50,000 baht, suggest more contributions
    if (contributedThisYear < 50_000 && monthIncome > 30_000) {
      insights.push({
        severity: 'info',
        title: '🧾 ใกล้สิ้นปีแล้ว — ลดหย่อนภาษียัง?',
        body: `ปีนี้สมทบ RMF/SSF เพียง ฿${Math.round(contributedThisYear).toLocaleString()} — ขอ AI ช่วยวางแผน`,
        url: '/advisor',
        tag: 'lumenfi-tax-yearend',
      });
    }
  }

  // ─── Insight 5: Investment concentration > 25% in one holding ───
  const invs = (investmentsRes.data ?? []) as InvRow[];
  if (invs.length > 1) {
    let total = 0;
    let max = 0;
    for (const i of invs) {
      const v = Number(i.quantity) * Number(i.current_price ?? i.avg_cost);
      total += v;
      if (v > max) max = v;
    }
    if (total > 0 && max / total > 0.4) {
      insights.push({
        severity: 'warn',
        title: '📊 พอร์ตกระจุกตัวสูง',
        body: `${(max / total * 100).toFixed(0)}% ของพอร์ตอยู่ในตัวเดียว — ขอ AI แนะนำ rebalance`,
        url: '/advisor',
        tag: 'lumenfi-concentration',
      });
    }
  }

  // ─── Insight 6: Budget overspend (top category) ───
  const budgets = (budgetsRes.data ?? []) as BudgetRow[];
  const expenseByCat = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== 'expense' || !t.category_id) continue;
    expenseByCat.set(t.category_id, (expenseByCat.get(t.category_id) ?? 0) + Number(t.amount));
  }
  for (const b of budgets) {
    const spent = expenseByCat.get(b.category_id) ?? 0;
    const ratio = Number(b.amount) > 0 ? spent / Number(b.amount) : 0;
    if (ratio > 1.0) {
      insights.push({
        severity: 'warn',
        title: '💸 Budget เกินแล้ว',
        body: `หมวดนี้ใช้ไป ${(ratio * 100).toFixed(0)}% ของงบ (เกิน ฿${Math.round(spent - Number(b.amount)).toLocaleString()})`,
        url: '/budgets',
        tag: `lumenfi-budget-over-${b.category_id}`,
      });
      break; // only one budget alert per day
    }
  }

  // ─── Insight 7: Stale data — no transactions in 7 days ───
  const last = txs.length > 0 ? txs.map((t) => t.date).sort().pop() : null;
  if (last) {
    const daysSince = Math.floor((today.getTime() - new Date(last).getTime()) / 86400000);
    if (daysSince >= 7) {
      insights.push({
        severity: 'info',
        title: '📝 ลืมบันทึกรายการรึเปล่า',
        body: `ไม่ได้บันทึกธุรกรรมมา ${daysSince} วัน — สแกนสลิปด่วนๆ ก็ได้`,
        url: '/transactions/scan',
        tag: 'lumenfi-stale',
      });
    }
  }

  return insights;
}

/**
 * Pick the most important insight to notify about (1 per day max)
 */
export function pickTopInsight(insights: SecretaryInsight[]): SecretaryInsight | null {
  if (insights.length === 0) return null;
  const order: Record<InsightSeverity, number> = { critical: 0, warn: 1, info: 2, good: 3 };
  return [...insights].sort((a, b) => order[a.severity] - order[b.severity])[0];
}
