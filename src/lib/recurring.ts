/**
 * Recurring transaction materializer.
 * Called server-side on dashboard / transactions page load to insert any due rows.
 */
import { createClient } from '@/lib/supabase/server';

interface Recurring {
  id: string;
  user_id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  goal_id: string | null;
  day_of_month: number;
  note: string | null;
  is_active: boolean;
  last_run_on: string | null;
  start_date: string;
  end_date: string | null;
  notify_enabled: boolean;
  notify_days_before: number;
}

function effectiveDayThisMonth(year: number, month: number, dayOfMonth: number): string {
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
    if (dueThisMonth > todayStr) continue;
    if (r.last_run_on && r.last_run_on >= dueThisMonth) continue;

    const txDate = dueThisMonth;
    const insertData: Record<string, unknown> = {
      user_id: r.user_id,
      type: r.type,
      amount: r.amount,
      account_id: r.account_id,
      category_id: r.type === 'transfer' ? null : r.category_id,
      goal_id: r.goal_id,
      recurring_id: r.id,
      date: txDate,
      note: r.note ? `${r.note} (อัตโนมัติ)` : 'รายการประจำ (อัตโนมัติ)',
    };
    if (r.type === 'transfer') {
      insertData.to_account_id = r.to_account_id;
    }

    const { error: insErr } = await supabase.from('transactions').insert(insertData);

    if (!insErr) {
      // Goal contribution if linked & not auto-synced
      if (r.goal_id) {
        const { data: goal } = await supabase
          .from('goals')
          .select('current_amount, linked_account_ids')
          .eq('id', r.goal_id)
          .eq('user_id', r.user_id)
          .maybeSingle();
        if (goal && (!goal.linked_account_ids || goal.linked_account_ids.length === 0)) {
          await supabase
            .from('goals')
            .update({ current_amount: Number(goal.current_amount ?? 0) + Number(r.amount) })
            .eq('id', r.goal_id)
            .eq('user_id', r.user_id);
        }
      }

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
    return thisMonth;
  }
  const nextLast = new Date(y, m + 2, 0).getDate();
  const dNext = Math.min(dayOfMonth, nextLast);
  return new Date(y, m + 1, dNext).toISOString().slice(0, 10);
}

/**
 * Returns recurring rules that are due to be notified about (notify_enabled, within notify_days_before window, not yet notified for this period).
 */
export async function getUpcomingNotifications() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('recurring_transactions')
    .select(`
      id, type, amount, day_of_month, note, last_run_on, last_notified_on,
      notify_enabled, notify_days_before,
      account:accounts!recurring_transactions_account_id_fkey(name),
      category:categories(name, icon)
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .eq('notify_enabled', true);

  if (!data) return [];

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  return (data as any[]).filter((r) => {
    const next = nextRunDate(r.day_of_month, r.last_run_on, today);
    const daysUntil = Math.floor(
      (new Date(next).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
    );
    return (
      daysUntil >= 0 &&
      daysUntil <= r.notify_days_before &&
      (!r.last_notified_on || r.last_notified_on < next)
    );
  }).map((r) => ({
    ...r,
    nextDate: nextRunDate(r.day_of_month, r.last_run_on, today),
    daysUntil: Math.floor(
      (new Date(nextRunDate(r.day_of_month, r.last_run_on, today)).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));
}
