'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const num = (raw: FormDataEntryValue | null): number | null => {
  if (!raw) return null;
  const s = String(raw).replace(/,/g, '').trim();
  if (!s) return null;
  const n = parseFloat(s);
  return isFinite(n) && n > 0 ? n : null;
};

const txt = (raw: FormDataEntryValue | null): string | null => {
  const s = (raw as string)?.trim();
  return s || null;
};

export async function updateProfile(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const employmentType = txt(formData.get('employment_type'));
  const riskTolerance = txt(formData.get('risk_tolerance'));
  const investmentExperience = txt(formData.get('investment_experience'));

  const { error } = await supabase
    .from('profiles')
    .update({
      // Basic
      full_name: txt(formData.get('full_name')),
      default_currency: (formData.get('default_currency') as string) || 'THB',
      date_of_birth: txt(formData.get('date_of_birth')),
      num_dependents: parseInt((formData.get('num_dependents') as string) || '0', 10) || 0,

      // Demographic
      occupation: txt(formData.get('occupation')),
      employment_type: employmentType && ['employee','freelance','business_owner','student','retired','unemployed','other'].includes(employmentType) ? employmentType : null,
      province: txt(formData.get('province')),
      risk_tolerance: riskTolerance && ['conservative','moderate','aggressive'].includes(riskTolerance) ? riskTolerance : null,
      investment_experience: investmentExperience && ['beginner','intermediate','expert'].includes(investmentExperience) ? investmentExperience : null,
      financial_goal_summary: txt(formData.get('financial_goal_summary')),

      // Income breakdown
      income_salary_monthly: num(formData.get('income_salary_monthly')),
      income_side_monthly: num(formData.get('income_side_monthly')),
      income_investment_monthly: num(formData.get('income_investment_monthly')),
      income_other_monthly: num(formData.get('income_other_monthly')),

      // Expense breakdown
      expense_food_monthly: num(formData.get('expense_food_monthly')),
      expense_utilities_monthly: num(formData.get('expense_utilities_monthly')),
      expense_phone_internet_monthly: num(formData.get('expense_phone_internet_monthly')),
      expense_transport_monthly: num(formData.get('expense_transport_monthly')),
      expense_housing_monthly: num(formData.get('expense_housing_monthly')),
      expense_debt_payment_monthly: num(formData.get('expense_debt_payment_monthly')),
      expense_insurance_monthly: num(formData.get('expense_insurance_monthly')),
      expense_subscription_monthly: num(formData.get('expense_subscription_monthly')),
      expense_other_monthly: num(formData.get('expense_other_monthly')),

      // Aggregated
      monthly_income: num(formData.get('monthly_income')),
      monthly_expense_estimate: num(formData.get('monthly_expense_estimate')),
      monthly_income_target: num(formData.get('monthly_income_target')),
      monthly_expense_target: num(formData.get('monthly_expense_target')),

      // Pay cycle
      pay_cycle_day: (() => {
        const v = parseInt((formData.get('pay_cycle_day') as string) || '', 10);
        return Number.isFinite(v) && v >= 1 && v <= 31 ? v : null;
      })(),
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
