'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const divSchema = z.object({
  investment_id: z.string().uuid(),
  amount: z.number().min(0),
  withholding_tax: z.number().min(0).default(0),
  ex_date: z.string().nullable().optional(),
  pay_date: z.string(),
  note: z.string().nullable().optional(),
});

export async function createDividend(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const num = (key: string) => {
    const v = (formData.get(key) as string) ?? '';
    const n = parseFloat(v.replace(/,/g, ''));
    return isFinite(n) ? n : 0;
  };

  const investment_id = formData.get('investment_id') as string;
  const parsed = divSchema.safeParse({
    investment_id,
    amount: num('amount'),
    withholding_tax: num('withholding_tax'),
    ex_date: (formData.get('ex_date') as string) || null,
    pay_date: formData.get('pay_date'),
    note: (formData.get('note') as string) || null,
  });

  if (!parsed.success) return { error: 'invalid_data' as const };

  const { error } = await supabase.from('investment_dividends').insert({
    user_id: user.id,
    ...parsed.data,
  });

  if (error) {
    console.error('createDividend:', error);
    return { error: 'generic' as const };
  }

  revalidatePath(`/investments/${investment_id}`);
  redirect(`/investments/${investment_id}`);
}

export async function deleteDividend(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = formData.get('id') as string;
  const investment_id = formData.get('investment_id') as string;
  if (!id) return;

  await supabase
    .from('investment_dividends')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath(`/investments/${investment_id}`);
}
