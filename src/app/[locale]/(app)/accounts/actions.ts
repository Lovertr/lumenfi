'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { AccountType } from '@/components/accounts/account-type-config';

const VALID_TYPES: AccountType[] = ['cash', 'bank', 'credit_card', 'e_wallet', 'savings', 'other'];

const baseSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['cash', 'bank', 'credit_card', 'e_wallet', 'savings', 'other']),
  initial_balance: z.number(),
  currency: z.string().default('THB'),
  color: z.string().default('#3B82F6'),
  credit_limit: z.number().nullable().optional(),
  include_in_net_worth: z.boolean().default(true),
});

function parseFormFields(formData: FormData) {
  const rawType = formData.get('type');
  if (!VALID_TYPES.includes(rawType as AccountType)) {
    return { error: 'type_required' as const };
  }
  const balanceStr = (formData.get('initial_balance') as string) ?? '0';
  const balance = parseFloat(balanceStr.replace(/,/g, ''));
  const parsed = baseSchema.safeParse({
    name: formData.get('name'),
    type: rawType,
    initial_balance: isNaN(balance) ? 0 : balance,
    currency: formData.get('currency') ?? 'THB',
    color: formData.get('color') ?? '#3B82F6',
    credit_limit: formData.get('credit_limit')
      ? parseFloat(formData.get('credit_limit') as string)
      : null,
    include_in_net_worth: formData.get('include_in_net_worth') === 'on',
  });
  if (!parsed.success) {
    return { error: 'name_required' as const };
  }
  return { data: parsed.data };
}

export async function createAccount(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = parseFormFields(formData);
  if ('error' in result) return { error: result.error };

  const { error } = await supabase.from('accounts').insert({
    ...result.data,
    user_id: user.id,
  });

  if (error) {
    console.error('createAccount error:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/accounts');
  redirect('/accounts');
}

export async function updateAccount(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = formData.get('id') as string;
  if (!id) return { error: 'generic' as const };

  const result = parseFormFields(formData);
  if ('error' in result) return { error: result.error };

  const { error } = await supabase
    .from('accounts')
    .update(result.data)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('updateAccount error:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/accounts');
  revalidatePath('/dashboard');
  redirect('/accounts');
}

export async function deleteAccount(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase.from('accounts').update({ archived: true }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/accounts');
  revalidatePath('/dashboard');
  redirect('/accounts');
}
