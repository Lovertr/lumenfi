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
  const monthlyIncomeTarget = parseFloat((formData.get('monthly_income_target') as string) || '0') || null;
  const monthlyExpenseTarget = parseFloat((formData.get('monthly_expense_target') as string) || '0') || null;

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      default_currency: defaultCurrency,
      monthly_income_target: monthlyIncomeTarget,
      monthly_expense_target: monthlyExpenseTarget,
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
