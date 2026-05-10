'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive(),
  account_id: z.string().uuid(),
  to_account_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  goal_id: z.string().uuid().nullable().optional(),
  debt_id: z.string().uuid().nullable().optional(),
  date: z.string(),
  note: z.string().max(500).nullable().optional(),
});

async function createInstallmentDebt(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  args: {
    amount: number;
    months: number;
    rate: number;
    accountId: string;
    note: string | null;
    txId?: string | null;
    date: string;
  }
): Promise<string | null> {
  const { months, rate, amount, accountId, note, txId, date } = args;
  if (!Number.isFinite(months) || months < 2 || months > 60) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  // Monthly payment with interest amortization (or even split if rate is 0)
  let monthlyPayment: number;
  if (rate <= 0) {
    monthlyPayment = amount / months;
  } else {
    const r = rate / 100 / 12;
    monthlyPayment = (amount * r) / (1 - Math.pow(1 + r, -months));
  }

  const debtType = rate <= 0 ? 'installment_zero' : 'credit_card';

  const { data: created } = await supabase
    .from('debts')
    .insert({
      user_id: userId,
      name: note ? note.slice(0, 80) + ' (ผ่อน ' + months + ' เดือน)' : 'ผ่อน ' + months + ' เดือน',
      type: debtType,
      original_principal: amount,
      current_balance: amount,
      interest_rate: rate,
      monthly_payment: Math.round(monthlyPayment * 100) / 100,
      total_term: months,
      remaining_term: months,
      start_date: date,
      status: 'active',
      linked_account_id: accountId,
      installment_origin_tx_id: txId ?? null,
    })
    .select('id')
    .single();

  return created?.id ?? null;
}

/**
 * Split a debt payment into principal and interest portions based on
 * the debt's current balance and annual interest rate.
 */
function calculateDebtPaymentSplit(
  currentBalance: number,
  annualRatePercent: number,
  paymentAmount: number
): { principal: number; interest: number } {
  const monthlyRate = (Number(annualRatePercent) || 0) / 100 / 12;
  const interest = Math.min(
    paymentAmount,
    Math.max(0, Number(currentBalance) || 0) * monthlyRate
  );
  const principal = Math.max(0, paymentAmount - interest);
  return {
    principal: Math.round(principal * 100) / 100,
    interest: Math.round(interest * 100) / 100,
  };
}

async function applyDebtPayment(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  debtId: string,
  paymentAmount: number,
  paymentDate: string,
  manualOverride?: { principal?: number | null; interest?: number | null } | null
): Promise<{ principal: number; interest: number; newBalance: number } | null> {
  const { data: debt } = await supabase
    .from('debts')
    .select('id, current_balance, interest_rate, type, start_date, statement_day, rate_type')
    .eq('id', debtId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!debt) return null;

  let split: { principal: number; interest: number };
  if (
    manualOverride &&
    typeof manualOverride.principal === 'number' &&
    typeof manualOverride.interest === 'number' &&
    Number.isFinite(manualOverride.principal) &&
    Number.isFinite(manualOverride.interest) &&
    manualOverride.principal >= 0 &&
    manualOverride.interest >= 0
  ) {
    // Use user-provided split (clamp principal to current balance)
    const principal = Math.min(
      Number(debt.current_balance ?? 0),
      Math.round(manualOverride.principal * 100) / 100
    );
    const interest = Math.round(manualOverride.interest * 100) / 100;
    split = { principal, interest };
  } else {
    const type = String(debt.type ?? '');
    const rateType = String((debt as any).rate_type ?? '');
    const isRevolving =
      type === 'credit_card' || type === 'informal' || type === 'other' ||
      rateType === 'daily_revolving';

    if (isRevolving) {
      // Daily interest accrual baseline:
      //   1) statement_day this/last month (if set)
      //   2) last payment date
      //   3) debt start_date
      //   4) paymentDate (no accrual)
      const { data: lastTx } = await supabase
        .from('transactions')
        .select('date')
        .eq('debt_id', debtId)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Priority: last payment > statement_day-recent > start_date > paymentDate.
      // After a payment, interest accrues from that payment forward — using
      // statement_day in between would under-estimate.
      let baseline: string;
      if (lastTx?.date) {
        baseline = lastTx.date;
      } else {
        const stmtDay = Number((debt as any).statement_day) || 0;
        if (stmtDay >= 1 && stmtDay <= 31) {
          const pay = new Date(paymentDate);
          const candidate = new Date(pay.getFullYear(), pay.getMonth(), stmtDay);
          if (candidate.getTime() > pay.getTime()) {
            candidate.setMonth(candidate.getMonth() - 1);
          }
          const stmtIso = candidate.toISOString().slice(0, 10);
          // Use whichever is later: stmt-recent or start_date (don't go before
          // contract start)
          baseline = debt.start_date && debt.start_date > stmtIso
            ? debt.start_date
            : stmtIso;
        } else {
          baseline = debt.start_date ?? paymentDate;
        }
      }

      const dayMs = 86400000;
      let days = Math.max(
        0,
        Math.floor((new Date(paymentDate).getTime() - new Date(baseline).getTime()) / dayMs)
      );
      if (days < 1) days = 1;
      if (days > 31) days = 31;

      const balance = Math.max(0, Number(debt.current_balance ?? 0));
      const annualRate = (Number(debt.interest_rate) || 0) / 100;
      const interest = Math.min(paymentAmount, balance * annualRate * (days / 365));
      const principal = Math.max(0, paymentAmount - interest);
      split = {
        principal: Math.round(principal * 100) / 100,
        interest: Math.round(interest * 100) / 100,
      };
    } else {
      // Fixed-term loan: standard 30-day amortization
      split = calculateDebtPaymentSplit(
        Number(debt.current_balance ?? 0),
        Number(debt.interest_rate ?? 0),
        paymentAmount
      );
    }
  }

  const newBalance = Math.max(0, Number(debt.current_balance ?? 0) - split.principal);
  await supabase
    .from('debts')
    .update({ current_balance: newBalance })
    .eq('id', debtId)
    .eq('user_id', userId);
  return { ...split, newBalance };
}

