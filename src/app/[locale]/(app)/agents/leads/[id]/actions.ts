'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { generateSalesPitch, type SalesContext } from '@/lib/agents/ai-sales';
import { analyzeInsuranceGap, type InsuranceContext, type ExistingPolicy } from '@/lib/insurance/gap-analyzer';

async function getAgent() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: agent } = await supabase
    .from('agents')
    .select('id, agent_name, company, display_name')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!agent) redirect('/agents/signup');
  return { user, agent: agent as any };
}

/** Check if agent has a paid plan (Pro or Team) for AI access */
async function hasPaidPlan(agentId: string): Promise<boolean> {
  const svc = createServiceClient();
  const { data: sub } = await svc
    .from('agent_subscriptions')
    .select('plan, status, current_period_end')
    .eq('agent_id', agentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) return false;
  const s = sub as any;
  if (s.plan !== 'pro' && s.plan !== 'team' && s.plan !== 'founder') return false;
  if (new Date(s.current_period_end).getTime() < Date.now()) return false;
  return true;
}

export async function generatePitchAction(formData: FormData): Promise<void> {
  const { agent } = await getAgent();
  const leadId = formData.get('lead_id') as string;
  if (!leadId) return;

  // Gate behind Pro/Team
  if (!(await hasPaidPlan(agent.id))) {
    redirect('/agents/pricing?reason=ai-sales');
  }

  const svc = createServiceClient();

  // Fetch lead + verify ownership
  const { data: lead } = await svc
    .from('insurance_leads')
    .select('user_id, type, message, preferred_carrier, estimated_sum_insured')
    .eq('id', leadId)
    .eq('agent_id', agent.id)
    .maybeSingle();
  if (!lead) return;

  const prospectId = (lead as any).user_id;

  // Pull prospect's financial context (similar to getInsuranceContext but with service client)
  const [profileR, txR, debtsR, accountsR, policiesR] = await Promise.all([
    svc
      .from('profiles')
      .select('date_of_birth, num_dependents, monthly_income, monthly_expense_estimate')
      .eq('id', prospectId)
      .maybeSingle(),
    svc
      .from('transactions')
      .select('type, amount, date, category_id')
      .eq('user_id', prospectId)
      .gte('date', new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10)),
    svc.from('debts').select('current_balance').eq('user_id', prospectId),
    svc.from('accounts').select('id, type, initial_balance').eq('user_id', prospectId).eq('archived', false),
    svc.from('insurance_policies').select('type, sum_insured, annual_premium').eq('user_id', prospectId),
  ]);

  const profile = profileR.data;
  const txs = (txR.data ?? []) as any[];
  const debts = (debtsR.data ?? []) as any[];
  const accounts = (accountsR.data ?? []) as any[];
  const policies = (policiesR.data ?? []) as ExistingPolicy[];

  let age: number | null = null;
  if (profile?.date_of_birth) {
    age = Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 86400000));
  }

  const incomeTxs = txs.filter((t: any) => t.type === 'income');
  const expenseTxs = txs.filter((t: any) => t.type === 'expense');
  const months = Math.max(1, Math.min(6, txs.length > 0 ? 6 : 1));
  const monthlyIncome = incomeTxs.length > 0
    ? incomeTxs.reduce((s: number, t: any) => s + Number(t.amount), 0) / months
    : Number(profile?.monthly_income ?? 0);
  const monthlyExpense = expenseTxs.length > 0
    ? expenseTxs.reduce((s: number, t: any) => s + Number(t.amount), 0) / months
    : Number(profile?.monthly_expense_estimate ?? 0);

  const totalDebt = debts.reduce((s: number, d: any) => s + Number(d.current_balance ?? 0), 0);
  const emergencyFund = accounts
    .filter((a: any) => ['savings', 'bank', 'cash'].includes(a.type))
    .reduce((s: number, a: any) => s + Number(a.initial_balance ?? 0), 0);

  const ctx: InsuranceContext = {
    age,
    monthlyIncome,
    monthlyExpense,
    totalDebt,
    monthlyDebtPayment: 0,
    emergencyFund,
    numDependents: profile?.num_dependents ?? 0,
    hasHealthExpenses: false,
    monthlyHealthExpense: 0,
    existingPolicies: policies,
  };

  const gaps = analyzeInsuranceGap(ctx);

  const salesCtx: SalesContext = {
    age,
    monthlyIncome,
    monthlyExpense,
    totalDebt,
    numDependents: profile?.num_dependents ?? 0,
    emergencyFund,
    existingPolicies: policies,
    gaps: gaps.map((g) => ({
      type: g.type,
      severity: g.severity,
      gap: g.gap,
      recommended: g.recommended,
      reasoning: g.reasoning,
    })),
    leadType: (lead as any).type,
    leadMessage: (lead as any).message,
    preferredCarrier: (lead as any).preferred_carrier,
    estimatedSumInsured: (lead as any).estimated_sum_insured,
    agentCompany: agent.company,
    agentName: agent.agent_name,
  };

  let pitch = '';
  try {
    pitch = await generateSalesPitch(salesCtx);
  } catch (e: any) {
    console.error('[generatePitch] failed', e?.message);
    pitch = `❌ ไม่สามารถสร้างคำแนะนำได้: ${e?.message ?? 'unknown'}`;
  }

  // Persist
  await svc
    .from('insurance_leads')
    .update({
      ai_pitch: pitch,
      ai_pitch_generated_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  revalidatePath(`/agents/leads/${leadId}`);
}
