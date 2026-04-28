'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive(),
  account_id: z.string().uuid(),
  category_id: z.string().uuid().nullable().optional(),
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

  const date = (formData.get('date') as string) || new Date().toISOString();
  const note = (formData.get('note') as string) || null;

  const parsed = createSchema.safeParse({
    type,
    amount,
    account_id,
    category_id,
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

  revalidatePath('/transactions');
  revalidatePath('/dashboard');
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
