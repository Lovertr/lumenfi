'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const baseSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum([
    'credit_card',
    'personal_loan',
    'auto_loan',
    'mortgage',
    'student_loan',
    'informal',
    'installment_zero',
    'other',
  ]),
  lender: z.string().nullable().optional(),
  original_principal: z.number().positive(),
  current_balance: z.number().min(0),
  interest_rate: z.number().min(0).max(100),
  monthly_payment: z.number().min(0).nullable().optional(),
  total_term: z.number().int().positive().nullable().optional(),
  start_date: z.string(),
});

function parseDebtForm(formData: FormData) {
  const num = (key: string) => parseFloat((formData.get(key) as string) ?? '0');
  const intNum = (key: string) => parseInt((formData.get(key) as string) ?? '0', 10);

  const parsed = baseSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    lender: formData.get('lender') || null,
    original_principal: num('original_principal'),
    current_balance: num('current_balance'),
    interest_rate: num('interest_rate'),
    monthly_payment: num('monthly_payment') || null,
    total_term: intNum('total_term') || null,
    start_date: formData.get('start_date') || new Date().toISOString().slice(0, 10),
  });

  // Type-specific extras
  const rate_type = (formData.get('rate_type') as string) || null;
  const rate_schedule_raw = formData.get('rate_schedule') as string;
  let rate_schedule: any = null;
  try {
    if (rate_schedule_raw) rate_schedule = JSON.parse(rate_schedule_raw);
  } catch {}

  const intOrNull = (k: string) => {
    const v = formData.get(k) as string;
    if (!v) return null;
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  };
  const numOrNull = (k: string) => {
    const v = formData.get(k) as string;
    if (!v) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };
  const strOrNull = (k: string) => {
    const v = formData.get(k) as string;
    return v && v.trim() ? v.trim() : null;
  };

  return {
    parsed,
    extras: {
      rate_type,
      rate_schedule,
      lock_in_months: intOrNull('lock_in_months'),
      promo_end_date: strOrNull('promo_end_date'),
      post_promo_rate: numOrNull('post_promo_rate'),
      credit_limit: numOrNull('credit_limit'),
      statement_day: intOrNull('statement_day'),
      due_day: intOrNull('due_day'),
    },
  };
}

export async function createDebt(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { parsed, extras } = parseDebtForm(formData);
  if (!parsed.success) return { error: 'invalid_data' as const };

  const { error } = await supabase.from('debts').insert({
    ...parsed.data,
    remaining_term: parsed.data.total_term,
    user_id: user.id,
    ...extras,
  });

  if (error) {
    console.error('createDebt:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/debts');
  revalidatePath('/dashboard');
  redirect('/debts');
}

export async function updateDebt(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = formData.get('id') as string;
  if (!id) return { error: 'invalid_data' as const };

  const { parsed, extras } = parseDebtForm(formData);
  if (!parsed.success) return { error: 'invalid_data' as const };

  const { error } = await supabase
    .from('debts')
    .update({
      ...parsed.data,
      ...extras,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('updateDebt:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/debts');
  revalidatePath('/dashboard');
  redirect('/debts');
}

export async function deleteDebt(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  await supabase.from('debts').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/debts');
  revalidatePath('/dashboard');
  redirect('/debts');
}
