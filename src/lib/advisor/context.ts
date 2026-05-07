// ─────────────────────────────────────────────────────────
// Comprehensive financial context — for the AI advisor
// Pulls EVERYTHING the AI needs to give holistic advice
// ─────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/queries/dashboard';
import { getPortfolioMetrics } from '@/lib/queries/portfolio';
import { getTaxFundSummary } from '@/lib/queries/tax-saving';

export interface AdvisorSnapshot {
  generatedAt: string;
  // Core finances
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthIncome: number;
  monthExpense: number;
  monthBalance: number;
  savingsRate: number;
  dti: number;
  emergencyFundMonths: number;
  healthScore: number;
  // Counts
  accountsCount: number;
  debtsCount: number;
  goalsCount: number;
  investmentsCount: number;
  insurancePoliciesCount: number;
  // Top spending
  topCategories: { name: string; amount: number; percent: number }[];
  // Debts
  debts: {
    name: string;
    type: string;
    balance: number;
    rate: number;
    monthlyPayment: number;
    remainingTermMonths: number | null;
  }[];
  // Goals
  goals: {
    name: string;
    target: number;
    current: number;
    deadline: string | null;
    isEmergencyFund: boolean;
    progressPct: number;
    monthsToDeadline: number | null;
  }[];
  // Investments
  portfolio: {
    totalValue: number;
    totalCost: number;
    totalPL: number;
    totalPLPercent: number;
    allocationByType: Record<string, number>; // % of portfolio
    allocationByCurrency: Record<string, number>;
    topHoldings: { symbol: string; type: string; valueTHB: number; plPercent: number; goalLinked: boolean }[];
  };
  // Tax-saving funds
  taxSaving: {
    totalContributedThisYear: number;
    totalValue: number;
    byType: Record<string, { count: number; cost: number; value: number }>;
  };
  // Insurance
  insurance: {
    healthCoverageSum: number;
    lifeCoverageSum: number;
    annualPremiumTotal: number;
    policiesCount: number;
    types: string[];
  };
  // Recurring / Budget hints
  hasActiveBudgets: boolean;
  hasRecurringExpenses: boolean;
  hasActiveDCA: boolean;
  // Profile
  hasAIKey: boolean;
}

function safeNum(n: any): number {
  const v = Number(n);
  return isFinite(v) ? v : 0;
}

