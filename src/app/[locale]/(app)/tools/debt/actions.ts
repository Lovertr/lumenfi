'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface PayoffOrderItem { debt_id: string; name: string; month: number; }

export async function saveDebtPlan(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const strategy = formData.get('strategy') as 'avalanche' | 'snowball';
  const extraStr = (formData.get('extra_per_month') as string)?.replace(/,/g, '') ?? '0';
  const extra = parseFloat(extraStr) || 0;
  const totalMonths = parseInt((formData.get('total_months') as string) ?? '0', 10) || 0;
  const totalInterestStr = (formData.get('total_interest') as string)?.replace(/,/g, '') ?? '0';
  const totalInterest = parseFloat(totalInterestStr) || 0;

  let payoffOrder: PayoffOrderItem[] = [];
  try {
    const raw = formData.get('payoff_order') as string;
    if (raw) payoffOrder = JSON.parse(raw);
  } catch {
    payoffOrder = [];
  }

  // Deactivate any existing active plan
  await supabase
    .from('debt_plans')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_active', true);

  const { error } = await supabase.from('debt_plans').insert({
    user_id: user.id,
    strategy,
    extra_per_month: extra,
    total_months: totalMonths,
    total_interest: totalInterest,
    payoff_order: payoffOrder,
    is_active: true,
  });

  if (error) {
    console.error('saveDebtPlan:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/debts');
  revalidatePath('/tools/debt');
  return { ok: true };
}

export async function deactivateDebtPlan() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase
    .from('debt_plans')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_active', true);

  revalidatePath('/debts');
  revalidatePath('/tools/debt');
}
