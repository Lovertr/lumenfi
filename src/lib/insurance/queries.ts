import { createClient } from '@/lib/supabase/server';
import type { InsuranceContext, ExistingPolicy } from './gap-analyzer';

export async function getInsuranceContext(): Promise<InsuranceContext | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileR, txR, debtsR, accountsR, policiesR] = await Promise.all([
    supabase.from('profiles').select('date_of_birth, num_dependents, monthly_income, monthly_expense_estimate').eq('id', user.id).maybeSingle(),
    supabase.from('transactions').select('type, amount, date, category_id').eq('user_id', user.id).gte('date', new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10)),
    supabase.from('debts').select('current_balance').eq('user_id', user.id),
    supabase.from('accounts').select('id, type, initial_balance').eq('user_id', user.id).eq('archived', false),
    supabase.from('insurance_policies').select('type, sum_insured, annual_premium').eq('user_id', user.id),
  ]);

  const profile = profileR.data;
  const txs = txR.data ?? [];
  const debts = debtsR.data ?? [];
  const accounts = accountsR.data ?? [];
  const policies = (policiesR.data ?? []) as ExistingPolicy[];

  // Compute age from DOB
  let age: number | null = null;
  if (profile?.date_of_birth) {
    const dob = new Date(profile.date_of_birth);
    const diff = Date.now() - dob.getTime();
    age = Math.floor(diff / (365.25 * 86400000));
  }

  // Income/expense averages from last 6 months
  const incomeTxs = txs.filter((t) => t.type === 'income');
  const expenseTxs = txs.filter((t) => t.type === 'expense');
  const sumIncome = incomeTxs.reduce((s, t) => s + Number(t.amount), 0);
  const sumExpense = expenseTxs.reduce((s, t) => s + Number(t.amount), 0);
  const months = Math.max(1, Math.min(6, txs.length > 0 ? 6 : 1));

  const monthlyIncome = sumIncome > 0 ? sumIncome / months : Number(profile?.monthly_income ?? 0);
  const monthlyExpense = sumExpense > 0 ? sumExpense / months : Number(profile?.monthly_expense_estimate ?? 0);

  // Total debt
  const totalDebt = debts.reduce((s, d) => s + Number(d.current_balance ?? 0), 0);

  // Emergency fund = sum of cash + savings + bank assets
  const emergencyFund = accounts
    .filter((a) => ['cash', 'bank', 'savings', 'e_wallet'].includes(a.type))
    .reduce((s, a) => s + Number(a.initial_balance ?? 0), 0);

  // Health spending (last 6mo)
  const monthlyHealthExpense = 0; // Would need category lookup; left for AI prompt to handle

  return {
    age,
    monthlyIncome,
    monthlyExpense,
    totalDebt,
    monthlyDebtPayment: 0, // could query debts.monthly_payment but optional
    emergencyFund,
    numDependents: Number(profile?.num_dependents ?? 0),
    hasHealthExpenses: false,
    monthlyHealthExpense,
    existingPolicies: policies,
  };
}