export async function buildAdvisorSnapshot(): Promise<AdvisorSnapshot | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Run independent queries in parallel
  const [
    dashboard,
    portfolio,
    debtsRes,
    goalsRes,
    insRes,
    accountsCountRes,
    investmentsCountRes,
    budgetsCountRes,
    recurringCountRes,
    recurringInvCountRes,
    profileRes,
  ] = await Promise.all([
    getDashboardData(),
    getPortfolioMetrics().catch(() => null),
    supabase
      .from('debts')
      .select('name, type, current_balance, interest_rate, monthly_payment, remaining_term')
      .eq('status', 'active'),
    supabase
      .from('goals')
      .select('name, target_amount, current_amount, deadline, is_emergency_fund')
      .eq('status', 'active'),
    supabase
      .from('insurance_policies')
      .select('type, sum_insured, annual_premium')
      .eq('user_id', user.id),
    supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('archived', false),
    supabase.from('investments').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('archived', false),
    supabase.from('budgets').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gt('amount', 0),
    supabase.from('recurring_transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true),
    supabase.from('recurring_investments').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true),
    supabase.from('profiles').select('ai_provider, ai_api_key_encrypted').eq('id', user.id).maybeSingle(),
  ]);

  const debts = (debtsRes.data ?? []).map((d: any) => ({
    name: d.name,
    type: d.type,
    balance: safeNum(d.current_balance),
    rate: safeNum(d.interest_rate),
    monthlyPayment: safeNum(d.monthly_payment),
    remainingTermMonths: d.remaining_term ?? null,
  }));

  const today = new Date();
  const goals = (goalsRes.data ?? []).map((g: any) => {
    const target = safeNum(g.target_amount);
    const current = safeNum(g.current_amount);
    let monthsToDeadline: number | null = null;
    if (g.deadline) {
      const d = new Date(g.deadline);
      monthsToDeadline = Math.max(0, Math.ceil((d.getTime() - today.getTime()) / (30 * 86400000)));
    }
    return {
      name: g.name,
      target,
      current,
      deadline: g.deadline,
      isEmergencyFund: !!g.is_emergency_fund,
      progressPct: target > 0 ? (current / target) * 100 : 0,
      monthsToDeadline,
    };
  });

  const insPolicies = (insRes.data ?? []) as { type: string; sum_insured: number; annual_premium: number }[];
  const insurance = {
    healthCoverageSum: insPolicies
      .filter((p) => p.type === 'health' || p.type === 'critical_illness' || p.type === 'accident')
      .reduce((s, p) => s + safeNum(p.sum_insured), 0),
    lifeCoverageSum: insPolicies
      .filter((p) => p.type === 'life' || p.type === 'term_life' || p.type === 'whole_life')
      .reduce((s, p) => s + safeNum(p.sum_insured), 0),
    annualPremiumTotal: insPolicies.reduce((s, p) => s + safeNum(p.annual_premium), 0),
    policiesCount: insPolicies.length,
    types: Array.from(new Set(insPolicies.map((p) => p.type))),
  };

  // Portfolio allocations as %
  const allocationByType: Record<string, number> = {};
  const allocationByCurrency: Record<string, number> = {};
  let portfolioMetrics = portfolio
    ? {
        totalValue: portfolio.totalValue,
        totalCost: portfolio.totalCost,
        totalPL: portfolio.totalPL,
        totalPLPercent: portfolio.totalPLPercent,
        allocationByType,
        allocationByCurrency,
        topHoldings: portfolio.holdings.slice(0, 10).map((h) => ({
          symbol: h.symbol ?? h.name,
          type: h.type,
          valueTHB: h.valueTHB,
          plPercent: h.plPercent,
          goalLinked: !!h.goal_id,
        })),
      }
    : { totalValue: 0, totalCost: 0, totalPL: 0, totalPLPercent: 0, allocationByType, allocationByCurrency, topHoldings: [] };

  if (portfolio && portfolio.totalValue > 0) {
    for (const [k, v] of Object.entries(portfolio.valueByType)) {
      allocationByType[k] = (Number(v) / portfolio.totalValue) * 100;
    }
    for (const [k, v] of Object.entries(portfolio.valueByCurrency)) {
      allocationByCurrency[k] = (Number(v) / portfolio.totalValue) * 100;
    }
  }

  // Tax-saving summary
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const taxSavingFull = await getTaxFundSummary(yearStart).catch(() => null);
  const taxSaving = taxSavingFull
    ? {
        totalContributedThisYear: taxSavingFull.totalContributedThisYear,
        totalValue: taxSavingFull.totalValueAll,
        byType: taxSavingFull.byType,
      }
    : { totalContributedThisYear: 0, totalValue: 0, byType: {} };

  return {
    generatedAt: new Date().toISOString(),
    netWorth: dashboard.netWorth,
    totalAssets: dashboard.totalAssets,
    totalLiabilities: dashboard.totalLiabilities,
    monthIncome: dashboard.monthIncome,
    monthExpense: dashboard.monthExpense,
    monthBalance: dashboard.monthBalance,
    savingsRate: dashboard.savingsRate,
    dti: dashboard.dti,
    emergencyFundMonths: dashboard.emergencyFundMonths,
    healthScore: dashboard.healthScore,
    accountsCount: accountsCountRes.count ?? 0,
    debtsCount: debts.length,
    goalsCount: goals.length,
    investmentsCount: investmentsCountRes.count ?? 0,
    insurancePoliciesCount: insurance.policiesCount,
    topCategories: dashboard.topCategories.map((c) => ({
      name: c.name,
      amount: c.amount,
      percent: dashboard.monthExpense > 0 ? (c.amount / dashboard.monthExpense) * 100 : 0,
    })),
    debts,
    goals,
    portfolio: portfolioMetrics,
    taxSaving,
    insurance,
    hasActiveBudgets: (budgetsCountRes.count ?? 0) > 0,
    hasRecurringExpenses: (recurringCountRes.count ?? 0) > 0,
    hasActiveDCA: (recurringInvCountRes.count ?? 0) > 0,
    hasAIKey: !!(profileRes.data?.ai_provider && profileRes.data?.ai_api_key_encrypted),
  };
}

