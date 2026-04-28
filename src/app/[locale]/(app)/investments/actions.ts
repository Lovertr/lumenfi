'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  symbol: z.string().nullable().optional(),
  type: z.enum([
    'thai_stock',
    'foreign_stock',
    'mutual_fund',
    'etf',
    'crypto',
    'gold',
    'reit',
    'property',
    'bond',
    'fixed_deposit',
    'lottery_savings',
    'other',
  ]),
  broker_account: z.string().nullable().optional(),
  quantity: z.number().min(0),
  avg_cost: z.number().min(0),
  current_price: z.number().min(0).nullable().optional(),
  currency: z.string().default('THB'),
});

export async function createInvestment(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const num = (key: string) => parseFloat((formData.get(key) as string) ?? '0');

  const parsed = createSchema.safeParse({
    name: formData.get('name'),
    symbol: formData.get('symbol') || null,
    type: formData.get('type'),
    broker_account: formData.get('broker_account') || null,
    quantity: num('quantity'),
    avg_cost: num('avg_cost'),
    current_price: num('current_price') || null,
    currency: formData.get('currency') || 'THB',
  });

  if (!parsed.success) {
    return { error: 'invalid_data' as const };
  }

  const { error } = await supabase.from('investments').insert({
    ...parsed.data,
    user_id: user.id,
  });

  if (error) {
    console.error('createInvestment:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/investments');
  redirect('/investments');
}

export async function deleteInvestment(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  await supabase.from('investments').update({ archived: true }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/investments');
}