async function reverseDebtPayment(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  debtId: string,
  principalAmount: number
) {
  const { data: debt } = await supabase
    .from('debts')
    .select('current_balance')
    .eq('id', debtId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!debt) return;
  const restored = Number(debt.current_balance ?? 0) + Math.max(0, Number(principalAmount) || 0);
  await supabase
    .from('debts')
    .update({ current_balance: restored })
    .eq('id', debtId)
    .eq('user_id', userId);
}

async function applyGoalContribution(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  goalId: string,
  amount: number
) {
  const { data: goal } = await supabase
    .from('goals')
    .select('id, current_amount, linked_account_ids')
    .eq('id', goalId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!goal) return;
  if (goal.linked_account_ids && goal.linked_account_ids.length > 0) return;

  const next = Number(goal.current_amount ?? 0) + amount;
  await supabase
    .from('goals')
    .update({ current_amount: next })
    .eq('id', goalId)
    .eq('user_id', userId);
}

export async function createTransaction(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const amountStr = (formData.get('amount') as string)?.replace(/,/g, '') ?? '0';
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    return { error: 'amount_required' as const };
  }

  const account_id = formData.get('account_id') as string;
  if (!account_id) return { error: 'account_required' as const };

  const type = formData.get('type') as 'income' | 'expense' | 'transfer';
  const category_id = (formData.get('category_id') as string) || null;
  if (type !== 'transfer' && !category_id) {
    return { error: 'category_required' as const };
  }

  const to_account_id = (formData.get('to_account_id') as string) || null;
  if (type === 'transfer') {
    if (!to_account_id) return { error: 'to_account_required' as const };
    if (to_account_id === account_id) return { error: 'transfer_same_account' as const };
  }

  const goal_id = (formData.get('goal_id') as string) || null;
  const debt_id = (formData.get('debt_id') as string) || null;
  const date = (formData.get('date') as string) || new Date().toISOString();
  const note = (formData.get('note') as string) || null;
  const isRecurring = formData.get('is_recurring') === 'on';
  const dayOfMonthRaw = formData.get('day_of_month') as string;
  const dayOfMonth = dayOfMonthRaw ? parseInt(dayOfMonthRaw, 10) : NaN;
  const notifyEnabled = formData.get('notify_enabled') === 'on';
  const notifyDaysBefore = parseInt((formData.get('notify_days_before') as string) ?? '0', 10) || 0;

  const parsed = createSchema.safeParse({
    type,
    amount,
    account_id,
    to_account_id: type === 'transfer' ? to_account_id : null,
    category_id,
    goal_id,
    debt_id: type === 'expense' ? debt_id : null,
    date,
    note,
  });
  if (!parsed.success) {
    return { error: 'generic' as const };
  }

  // Apply debt payment first (so we can store the split on the transaction row).
  // Accept optional manual split from the form to override the type-aware default.
  let debtSplit: { principal: number; interest: number } | null = null;
  if (parsed.data.debt_id) {
    const manualPrincipalRaw = (formData.get('debt_principal_amount') as string) ?? '';
    const manualInterestRaw = (formData.get('debt_interest_amount') as string) ?? '';
    const useManual = (formData.get('debt_split_manual') as string) === 'on';
    const manualOverride = useManual
      ? {
          principal: parseFloat(manualPrincipalRaw.replace(/,/g, '')) || 0,
          interest: parseFloat(manualInterestRaw.replace(/,/g, '')) || 0,
        }
      : null;
    const r = await applyDebtPayment(
      supabase,
      user.id,
      parsed.data.debt_id,
      amount,
      date,
      manualOverride
    );
    if (r) debtSplit = { principal: r.principal, interest: r.interest };
  }

  const { error } = await supabase.from('transactions').insert({
    ...parsed.data,
    user_id: user.id,
    debt_principal_amount: debtSplit?.principal ?? null,
    debt_interest_amount: debtSplit?.interest ?? null,
  });

  if (error) {
    console.error('createTransaction:', error);
    if (parsed.data.debt_id && debtSplit) {
      await reverseDebtPayment(supabase, user.id, parsed.data.debt_id, debtSplit.principal);
    }
    return { error: 'generic' as const };
  }

  if (goal_id) {
    await applyGoalContribution(supabase, user.id, goal_id, amount);
  }

  // Credit card installment: convert this expense to a long-term debt
  const installmentMonths = parseInt((formData.get('installment_months') as string) ?? '0', 10) || 0;
  const installmentRate = parseFloat((formData.get('installment_rate') as string) ?? '0') || 0;
  if (
    type === 'expense' &&
    !parsed.data.debt_id &&
    installmentMonths >= 2 &&
    installmentMonths <= 60
  ) {
    await createInstallmentDebt(supabase, user.id, {
      amount,
      months: installmentMonths,
      rate: installmentRate,
      accountId: account_id,
      note,
      date,
    });
    revalidatePath('/debts');
  }

  if (isRecurring && !isNaN(dayOfMonth) && dayOfMonth >= 1 && dayOfMonth <= 31) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const { error: recErr } = await supabase.from('recurring_transactions').insert({
      user_id: user.id,
      type,
      amount,
      account_id,
      to_account_id: type === 'transfer' ? to_account_id : null,
      category_id: type === 'transfer' ? null : category_id,
      goal_id,
      day_of_month: dayOfMonth,
      note,
      is_active: true,
      last_run_on: todayStr,
      start_date: todayStr,
      notify_enabled: notifyEnabled,
      notify_days_before: Math.min(14, Math.max(0, notifyDaysBefore)),
    });
    if (recErr) {
      console.error('createRecurring:', recErr);
    }
  }

  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  revalidatePath('/recurring');
  revalidatePath('/goals');
  if (parsed.data.debt_id) revalidatePath('/debts');
  redirect('/transactions');
}