// Render snapshot as markdown for the LLM prompt
export function snapshotToMarkdown(s: AdvisorSnapshot): string {
  const lines: string[] = [];
  lines.push(`# สถานะการเงินปัจจุบัน (${s.generatedAt.slice(0, 10)})`);

  lines.push('\n## ภาพรวม');
  lines.push(`- Net Worth: ฿${s.netWorth.toLocaleString()}`);
  lines.push(`- ทรัพย์สินรวม: ฿${s.totalAssets.toLocaleString()}`);
  lines.push(`- หนี้สินรวม: ฿${s.totalLiabilities.toLocaleString()}`);
  lines.push(`- Health Score: ${s.healthScore}/100`);

  lines.push('\n## รายรับ-รายจ่ายเดือนนี้');
  lines.push(`- รายรับ: ฿${s.monthIncome.toLocaleString()}`);
  lines.push(`- รายจ่าย: ฿${s.monthExpense.toLocaleString()}`);
  lines.push(`- คงเหลือ: ฿${s.monthBalance.toLocaleString()}`);
  lines.push(`- Savings Rate: ${(s.savingsRate * 100).toFixed(1)}%`);
  lines.push(`- DTI: ${(s.dti * 100).toFixed(1)}%`);
  lines.push(`- Emergency Fund: ${s.emergencyFundMonths.toFixed(1)} เดือน`);

  if (s.topCategories.length > 0) {
    lines.push('\n## หมวดที่ใช้เงินมากสุดเดือนนี้');
    for (const c of s.topCategories.slice(0, 5)) {
      lines.push(`- ${c.name}: ฿${c.amount.toLocaleString()} (${c.percent.toFixed(0)}% ของรายจ่าย)`);
    }
  }

  if (s.debts.length > 0) {
    lines.push('\n## หนี้สิน');
    for (const d of s.debts) {
      lines.push(`- ${d.name} (${d.type}): ยอดคงเหลือ ฿${d.balance.toLocaleString()}, ดอกเบี้ย ${d.rate.toFixed(2)}%, ผ่อนเดือนละ ฿${d.monthlyPayment.toLocaleString()}${d.remainingTermMonths ? `, เหลือ ${d.remainingTermMonths} เดือน` : ''}`);
    }
  }

  if (s.goals.length > 0) {
    lines.push('\n## เป้าหมายที่ตั้งไว้');
    for (const g of s.goals) {
      const ef = g.isEmergencyFund ? ' [Emergency Fund]' : '';
      lines.push(`- ${g.name}${ef}: ฿${g.current.toLocaleString()}/฿${g.target.toLocaleString()} (${g.progressPct.toFixed(0)}%)${g.deadline ? `, deadline ${g.deadline} (อีก ${g.monthsToDeadline} เดือน)` : ''}`);
    }
  }

  if (s.portfolio.totalValue > 0) {
    lines.push('\n## พอร์ตการลงทุน');
    lines.push(`- มูลค่ารวม: ฿${Math.round(s.portfolio.totalValue).toLocaleString()}`);
    lines.push(`- ต้นทุนรวม: ฿${Math.round(s.portfolio.totalCost).toLocaleString()}`);
    lines.push(`- Unrealized P/L: ${s.portfolio.totalPL >= 0 ? '+' : ''}฿${Math.round(s.portfolio.totalPL).toLocaleString()} (${s.portfolio.totalPLPercent.toFixed(2)}%)`);
    if (Object.keys(s.portfolio.allocationByType).length > 0) {
      lines.push('### Allocation by Type');
      for (const [t, pct] of Object.entries(s.portfolio.allocationByType).sort(([, a], [, b]) => b - a)) {
        lines.push(`- ${t}: ${pct.toFixed(1)}%`);
      }
    }
    if (Object.keys(s.portfolio.allocationByCurrency).length > 1) {
      lines.push('### FX Exposure');
      for (const [c, pct] of Object.entries(s.portfolio.allocationByCurrency).sort(([, a], [, b]) => b - a)) {
        lines.push(`- ${c}: ${pct.toFixed(1)}%`);
      }
    }
    if (s.portfolio.topHoldings.length > 0) {
      lines.push('### Top Holdings');
      for (const h of s.portfolio.topHoldings.slice(0, 5)) {
        const pct = s.portfolio.totalValue > 0 ? (h.valueTHB / s.portfolio.totalValue) * 100 : 0;
        lines.push(`- ${h.symbol} (${h.type}): ฿${Math.round(h.valueTHB).toLocaleString()} = ${pct.toFixed(1)}%, P/L ${h.plPercent >= 0 ? '+' : ''}${h.plPercent.toFixed(1)}%${h.goalLinked ? ' [ผูก goal]' : ''}`);
      }
    }
  }

  if (s.taxSaving.totalContributedThisYear > 0 || Object.keys(s.taxSaving.byType).length > 0) {
    lines.push('\n## กองทุนลดหย่อนภาษี (ปีนี้)');
    lines.push(`- สมทบรวม: ฿${Math.round(s.taxSaving.totalContributedThisYear).toLocaleString()}`);
    lines.push(`- มูลค่ารวม: ฿${Math.round(s.taxSaving.totalValue).toLocaleString()}`);
    for (const [type, agg] of Object.entries(s.taxSaving.byType)) {
      const a = agg as { count: number; cost: number; value: number };
      lines.push(`- ${type.toUpperCase()}: ${a.count} กอง, ทุน ฿${Math.round(a.cost).toLocaleString()}, มูลค่า ฿${Math.round(a.value).toLocaleString()}`);
    }
  }

  if (s.insurance.policiesCount > 0) {
    lines.push('\n## ประกัน');
    lines.push(`- กรมธรรม์: ${s.insurance.policiesCount} ฉบับ (${s.insurance.types.join(', ')})`);
    lines.push(`- ทุนประกันสุขภาพ: ฿${s.insurance.healthCoverageSum.toLocaleString()}`);
    lines.push(`- ทุนประกันชีวิต: ฿${s.insurance.lifeCoverageSum.toLocaleString()}`);
    lines.push(`- เบี้ยรวมต่อปี: ฿${s.insurance.annualPremiumTotal.toLocaleString()}`);
  }

  lines.push('\n## ฟีเจอร์ของ Lumenfi ที่ใช้อยู่');
  lines.push(`- บัญชีที่บันทึก: ${s.accountsCount}`);
  lines.push(`- รายการลงทุน: ${s.investmentsCount}`);
  lines.push(`- Budget ตั้งไว้: ${s.hasActiveBudgets ? 'ใช่' : 'ไม่'}`);
  lines.push(`- Recurring expenses: ${s.hasRecurringExpenses ? 'มี' : 'ไม่มี'}`);
  lines.push(`- DCA Auto: ${s.hasActiveDCA ? 'เปิดอยู่' : 'ยังไม่ได้ตั้ง'}`);

  return lines.join('\n');
}
