'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive(),
  account_id: z.string().uuid(),
  to_account_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  goal_id: z.string().uuid().nullable().optional(),
  date: z.string(),
  note: z.string().max(500).nullable().optional(),
});

async function applyGoalContribution(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  goalId: string,
  amount: number,
  type: 'income' | 'expense' | 'transfer'
) {
  // Skip if goal is auto-synced from accounts (current_amount derives from account balances)
  const { data: goal } = await supabase
    .from('goals')
    .select('id, current_amount, linked_account_ids')
    .eq('id', goalId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!goal) return;
  // If goal is auto-synced from linked accounts, skip manual update — page reads from accounts
  if (goal.linked_account_ids && goal.linked_account_ids.length > 0) return;

  // For income or transfer-in-style → add; for expense (rare goal use) → still add
  // (User's mental model: "I'm contributing this amount toward this goal")
  const next = Number(goal.current_amount ?? 0) + amount;

  await supabase
    .from('goals')
    .update({ current_amount: next })
    .eq('id', goalId)
    .eq('user_id', userId);
}

export async function createTransaction(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const amountStr = (formData.get('amount') as string)?.replace(/,/g, '') ?? '0';
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    return { error: 'amount_required' as const };
  }

  const account_id = formData.get('account_id') as string;
  if (!account_id) return { error: 'account_required' as const };

  const type = formData.get('type') as 'income' | 'expense' | 'transfer';
  const category_id = (formData.get('category_id') as string) || null;
  if (type !== 'transfer' && !category_id) {
    return { error: 'category_required' as const };
  }

  const to_account_id = (formData.get('to_account_id') as string) || null;
  if (type === 'transfer') {
    if (!to_account_id) return { error: 'to_account_required' as const };
    if (to_account_id === account_id) return { error: 'transfer_same_account' as const };
  }

  const goal_id = (formData.get('goal_id') as string) || null;
  const date = (formData.get('date') as string) || new Date().toISOString();
  const note = (formData.get('note') as string) || null;
  const isRecurring = formData.get('is_recurring') === 'on';
  const dayOfMonthRaw = formData.get('day_of_month') as string;
  const dayOfMonth = dayOfMonthRaw ? parseInt(dayOfMonthRaw, 10) : NaN;
  const notifyEnabled = formData.get('notify_enabled') === 'on';
  const notifyDaysBefore = parseInt((formData.get('notify_days_before') as string) ?? '0', 10) || 0;

  const parsed = createSchema.safeParse({
    type,
    amount,
    account_id,
    to_account_id: type === 'transfer' ? to_account_id : null,
    category_id,
    goal_id,
    date,
    note,
  });
  if (!parsed.success) {
    return { error: 'generic' as const };
  }

  const { error } = await supabase.from('transactions').insert({
    ...parsed.data,
    user_id: user.id,
  });

  if (error) {
    console.error('createTransaction:', error);
    return { error: 'generic' as const };
  }

  // Goal contribution (skip if goal is auto-synced from accounts)
  if (goal_id) {
    await applyGoalContribution(supabase, user.id, goal_id, amount, type);
  }

  // Recurring template (now supports transfer too)
  if (isRecurring && !isNaN(dayOfMonth) && dayOfMonth >= 1 && dayOfMonth <= 31) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const { error: recErr } = await supabase.from('recurring_transactions').insert({
      user_id: user.id,
      type,
      amount,
      account_id,
      to_account_id: type === 'transfer' ? to_account_id : null,
      category_id: type === 'transfer' ? null : category_id,
      goal_id,
      day_of_month: dayOfMonth,
      note,
      is_active: true,
      last_run_on: todayStr,
      start_date: todayStr,
      notify_enabled: notifyEnabled,
      notify_days_before: Math.min(14, Math.max(0, notifyDaysBefore)),
    });
    if (recErr) {
      console.error('createRecurring:', recErr);
    }
  }

  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  revalidatePath('/recurring');
  revalidatePath('/goals');
  redirect('/transactions');
}

export async function deleteTransaction(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Reverse the goal contribution if any
  const { data: tx } = await supabase
    .from('transactions')
    .select('goal_id, amount')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (tx?.goal_id) {
    const { data: goal } = await supabase
      .from('goals')
      .select('current_amount, linked_account_ids')
      .eq('id', tx.goal_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (goal && (!goal.linked_account_ids || goal.linked_account_ids.length === 0)) {
      const next = Math.max(0, Number(goal.current_amount ?? 0) - Number(tx.amount));
      await supabase
        .from('goals')
        .update({ current_amount: next })
        .eq('id', tx.goal_id)
        .eq('user_id', user.id);
    }
  }

  await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  revalidatePath('/goals');
}

export async function toggleRecurring(formData: FormData) {
  const id = formData.get('id') as string;
  const next = formData.get('is_active') === 'true';
  if (!id) return;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase
    .from('recurring_transactions')
    .update({ is_active: next, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath('/recurring');
}

export async function deleteRecurring(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase.from('recurring_transactions').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/recurring');
}
