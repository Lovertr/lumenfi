'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const numOrNull = (v: FormDataEntryValue | null): number | null => {
  if (!v) return null;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return isFinite(n) ? n : null;
};

export async function completeOnboarding(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const monthlyIncome = numOrNull(formData.get('monthly_income'));
  const monthlyExpense = numOrNull(formData.get('monthly_expense_estimate'));
  const accountName = (formData.get('account_name') as string)?.trim() || null;
  const accountType = (formData.get('account_type') as string) || null;
  const accountBalance = numOrNull(formData.get('initial_balance'));
  const goalName = (formData.get('goal_name') as string)?.trim() || null;
  const goalAmount = numOrNull(formData.get('target_amount'));

  // Update profile
  await supabase
    .from('profiles')
    .update({
      monthly_income: monthlyIncome,
      monthly_expense_estimate: monthlyExpense,
      onboarded: true,
    })
    .eq('id', user.id);

  // Create first account
  if (accountName && accountType) {
    await supabase.from('accounts').insert({
      user_id: user.id,
      name: accountName,
      type: accountType,
      initial_balance: accountBalance ?? 0,
      currency: 'THB',
      color: '#3B82F6',
      include_in_net_worth: true,
    });
  }

  // Create first goal if specified
  if (goalName && goalAmount && goalAmount > 0) {
    await supabase.from('goals').insert({
      user_id: user.id,
      name: goalName,
      target_amount: goalAmount,
      current_amount: 0,
      status: 'active',
      icon: '🎯',
      color: '#7C3AED',
    });
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function skipOnboarding() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase.from('profiles').update({ onboarded: true }).eq('id', user.id);
  revalidatePath('/', 'layout');
  redirect('/dashboard');
}
