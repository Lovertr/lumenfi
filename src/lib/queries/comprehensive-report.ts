// ─────────────────────────────────────────────────────────
// Comprehensive financial report — analysis in every dimension
// ─────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from './dashboard';
import { getPortfolioMetrics } from './portfolio';
import { getTaxFundSummary } from './tax-saving';
import { buildAdvisorSnapshot } from '@/lib/advisor/context';

export type Severity = 'good' | 'ok' | 'warn' | 'critical';

export interface MetricCard {
  label: string;
  value: string;
  subtext?: string;
  severity: Severity;
  benchmark?: string;
}

export interface Recommendation {
  icon: string;
  title: string;
  body: string;
  url?: string;
  cta?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DimensionAnalysis {
  key: string;
  title: string;
  icon: string;
  score: number; // 0-100
  severity: Severity;
  summary: string;
  metrics: MetricCard[];
  recommendations: Recommendation[];
}

export interface ComprehensiveReport {
  generatedAt: string;
  overallScore: number;
  overallGrade: string;
  // Top KPIs
  netWorth: number;
  monthIncome: number;
  monthExpense: number;
  monthBalance: number;
  savingsRate: number;
  // 8 dimensions
  cashflow: DimensionAnalysis;
  emergency: DimensionAnalysis;
  debt: DimensionAnalysis;
  savings: DimensionAnalysis;
  investments: DimensionAnalysis;
  tax: DimensionAnalysis;
  insurance: DimensionAnalysis;
  goals: DimensionAnalysis;
  // Top-priority recommendations across all dimensions
  topRecommendations: Recommendation[];
  // Trend indicators (vs last month)
  netWorthChange: number;
  netWorthChangePct: number;
}

function severityFromScore(score: number): Severity {
  if (score >= 80) return 'good';
  if (score >= 60) return 'ok';
  if (score >= 40) return 'warn';
  return 'critical';
}

function gradeFromScore(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C+';
  if (score >= 40) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

export async function getComprehensiveReport(): Promise<ComprehensiveReport | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch all data in parallel
  const [dashboard, portfolio, snapshot] = await Promise.all([
    getDashboardData(),
    getPortfolioMetrics().catch(() => null),
    buildAdvisorSnapshot().catch(() => null),
  ]);

  if (!snapshot) return null;

  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const taxSaving = await getTaxFundSummary(yearStart).catch(() => null);

  // ─── Net worth trend (vs 30 days ago) ───
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const { data: oldSnapshot } = await supabase
    .from('net_worth_snapshots')
    .select('net_worth')
    .eq('user_id', user.id)
    .lte('date', thirtyDaysAgo)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  const oldNetWorth = oldSnapshot ? Number(oldSnapshot.net_worth) : dashboard.netWorth;
  const netWorthChange = dashboard.netWorth - oldNetWorth;
  const netWorthChangePct =
    oldNetWorth !== 0 ? (netWorthChange / Math.abs(oldNetWorth)) * 100 : 0;

  // ─── Cashflow ───
  const cashflowScore =
    dashboard.savingsRate >= 0.2 ? 90 :
    dashboard.savingsRate >= 0.1 ? 70 :
    dashboard.savingsRate >= 0.05 ? 50 :
    dashboard.savingsRate >= 0 ? 35 : 15;
  const cashflowRecs: Recommendation[] = [];
  if (dashboard.savingsRate < 0.1) {
    cashflowRecs.push({
      icon: '💰',
      title: 'อัตราการออมต่ำกว่า 10% — ต้องเร่งแก้',
      body: 'ลองตั้ง budget รายหมวด — เห็นภาพชัดว่าเงินไหลไปไหน',
      url: '/budgets',
      cta: 'ตั้ง Budget',
      priority: 'high',
    });
  }
  if (!snapshot.hasActiveBudgets) {
    cashflowRecs.push({
      icon: '📊',
      title: 'ยังไม่ได้ตั้ง Budget',
      body: 'ตั้ง budget ทุกหมวด → ระบบจะแจ้งเตือนเมื่อใกล้เกิน',
      url: '/budgets',
      cta: 'เริ่ม',
      priority: 'medium',
    });
  }
  if (dashboard.monthBalance < 0) {
    cashflowRecs.push({
      icon: '🚨',
      title: 'รายจ่ายเดือนนี้เกินรายรับ',
      body: `ขาดดุล ${Math.abs(dashboard.monthBalance).toLocaleString()} บาท — ต้องลดค่าใช้จ่ายหรือเพิ่มรายได้`,
      url: '/cashflow',
      cta: 'ดู Cash Flow',
      priority: 'high',
    });
  }
  const cashflow: DimensionAnalysis = {
    key: 'cashflow',
    title: 'กระแสเงินสด',
    icon: '💸',
    score: cashflowScore,
    severity: severityFromScore(cashflowScore),
    summary:
      dashboard.savingsRate >= 0.2
        ? `ดีเยี่ยม! ออมได้ ${(dashboard.savingsRate * 100).toFixed(0)}% ของรายได้`
        : dashboard.savingsRate >= 0.1
        ? `พอใช้ — ออม ${(dashboard.savingsRate * 100).toFixed(0)}% (เป้าหมาย ≥ 20%)`
        : `ต้องเร่งแก้ — ออมแค่ ${(dashboard.savingsRate * 100).toFixed(0)}%`,
    metrics: [
      {
        label: 'Savings Rate',
        value: `${(dashboard.savingsRate * 100).toFixed(0)}%`,
        benchmark: 'เป้า ≥ 20%',
        severity: severityFromScore(cashflowScore),
      },
      {
        label: 'รายรับเดือนนี้',
        value: `฿${dashboard.monthIncome.toLocaleString()}`,
        severity: 'good',
      },
      {
        label: 'รายจ่ายเดือนนี้',
        value: `฿${dashboard.monthExpense.toLocaleString()}`,
        severity: dashboard.monthBalance < 0 ? 'critical' : 'ok',
      },
      {
        label: 'สุทธิเดือนนี้',
        value: `${dashboard.monthBalance >= 0 ? '+' : ''}฿${dashboard.monthBalance.toLocaleString()}`,
        severity: dashboard.monthBalance >= 0 ? 'good' : 'critical',
      },
    ],
    recommendations: cashflowRecs,
  };

  // ─── Emergency Fund ───
  const efMonths = dashboard.emergencyFundMonths;
  const emergencyScore = efMonths >= 6 ? 95 : efMonths >= 3 ? 75 : efMonths >= 1 ? 45 : 15;
  const emergencyRecs: Recommendation[] = [];
  if (efMonths < 3) {
    emergencyRecs.push({
      icon: '🚨',
      title: 'Emergency Fund ต่ำกว่า 3 เดือน',
      body: 'เริ่มสร้างเป้าหมาย Emergency Fund — ขั้นต่ำ 3-6 เดือนของรายจ่าย',
      url: '/goals/new',
      cta: 'สร้างเป้าหมาย',
      priority: 'high',
    });
  }
  const emergency: DimensionAnalysis = {
    key: 'emergency',
    title: 'Emergency Fund',
    icon: '🚨',
    score: emergencyScore,
    severity: severityFromScore(emergencyScore),
    summary:
      efMonths >= 6
        ? `แข็งแกร่ง — มีสำรอง ${efMonths.toFixed(1)} เดือน`
        : efMonths >= 3
        ? `พอใช้ — มี ${efMonths.toFixed(1)} เดือน (เป้า ≥ 6)`
        : `อันตราย — มีแค่ ${efMonths.toFixed(1)} เดือน`,
    metrics: [
      {
        label: 'จำนวนเดือน',
        value: `${efMonths.toFixed(1)}`,
        benchmark: 'เป้า 3-6 เดือน',
        severity: severityFromScore(emergencyScore),
      },
    ],
    recommendations: emergencyRecs,
  };

  // ─── Debt ───
  const totalDebt = snapshot.debts.reduce((s, d) => s + d.balance, 0);
  const avgRate =
    snapshot.debts.length > 0
      ? snapshot.debts.reduce((s, d) => s + d.rate, 0) / snapshot.debts.length
      : 0;
  const debtScore =
    dashboard.dti < 0.2 ? 95 :
    dashboard.dti < 0.3 ? 80 :
    dashboard.dti < 0.4 ? 60 :
    dashboard.dti < 0.5 ? 35 : 10;
  const debtRecs: Recommendation[] = [];
  if (dashboard.dti > 0.4) {
    debtRecs.push({
      icon: '⚠️',
      title: `DTI ${(dashboard.dti * 100).toFixed(0)}% — เริ่มเสี่ยง`,
      body: 'ใช้ AI Advisor เลือก Avalanche / Snowball / Refinance ที่เหมาะสุด',
      url: '/advisor',
      cta: 'ขอ AI วิเคราะห์',
      priority: 'high',
    });
  }
  const highRateDebt = snapshot.debts.find((d) => d.rate > 15);
  if (highRateDebt) {
    debtRecs.push({
      icon: '💸',
      title: `${highRateDebt.name} ดอกเบี้ย ${highRateDebt.rate.toFixed(1)}%`,
      body: 'ดอกสูงกว่าผลตอบแทนการลงทุนทั่วไป — ควรเร่งปลด',
      url: '/tools/debt',
      cta: 'วางแผนปลดหนี้',
      priority: 'high',
    });
  }
  const debt: DimensionAnalysis = {
    key: 'debt',
    title: 'หนี้สิน',
    icon: '💳',
    score: debtScore,
    severity: severityFromScore(debtScore),
    summary:
      snapshot.debts.length === 0
        ? 'ไม่มีหนี้สิน 🎉'
        : `${snapshot.debts.length} ก้อน · DTI ${(dashboard.dti * 100).toFixed(0)}%`,
    metrics: [
      {
        label: 'หนี้รวม',
        value: `฿${totalDebt.toLocaleString()}`,
        severity: severityFromScore(debtScore),
      },
      {
        label: 'DTI',
        value: `${(dashboard.dti * 100).toFixed(0)}%`,
        benchmark: 'เป้า < 30%',
        severity: severityFromScore(debtScore),
      },
      {
        label: 'ดอกเฉลี่ย',
        value: `${avgRate.toFixed(1)}%`,
        severity: avgRate > 15 ? 'critical' : avgRate > 8 ? 'warn' : 'good',
      },
      {
        label: 'จำนวนก้อน',
        value: `${snapshot.debts.length}`,
        severity: 'ok',
      },
    ],
    recommendations: debtRecs,
  };

  // ─── Savings (Goals + accounts) ───
  const goalsCompleted = snapshot.goals.filter((g) => g.progressPct >= 100).length;
  const goalsBehind = snapshot.goals.filter((g) => g.monthsToDeadline !== null && g.monthsToDeadline > 0 && g.progressPct < 70).length;
  const savingsScore =
    snapshot.goals.length === 0 ? 50 :
    goalsBehind === 0 && goalsCompleted > 0 ? 90 :
    goalsBehind === 0 ? 75 :
    goalsBehind <= 1 ? 55 : 30;
  const savingsRecs: Recommendation[] = [];
  if (snapshot.goals.length === 0) {
    savingsRecs.push({
      icon: '🎯',
      title: 'ยังไม่มีเป้าหมายการเงิน',
      body: 'เริ่มจาก Emergency Fund แล้วต่อด้วยเป้าหมายระยะยาว (บ้าน/เกษียณ)',
      url: '/goals/new',
      cta: 'สร้างเป้าหมาย',
      priority: 'high',
    });
  }
  if (goalsBehind > 0) {
    savingsRecs.push({
      icon: '⚠️',
      title: `${goalsBehind} เป้าหมายใกล้ deadline แต่ progress ช้า`,
      body: 'อาจต้องเพิ่มเงินสมทบรายเดือน หรือ reset deadline ใหม่',
      url: '/goals',
      cta: 'ดูเป้าหมาย',
      priority: 'medium',
    });
  }
  const savings: DimensionAnalysis = {
    key: 'savings',
    title: 'เป้าหมายการเงิน',
    icon: '🎯',
    score: savingsScore,
    severity: severityFromScore(savingsScore),
    summary:
      snapshot.goals.length === 0
        ? 'ยังไม่มีเป้าหมาย'
        : `${snapshot.goals.length} เป้า · เสร็จแล้ว ${goalsCompleted} · ใกล้ deadline ${goalsBehind}`,
    metrics: [
      {
        label: 'เป้าหมายทั้งหมด',
        value: `${snapshot.goals.length}`,
        severity: snapshot.goals.length > 0 ? 'good' : 'warn',
      },
      {
        label: 'เสร็จแล้ว',
        value: `${goalsCompleted}`,
        severity: 'good',
      },
      {
        label: 'ใกล้ deadline (ช้า)',
        value: `${goalsBehind}`,
        severity: goalsBehind > 0 ? 'warn' : 'good',
      },
    ],
    recommendations: savingsRecs,
  };

  // ─── Investments ───
  const portfolioValue = portfolio?.totalValue ?? 0;
  const portfolioPL = portfolio?.totalPLPercent ?? 0;
  let concentration = 0;
  if (portfolio && portfolio.holdings.length > 0) {
    const max = Math.max(...portfolio.holdings.map((h) => h.valueTHB));
    concentration = portfolio.totalValue > 0 ? (max / portfolio.totalValue) * 100 : 0;
  }
  const investScore =
    portfolio === null || portfolio.holdings.length === 0 ? 30 :
    portfolio.holdings.length >= 5 && concentration < 30 && portfolioPL > 0 ? 90 :
    portfolio.holdings.length >= 3 && concentration < 50 ? 70 :
    portfolio.holdings.length >= 1 ? 50 : 30;
  const investRecs: Recommendation[] = [];
  if (!portfolio || portfolio.holdings.length === 0) {
    investRecs.push({
      icon: '📈',
      title: 'ยังไม่ได้ลงทุน',
      body: 'เก็บ Emergency Fund แล้วเริ่มลงทุน — DCA หุ้นไทย/กองทุนได้ผลตอบแทน 5-9%',
      url: '/investments/new',
      cta: 'เริ่มลงทุน',
      priority: 'medium',
    });
  } else {
    if (concentration > 40) {
      investRecs.push({
        icon: '⚠️',
        title: `พอร์ตกระจุก ${concentration.toFixed(0)}% ในตัวเดียว`,
        body: 'ความเสี่ยงสูง — ลด concentration เหลือ < 25% ต่อ holding',
        url: '/advisor',
        cta: 'ขอ AI วิเคราะห์',
        priority: 'high',
      });
    }
    if (!snapshot.hasActiveDCA) {
      investRecs.push({
        icon: '🔁',
        title: 'ยังไม่ได้ตั้ง DCA Auto',
        body: 'ลงทุนสม่ำเสมอลดความเสี่ยง market timing',
        url: '/investments/recurring/new',
        cta: 'ตั้ง DCA',
        priority: 'medium',
      });
    }
  }
  const investments: DimensionAnalysis = {
    key: 'investments',
    title: 'การลงทุน',
    icon: '📊',
    score: investScore,
    severity: severityFromScore(investScore),
    summary:
      !portfolio || portfolio.holdings.length === 0
        ? 'ยังไม่ได้ลงทุน'
        : `${portfolio.holdings.length} holdings · มูลค่า ฿${Math.round(portfolioValue).toLocaleString()}`,
    metrics: [
      {
        label: 'มูลค่ารวม',
        value: `฿${Math.round(portfolioValue).toLocaleString()}`,
        severity: portfolioValue > 0 ? 'good' : 'ok',
      },
      {
        label: 'P/L',
        value: `${portfolioPL >= 0 ? '+' : ''}${portfolioPL.toFixed(1)}%`,
        severity: portfolioPL >= 0 ? 'good' : portfolioPL > -10 ? 'warn' : 'critical',
      },
      {
        label: 'จำนวน holdings',
        value: `${portfolio?.holdings.length ?? 0}`,
        benchmark: 'เป้า ≥ 5',
        severity: (portfolio?.holdings.length ?? 0) >= 5 ? 'good' : 'warn',
      },
      {
        label: 'Concentration',
        value: `${concentration.toFixed(0)}%`,
        benchmark: 'เป้า < 25%',
        severity: concentration > 40 ? 'critical' : concentration > 25 ? 'warn' : 'good',
      },
    ],
    recommendations: investRecs,
  };

  // ─── Tax ───
  const annualTaxFundUse = taxSaving?.totalContributedThisYear ?? 0;
  const expectedSavings = annualTaxFundUse * 0.1; // rough — 10% bracket
  const taxScore =
    annualTaxFundUse >= 100_000 ? 90 :
    annualTaxFundUse >= 50_000 ? 70 :
    annualTaxFundUse >= 10_000 ? 50 :
    annualTaxFundUse > 0 ? 35 : 20;
  const taxRecs: Recommendation[] = [];
  if (annualTaxFundUse < 50_000 && dashboard.monthIncome > 30_000) {
    taxRecs.push({
      icon: '🧾',
      title: 'ใช้สิทธิลดหย่อนภาษีน้อย',
      body: `ปีนี้สมทบเพียง ฿${Math.round(annualTaxFundUse).toLocaleString()} — เพดานสามารถใช้ได้ถึง 30% ของรายได้`,
      url: '/investments/tax-saving',
      cta: 'คำนวณเพดาน',
      priority: 'medium',
    });
  }
  const tax: DimensionAnalysis = {
    key: 'tax',
    title: 'ภาษี',
    icon: '🧾',
    score: taxScore,
    severity: severityFromScore(taxScore),
    summary:
      annualTaxFundUse > 0
        ? `สมทบกองทุนภาษีปีนี้ ฿${Math.round(annualTaxFundUse).toLocaleString()}`
        : 'ยังไม่ได้ใช้สิทธิลดหย่อน',
    metrics: [
      {
        label: 'สมทบปีนี้',
        value: `฿${Math.round(annualTaxFundUse).toLocaleString()}`,
        severity: severityFromScore(taxScore),
      },
      {
        label: 'ประหยัดภาษีโดยประมาณ',
        value: `~฿${Math.round(expectedSavings).toLocaleString()}`,
        severity: 'good',
      },
    ],
    recommendations: taxRecs,
  };

  // ─── Insurance ───
  const annualIncome = dashboard.monthIncome * 12;
  const recommendedHealthCoverage = 500_000;
  const recommendedLifeCoverage = annualIncome * 10;
  const insScore =
    snapshot.insurance.policiesCount === 0 ? 20 :
    snapshot.insurance.healthCoverageSum >= recommendedHealthCoverage &&
    snapshot.insurance.lifeCoverageSum >= recommendedLifeCoverage * 0.5 ? 85 :
    snapshot.insurance.healthCoverageSum >= recommendedHealthCoverage ? 65 :
    snapshot.insurance.policiesCount > 0 ? 45 : 20;
  const insRecs: Recommendation[] = [];
  if (snapshot.insurance.policiesCount === 0) {
    insRecs.push({
      icon: '🛡️',
      title: 'ยังไม่มีประกันใดๆ',
      body: 'ขั้นต่ำควรมีประกันสุขภาพ + อุบัติเหตุ',
      url: '/insurance',
      cta: 'เริ่มต้น',
      priority: 'high',
    });
  } else if (snapshot.insurance.healthCoverageSum < recommendedHealthCoverage) {
    insRecs.push({
      icon: '⚠️',
      title: 'ทุนประกันสุขภาพยังต่ำ',
      body: `ตอนนี้ ฿${snapshot.insurance.healthCoverageSum.toLocaleString()} — แนะนำขั้นต่ำ ฿${recommendedHealthCoverage.toLocaleString()}`,
      url: '/insurance/quote',
      cta: 'ขอ Quote',
      priority: 'medium',
    });
  }
  const insurance: DimensionAnalysis = {
    key: 'insurance',
    title: 'ประกัน',
    icon: '🛡️',
    score: insScore,
    severity: severityFromScore(insScore),
    summary:
      snapshot.insurance.policiesCount === 0
        ? 'ไม่มีประกัน'
        : `${snapshot.insurance.policiesCount} กรมธรรม์ · เบี้ย ฿${snapshot.insurance.annualPremiumTotal.toLocaleString()}/ปี`,
    metrics: [
      {
        label: 'ทุนประกันสุขภาพ',
        value: `฿${snapshot.insurance.healthCoverageSum.toLocaleString()}`,
        benchmark: `เป้า ≥ ฿${recommendedHealthCoverage.toLocaleString()}`,
        severity:
          snapshot.insurance.healthCoverageSum >= recommendedHealthCoverage ? 'good' : 'warn',
      },
      {
        label: 'ทุนประกันชีวิต',
        value: `฿${snapshot.insurance.lifeCoverageSum.toLocaleString()}`,
        benchmark: `แนะนำ ${(annualIncome * 10).toLocaleString()}`,
        severity: 'ok',
      },
      {
        label: 'เบี้ย/ปี',
        value: `฿${snapshot.insurance.annualPremiumTotal.toLocaleString()}`,
        severity: 'ok',
      },
    ],
    recommendations: insRecs,
  };

  // ─── Goals dimension (alias for savings, but separated for narrative) ───
  // Actually we use savings dimension for goals tracking — let's keep them as the same
  const goals: DimensionAnalysis = savings;

  // ─── Compute overall score (weighted) ───
  const overallScore = Math.round(
    cashflow.score * 0.2 +
      emergency.score * 0.15 +
      debt.score * 0.15 +
      savings.score * 0.1 +
      investments.score * 0.15 +
      tax.score * 0.05 +
      insurance.score * 0.1 +
      ((100 - Math.min(100, dashboard.dti * 200)) * 0.1) // overall debt sanity
  );

  // Top recommendations across all dimensions (high priority first)
  const allRecs = [
    ...cashflow.recommendations,
    ...emergency.recommendations,
    ...debt.recommendations,
    ...savings.recommendations,
    ...investments.recommendations,
    ...tax.recommendations,
    ...insurance.recommendations,
  ];
  const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const topRecommendations = allRecs
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
    .slice(0, 8);

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    overallGrade: gradeFromScore(overallScore),
    netWorth: dashboard.netWorth,
    monthIncome: dashboard.monthIncome,
    monthExpense: dashboard.monthExpense,
    monthBalance: dashboard.monthBalance,
    savingsRate: dashboard.savingsRate,
    cashflow,
    emergency,
    debt,
    savings,
    investments,
    tax,
    insurance,
    goals,
    topRecommendations,
    netWorthChange,
    netWorthChangePct,
  };
}
