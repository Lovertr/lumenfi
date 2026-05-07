'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  investment_id: z.string().uuid(),
  mode: z.enum(['amount', 'quantity']),
  amount_per_run: z.number().min(0).nullable().optional(),
  quantity_per_run: z.number().min(0).nullable().optional(),
  day_of_month: z.number().int().min(1).max(31),
  is_active: z.boolean().default(true),
  start_date: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

function effectiveDay(year: number, month: number, day: number): string {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last)).toISOString().slice(0, 10);
}

function nextRunDate(dayOfMonth: number, today = new Date()): string {
  const y = today.getFullYear();
  const m = today.getMonth();
  const todayStr = today.toISOString().slice(0, 10);
  const thisMonth = effectiveDay(y, m, dayOfMonth);
  return thisMonth >= todayStr ? thisMonth : effectiveDay(y, m + 1, dayOfMonth);
}

export async function createRecurringInvestment(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const num = (key: string) => {
    const v = (formData.get(key) as string) ?? '';
    const n = parseFloat(v.replace(/,/g, ''));
    return isFinite(n) ? n : 0;
  };

  const mode = (formData.get('mode') as string) || 'amount';
  const amount = num('amount_per_run');
  const qty = num('quantity_per_run');
  const day = parseInt((formData.get('day_of_month') as string) ?? '1', 10) || 1;

  const parsed = schema.safeParse({
    investment_id: formData.get('investment_id'),
    mode: mode as 'amount' | 'quantity',
    amount_per_run: mode === 'amount' && amount > 0 ? amount : null,
    quantity_per_run: mode === 'quantity' && qty > 0 ? qty : null,
    day_of_month: day,
    is_active: formData.get('is_active') !== 'false',
    start_date: (formData.get('start_date') as string) || null,
    note: (formData.get('note') as string) || null,
  });

  if (!parsed.success) return { error: 'invalid_data' as const };

  const data = parsed.data;
  const startDate = data.start_date ? new Date(data.start_date) : new Date();
  const next_run_on = nextRunDate(data.day_of_month, startDate);

  const { error } = await supabase.from('recurring_investments').insert({
    user_id: user.id,
    investment_id: data.investment_id,
    amount_per_run: data.amount_per_run,
    quantity_per_run: data.quantity_per_run,
    day_of_month: data.day_of_month,
    is_active: data.is_active,
    next_run_on,
    note: data.note,
  });

  if (error) {
    console.error('createRecurringInvestment:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/investments/recurring');
  redirect('/investments/recurring');
}

export async function toggleRecurringInvestment(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = formData.get('id') as string;
  const isActive = formData.get('is_active') === 'true';
  if (!id) return;

  await supabase
    .from('recurring_investments')
    .update({ is_active: !isActive })
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath('/investments/recurring');
}

export async function deleteRecurringInvestment(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = formData.get('id') as string;
  if (!id) return;

  await supabase.from('recurring_investments').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/investments/recurring');
}
