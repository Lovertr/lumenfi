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
  bank_name: z.string().max(100).nullable().optional(),
  account_number: z.string().max(30).nullable().optional(),
  account_holder: z.string().max(100).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  statement_day: z.number().int().min(1).max(31).nullable().optional(),
  due_day: z.number().int().min(1).max(31).nullable().optional(),
});

function parseFormFields(formData: FormData) {
  const rawType = formData.get('type');
  if (!VALID_TYPES.includes(rawType as AccountType)) {
    return { error: 'type_required' as const };
  }
  const balanceStr = (formData.get('initial_balance') as string) ?? '0';
  const balance = parseFloat(balanceStr.replace(/,/g, ''));

  const intOrNull = (key: string): number | null => {
    const v = formData.get(key) as string;
    if (!v) return null;
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  };
  const strOrNull = (key: string): string | null => {
    const v = formData.get(key) as string;
    return v && v.trim() ? v.trim() : null;
  };

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
    bank_name: strOrNull('bank_name'),
    account_number: strOrNull('account_number'),
    account_holder: strOrNull('account_holder'),
    note: strOrNull('note'),
    statement_day: intOrNull('statement_day'),
    due_day: intOrNull('due_day'),
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

/**
 * Reconcile an account's balance to a user-asserted number.
 * Stores an entry in account_balance_adjustments which the balance
 * computation treats as a snapshot — older transactions are absorbed,
 * newer ones continue to accumulate.
 */
export async function adjustAccountBalance(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const accountId = (formData.get('account_id') as string) ?? '';
  const newBalanceStr = (formData.get('new_balance') as string) ?? '';
  const reason = ((formData.get('reason') as string) ?? '').trim() || null;
  const effectiveDateStr = (formData.get('effective_date') as string) ?? '';

  if (!accountId) return { error: 'missing_account' };
  const newBalance = Number(newBalanceStr.replace(/,/g, ''));
  if (!Number.isFinite(newBalance)) return { error: 'invalid_balance' };

  const effective_date = /^\d{4}-\d{2}-\d{2}$/.test(effectiveDateStr)
    ? effectiveDateStr
    : new Date().toISOString().slice(0, 10);

  // Compute current balance via the same helper the UI uses so previous_balance
  // is consistent with what the user just saw on screen.
  const { getAccountBalanceMap } = await import('@/lib/queries/balances');
  const map = await getAccountBalanceMap();
  const previousBalance = Number(map[accountId] ?? 0);
  const delta = newBalance - previousBalance;

  const { error } = await supabase.from('account_balance_adjustments').insert({
    user_id: user.id,
    account_id: accountId,
    new_balance: newBalance,
    previous_balance: previousBalance,
    delta,
    reason,
    effective_date,
  });
  if (error) {
    console.error('adjust balance error', error);
    return { error: 'db_error' };
  }

  revalidatePath('/accounts');
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath('/dashboard');
  return { ok: true };
}

/**
 * Get adjustment history for one account (most recent first).
 */
export async function getAdjustmentHistory(accountId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('account_balance_adjustments')
    .select('id, new_balance, previous_balance, delta, reason, effective_date, created_at')
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .order('effective_date', { ascending: false })
    .limit(20);
  return data ?? [];
}
