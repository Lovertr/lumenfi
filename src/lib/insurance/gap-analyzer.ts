// ─────────────────────────────────────────────────────────
// Insurance Gap Analyzer
// คำนวณว่าผู้ใช้ "ขาด" ความคุ้มครองอะไรบ้างจากข้อมูลในแอพ
// ─────────────────────────────────────────────────────────

export interface InsuranceContext {
  age: number | null;             // อายุ (จาก date_of_birth)
  monthlyIncome: number;          // จากค่าเฉลี่ย transactions รายรับ
  monthlyExpense: number;         // ค่าเฉลี่ย transactions รายจ่าย
  totalDebt: number;              // หนี้รวม
  monthlyDebtPayment: number;     // ผ่อนหนี้ต่อเดือน
  emergencyFund: number;          // เงินสำรอง (จาก asset accounts)
  numDependents: number;          // จำนวนคนในอุปการะ (จาก profile)
  hasHealthExpenses: boolean;     // เคยมี transaction หมวดสุขภาพ
  monthlyHealthExpense: number;   // ค่าเฉลี่ยรายจ่ายสุขภาพ
  existingPolicies: ExistingPolicy[];
}

export interface ExistingPolicy {
  type: 'life' | 'health' | 'critical_illness' | 'accident' | 'car' | 'home' | 'travel' | 'other';
  sum_insured: number;
  annual_premium: number;
}

export type Severity = 'critical' | 'recommended' | 'optional' | 'covered';

export interface GapResult {
  type: 'life' | 'health' | 'critical_illness' | 'accident' | 'emergency_fund';
  severity: Severity;
  current: number;
  recommended: number;
  gap: number;
  reasoning: string;
  suggestedPremium: { min: number; max: number };
  taxBenefit: number;
}

const PERSONAL_INSURANCE_TAX_DEDUCT = 100_000;
const HEALTH_INSURANCE_TAX_DEDUCT = 25_000;

export function analyzeInsuranceGap(ctx: InsuranceContext): GapResult[] {
  const out: GapResult[] = [];

  const age = ctx.age ?? 30;
  const annualIncome = ctx.monthlyIncome * 12;
  const annualExpense = ctx.monthlyExpense * 12;

  // ── Life insurance ──────────────────────────────────────
  // DIME formula simplified:
  //   ทุนชีวิตที่แนะนำ = หนี้คงเหลือ + (รายได้ × ปีจนเกษียณ × 0.7)
  // ถ้ามี dependents +1 เพิ่ม buffer, ถ้ายังเด็ก/ไม่มี dependents = optional
  const yearsToRetirement = Math.max(0, 60 - age);
  const lifeRecommended = ctx.numDependents > 0
    ? Math.max(
        ctx.totalDebt + annualIncome * yearsToRetirement * 0.7,
        annualIncome * 10
      )
    : ctx.totalDebt > 0
      ? ctx.totalDebt * 1.2
      : annualIncome * 5;

  const currentLife = sumByType(ctx.existingPolicies, 'life');
  const lifeGap = Math.max(0, lifeRecommended - currentLife);

  out.push({
    type: 'life',
    severity:
      currentLife >= lifeRecommended * 0.9 ? 'covered' :
      ctx.numDependents > 0 || ctx.totalDebt > 500_000 ? 'critical' :
      ctx.totalDebt > 0 ? 'recommended' : 'optional',
    current: currentLife,
    recommended: lifeRecommended,
    gap: lifeGap,
    reasoning: ctx.numDependents > 0
      ? `มีคนในอุปการะ ${ctx.numDependents} คน — ต้องมีทุนคุ้มครองรายได้แทน`
      : ctx.totalDebt > 0
        ? `มีหนี้รวม ${formatTHB(ctx.totalDebt)} — ป้องกันคนข้างหลังต้องรับภาระ`
        : 'ทุนคุ้มครองไว้ปกป้องอนาคต ลดหย่อนภาษีได้ ฿100,000',
    suggestedPremium: estimatePremium('life', lifeGap, age),
    taxBenefit: estimateTaxSaving(annualIncome, Math.min(PERSONAL_INSURANCE_TAX_DEDUCT, lifeGap * 0.025)),
  });

  // ── Health insurance ────────────────────────────────────
  // ทุนแนะนำ: ค่ารักษา IPD โรงพยาบาลเอกชน 200K-3M ต่อครั้ง
  // ถ้าไม่มีประกันสุขภาพเลย = critical
  const healthRecommended = age < 40 ? 1_500_000 : age < 50 ? 2_500_000 : 3_500_000;
  const currentHealth = sumByType(ctx.existingPolicies, 'health');
  const healthGap = Math.max(0, healthRecommended - currentHealth);

  out.push({
    type: 'health',
    severity:
      currentHealth >= healthRecommended * 0.9 ? 'covered' :
      currentHealth === 0 ? 'critical' :
      'recommended',
    current: currentHealth,
    recommended: healthRecommended,
    gap: healthGap,
    reasoning: currentHealth === 0
      ? 'ไม่มีประกันสุขภาพ — ค่ารักษา IPD โรงพยาบาลเอกชน ฿200K-3M ต่อครั้ง'
      : `ทุนปัจจุบัน ${formatTHB(currentHealth)} อาจไม่พอสำหรับโรคใหญ่`,
    suggestedPremium: estimatePremium('health', healthGap, age),
    taxBenefit: estimateTaxSaving(annualIncome, HEALTH_INSURANCE_TAX_DEDUCT),
  });

  // ── Critical illness ────────────────────────────────────
  // 1 ใน 4 คนเป็นมะเร็งช่วงชีวิต — ทุนแนะนำ = 2 ปีของรายได้ หรือ ขั้นต่ำ ฿1M
  const ciRecommended = Math.max(annualIncome * 2, 1_000_000);
  const currentCI = sumByType(ctx.existingPolicies, 'critical_illness');
  const ciGap = Math.max(0, ciRecommended - currentCI);

  out.push({
    type: 'critical_illness',
    severity:
      currentCI >= ciRecommended * 0.9 ? 'covered' :
      age >= 35 && currentCI === 0 ? 'critical' :
      currentCI === 0 ? 'recommended' :
      'optional',
    current: currentCI,
    recommended: ciRecommended,
    gap: ciGap,
    reasoning: age >= 35
      ? 'อายุ ' + age + '+ ความเสี่ยงโรคร้ายเริ่มสูง ต้องมีทุนคุ้มครองรายได้ระหว่างรักษา'
      : '1 ใน 4 คนเป็นมะเร็งช่วงชีวิต — ทุนช่วยจ่ายค่ารักษา + ค่าครองชีพระหว่างหยุดงาน',
    suggestedPremium: estimatePremium('critical_illness', ciGap, age),
    taxBenefit: 0,
  });

  // ── Accident ────────────────────────────────────────────
  const paRecommended = Math.max(annualIncome, 500_000);
  const currentPA = sumByType(ctx.existingPolicies, 'accident');
  const paGap = Math.max(0, paRecommended - currentPA);

  out.push({
    type: 'accident',
    severity:
      currentPA >= paRecommended * 0.5 ? 'covered' :
      'optional',
    current: currentPA,
    recommended: paRecommended,
    gap: paGap,
    reasoning: 'อุบัติเหตุเกิดได้ทุกเมื่อ เบี้ยถูกที่สุด ฿1,500-3,000/ปีก็ได้ทุน 1M',
    suggestedPremium: estimatePremium('accident', paGap, age),
    taxBenefit: 0,
  });

  // ── Emergency fund (related — not insurance but in same category) ──
  const efRecommended = ctx.monthlyExpense * 6;
  const efGap = Math.max(0, efRecommended - ctx.emergencyFund);

  out.push({
    type: 'emergency_fund',
    severity:
      ctx.emergencyFund >= efRecommended ? 'covered' :
      ctx.emergencyFund >= ctx.monthlyExpense * 3 ? 'recommended' :
      'critical',
    current: ctx.emergencyFund,
    recommended: efRecommended,
    gap: efGap,
    reasoning: `ควรมีเงินสำรองอย่างน้อย 6 เท่าของรายจ่าย (${formatTHB(efRecommended)})`,
    suggestedPremium: { min: 0, max: 0 },
    taxBenefit: 0,
  });

  return out;
}

