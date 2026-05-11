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

  // New: profile context fields
  const employmentTypeRaw = (formData.get('employment_type') as string)?.trim() || null;
  const employmentType =
    employmentTypeRaw && ['employee','freelance','business_owner','student','retired','unemployed','other'].includes(employmentTypeRaw)
      ? employmentTypeRaw
      : null;
  const riskRaw = (formData.get('risk_tolerance') as string)?.trim() || null;
  const riskTolerance =
    riskRaw && ['conservative','moderate','aggressive'].includes(riskRaw) ? riskRaw : null;
  const financialGoalSummary = (formData.get('financial_goal_summary') as string)?.trim() || null;

  // Update profile
  await supabase
    .from('profiles')
    .update({
      monthly_income: monthlyIncome,
      monthly_expense_estimate: monthlyExpense,
      employment_type: employmentType,
      risk_tolerance: riskTolerance,
      financial_goal_summary: financialGoalSummary,
      pay_cycle_day: (() => {
        const v = parseInt((formData.get('pay_cycle_day') as string) || '', 10);
        return Number.isFinite(v) && v >= 1 && v <= 31 ? v : null;
      })(),
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
