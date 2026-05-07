'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function updateProfile(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const fullName = (formData.get('full_name') as string)?.trim() || null;
  const defaultCurrency = (formData.get('default_currency') as string) || 'THB';
  const monthlyIncomeTarget = parseFloat(((formData.get('monthly_income_target') as string) || '0').replace(/,/g, '')) || null;
  const monthlyExpenseTarget = parseFloat(((formData.get('monthly_expense_target') as string) || '0').replace(/,/g, '')) || null;
  const dateOfBirth = (formData.get('date_of_birth') as string) || null;
  const numDependents = parseInt((formData.get('num_dependents') as string) || '0', 10) || 0;
  const monthlyIncome = parseFloat(((formData.get('monthly_income') as string) || '0').replace(/,/g, '')) || null;
  const monthlyExpenseEstimate = parseFloat(((formData.get('monthly_expense_estimate') as string) || '0').replace(/,/g, '')) || null;

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      default_currency: defaultCurrency,
      monthly_income_target: monthlyIncomeTarget,
      monthly_expense_target: monthlyExpenseTarget,
      date_of_birth: dateOfBirth,
      num_dependents: numDependents,
      monthly_income: monthlyIncome,
      monthly_expense_estimate: monthlyExpenseEstimate,
    })
    .eq('id', user.id);

  if (error) {
    console.error('updateProfile:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { success: true as const };
}