function sumByType(policies: ExistingPolicy[], type: ExistingPolicy['type']): number {
  return policies.filter((p) => p.type === type).reduce((s, p) => s + Number(p.sum_insured ?? 0), 0);
}

// Rough premium estimate (THB/year) — ปรับจริงจะมี actuarial table แต่อันนี้ approx
function estimatePremium(
  type: 'life' | 'health' | 'critical_illness' | 'accident',
  sumInsured: number,
  age: number
): { min: number; max: number } {
  if (sumInsured === 0) return { min: 0, max: 0 };
  const ageFactor = age < 30 ? 0.7 : age < 40 ? 1.0 : age < 50 ? 1.5 : age < 60 ? 2.5 : 4.0;
  const ratesPer100K = {
    life: 1500,             // ประกันชีวิตสะสมทรัพย์: ~฿1500/100K ทุน
    health: 8000,           // ประกันสุขภาพ: ~฿8000/100K ทุน
    critical_illness: 4000, // CI: ~฿4000/100K ทุน
    accident: 200,          // PA: ~฿200/100K ทุน
  };
  const base = (sumInsured / 100_000) * (ratesPer100K[type] ?? 2000) * ageFactor;
  return {
    min: Math.round(base * 0.7),
    max: Math.round(base * 1.3),
  };
}

// Estimate tax saving (Thai PIT brackets)
function estimateTaxSaving(annualIncome: number, deductionAmount: number): number {
  if (deductionAmount <= 0) return 0;
  // Marginal rate approximation
  const taxableIncome = Math.max(0, annualIncome - 60_000); // 60K personal
  const rate =
    taxableIncome <= 150_000 ? 0 :
    taxableIncome <= 300_000 ? 0.05 :
    taxableIncome <= 500_000 ? 0.10 :
    taxableIncome <= 750_000 ? 0.15 :
    taxableIncome <= 1_000_000 ? 0.20 :
    taxableIncome <= 2_000_000 ? 0.25 :
    taxableIncome <= 5_000_000 ? 0.30 : 0.35;
  return Math.round(deductionAmount * rate);
}

function formatTHB(n: number): string {
  return '฿' + Math.round(n).toLocaleString('th-TH');
}
