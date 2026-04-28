/**
 * Recurring transaction materializer.
 * Called server-side on dashboard / transactions page load to insert any due rows.
 */
import { createClient } from '@/lib/supabase/server';

interface Recurring {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  account_id: string;
  category_id: string | null;
  goal_id: string | null;
  day_of_month: number;
  note: string | null;
  is_active: boolean;
  last_run_on: string | null;
  start_date: string;
  end_date: string | null;
}

/**
 * Returns the date on which `r` should next run, given today.
 * If today's day-of-month >= day_of_month and we haven't run this period, return today's effective day.
 */
function effectiveDayThisMonth(year: number, month: number, dayOfMonth: number): string {
  // Clamp day_of_month to last day of month (e.g. day=31 in Feb → 28/29)
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(dayOfMonth, lastDay);
  const d = new Date(year, month, day);
  return d.toISOString().slice(0, 10);
}

export async function materializeDueRecurring(): Promise<number> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: rows, error } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true);
  if (error || !rows) return 0;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const y = today.getFullYear();
  const m = today.getMonth();

  let inserted = 0;

  for (const r of rows as Recurring[]) {
    if (r.start_date && r.start_date > todayStr) continue;
    if (r.end_date && r.end_date < todayStr) continue;

    const dueThisMonth = effectiveDayThisMonth(y, m, r.day_of_month);
    if (dueThisMonth > todayStr) continue; // not yet due this month
    if (r.last_run_on && r.last_run_on >= dueThisMonth) continue; // already run for this period

    const txDate = dueThisMonth;
    const { error: insErr } = await supabase.from('transactions').insert({
      user_id: r.user_id,
      type: r.type,
      amount: r.amount,
      account_id: r.account_id,
      category_id: r.category_id,
      goal_id: r.goal_id,
      recurring_id: r.id,
      date: txDate,
      note: r.note ? `${r.note} (อัตโนมัติ)` : 'รายการประจำ (อัตโนมัติ)',
    });

    if (!insErr) {
      await supabase
        .from('recurring_transactions')
        .update({ last_run_on: txDate, updated_at: new Date().toISOString() })
        .eq('id', r.id);
      inserted++;
    }
  }

  return inserted;
}

export function nextRunDate(dayOfMonth: number, lastRunOn: string | null, today = new Date()): string {
  const y = today.getFullYear();
  const m = today.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const dThis = Math.min(dayOfMonth, lastDay);
  const thisMonth = new Date(y, m, dThis).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  if (thisMonth > todayStr && (!lastRunOn || lastRunOn < thisMonth)) {
    return thisMonth;
  }
  if (thisMonth <= todayStr && (!lastRunOn || lastRunOn < thisMonth)) {
    return thisMonth; // due today/overdue
  }
  // already ran this month → next month
  const nextLast = new Date(y, m + 2, 0).getDate();
  const dNext = Math.min(dayOfMonth, nextLast);
  return new Date(y, m + 1, dNext).toISOString().slice(0, 10);
}
