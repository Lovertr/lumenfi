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

  if (isRecurring && type !== 'transfer' && !isNaN(dayOfMonth) && dayOfMonth >= 1 && dayOfMonth <= 31) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const { error: recErr } = await supabase.from('recurring_transactions').insert({
      user_id: user.id,
      type,
      amount,
      account_id,
      category_id,
      goal_id,
      day_of_month: dayOfMonth,
      note,
      is_active: true,
      last_run_on: todayStr,
      start_date: todayStr,
    });
    if (recErr) {
      console.error('createRecurring:', recErr);
    }
  }

  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  revalidatePath('/recurring');
  redirect('/transactions');
}

export async function deleteTransaction(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/transactions');
  revalidatePath('/dashboard');
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