export async function createTransactionDirect(formData: FormData) {
  await createTransaction(null, formData);
}

export async function deleteTransaction(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Try the new query (with debt fields). If migration 21 hasn't run, fall back.
  let tx: any = null;
  {
    const r = await supabase
      .from('transactions')
      .select('goal_id, amount, debt_id, debt_principal_amount')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (r.error) {
      const fallback = await supabase
        .from('transactions')
        .select('goal_id, amount')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      tx = fallback.data;
    } else {
      tx = r.data;
    }
  }

  // Reverse debt balance if this was a debt payment
  if (tx?.debt_id && tx?.debt_principal_amount) {
    try {
      await reverseDebtPayment(supabase, user.id, tx.debt_id, Number(tx.debt_principal_amount));
    } catch (e) {
      console.error('reverseDebtPayment failed:', e);
    }
  }

  if (tx?.goal_id) {
    const { data: goal } = await supabase
      .from('goals')
      .select('current_amount, linked_account_ids')
      .eq('id', tx.goal_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (goal && (!goal.linked_account_ids || goal.linked_account_ids.length === 0)) {
      const next = Math.max(0, Number(goal.current_amount ?? 0) - Number(tx.amount));
      await supabase
        .from('goals')
        .update({ current_amount: next })
        .eq('id', tx.goal_id)
        .eq('user_id', user.id);
    }
  }

  await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  revalidatePath('/goals');
  if (tx?.debt_id) revalidatePath('/debts');
  redirect('/transactions');
}



export async function updateTransaction(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = formData.get('id') as string;
  if (!id) return { error: 'invalid_data' as const };

  const amountStr = (formData.get('amount') as string)?.replace(/,/g, '') ?? '0';
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return { error: 'amount_required' as const };

  const account_id = formData.get('account_id') as string;
  if (!account_id) return { error: 'account_required' as const };

  const type = formData.get('type') as 'income' | 'expense' | 'transfer';
  const category_id = (formData.get('category_id') as string) || null;
  if (type !== 'transfer' && !category_id) {
    return { error: 'category_required' as const };
  }

  const to_account_id = (formData.get('to_account_id') as string) || null;
  if (type === 'transfer') {
    if (!to_account_id) return { error: 'to_account_required' as const };
    if (to_account_id === account_id) return { error: 'transfer_same_account' as const };
  }

  const goal_id = (formData.get('goal_id') as string) || null;
  const date = (formData.get('date') as string) || new Date().toISOString();
  const note = (formData.get('note') as string) || null;

  // Reverse old goal contribution if any (before update)
  const { data: oldTx } = await supabase
    .from('transactions')
    .select('goal_id, amount')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (oldTx?.goal_id) {
    const { data: oldGoal } = await supabase
      .from('goals')
      .select('current_amount, linked_account_ids')
      .eq('id', oldTx.goal_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (oldGoal && (!oldGoal.linked_account_ids || oldGoal.linked_account_ids.length === 0)) {
      const next = Math.max(0, Number(oldGoal.current_amount ?? 0) - Number(oldTx.amount));
      await supabase
        .from('goals')
        .update({ current_amount: next })
        .eq('id', oldTx.goal_id)
        .eq('user_id', user.id);
    }
  }

  const { error } = await supabase
    .from('transactions')
    .update({
      type,
      amount,
      account_id,
      to_account_id: type === 'transfer' ? to_account_id : null,
      category_id: type === 'transfer' ? null : category_id,
      goal_id,
      date,
      note,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('updateTransaction:', error);
    return { error: 'generic' as const };
  }

  // Apply new goal contribution if any
  if (goal_id) {
    await applyGoalContribution(supabase, user.id, goal_id, amount);
  }

  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  revalidatePath('/goals');
  redirect('/transactions');
}

export async function toggleRecurring(formData: FormData) {
  const id = formData.get('id') as string;
  const next = formData.get('is_active') === 'true';
  if (!id) return;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase
    .from('recurring_transactions')
    .update({ is_active: next, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath('/recurring');
}

export async function updateRecurring(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = formData.get('id') as string;
  if (!id) return { error: 'invalid_data' as const };

  const amountStr = (formData.get('amount') as string)?.replace(/,/g, '') ?? '0';
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return { error: 'amount_required' as const };

  const type = formData.get('type') as 'income' | 'expense' | 'transfer';
  const account_id = formData.get('account_id') as string;
  const to_account_id = (formData.get('to_account_id') as string) || null;
  const category_id = (formData.get('category_id') as string) || null;
  const goal_id = (formData.get('goal_id') as string) || null;
  const day_of_month = parseInt((formData.get('day_of_month') as string) ?? '1', 10);
  const note = (formData.get('note') as string) || null;
  const notify_enabled = formData.get('notify_enabled') === 'on';
  const notify_days_before = Math.min(14, Math.max(0,
    parseInt((formData.get('notify_days_before') as string) ?? '0', 10) || 0
  ));

  if (type === 'transfer') {
    if (!to_account_id) return { error: 'to_account_required' as const };
    if (to_account_id === account_id) return { error: 'transfer_same_account' as const };
  }

  const { error } = await supabase
    .from('recurring_transactions')
    .update({
      amount,
      account_id,
      to_account_id: type === 'transfer' ? to_account_id : null,
      category_id: type === 'transfer' ? null : category_id,
      goal_id,
      day_of_month: Math.min(31, Math.max(1, day_of_month || 1)),
      note,
      notify_enabled,
      notify_days_before,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('updateRecurring:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/recurring');
  redirect('/recurring');
}

export async function contributeToGoal(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const goalId = formData.get('goal_id') as string;
  const amountStr = (formData.get('amount') as string)?.replace(/,/g, '') ?? '0';
  const amount = parseFloat(amountStr);
  if (!goalId || isNaN(amount) || amount === 0) return;

  const { data: goal } = await supabase
    .from('goals')
    .select('current_amount, linked_account_ids')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!goal) return;
  if (goal.linked_account_ids && goal.linked_account_ids.length > 0) return;

  const next = Math.max(0, Number(goal.current_amount ?? 0) + amount);
  await supabase
    .from('goals')
    .update({ current_amount: next })
    .eq('id', goalId)
    .eq('user_id', user.id);

  revalidatePath('/goals');
  revalidatePath('/dashboard');
}

export async function deleteRecurring(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase.from('recurring_transactions').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/recurring');
}
