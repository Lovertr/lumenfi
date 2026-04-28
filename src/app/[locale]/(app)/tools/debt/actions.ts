'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface PayoffOrderItem { debt_id: string; name: string; month: number; }

export async function saveDebtPlan(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const strategy = formData.get('strategy') as 'avalanche' | 'snowball';
  const extraStr = (formData.get('extra_per_month') as string)?.replace(/,/g, '') ?? '0';
  const extra = parseFloat(extraStr) || 0;
  const totalMonths = parseInt((formData.get('total_months') as string) ?? '0', 10) || 0;
  const totalInterestStr = (formData.get('total_interest') as string)?.replace(/,/g, '') ?? '0';
  const totalInterest = parseFloat(totalInterestStr) || 0;

  let payoffOrder: PayoffOrderItem[] = [];
  try {
    const raw = formData.get('payoff_order') as string;
    if (raw) payoffOrder = JSON.parse(raw);
  } catch {
    payoffOrder = [];
  }

  // Deactivate any existing active plan
  await supabase
    .from('debt_plans')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_active', true);

  const { error } = await supabase.from('debt_plans').insert({
    user_id: user.id,
    strategy,
    extra_per_month: extra,
    total_months: totalMonths,
    total_interest: totalInterest,
    payoff_order: payoffOrder,
    is_active: true,
  });

  if (error) {
    console.error('saveDebtPlan:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/debts');
  revalidatePath('/tools/debt');
  return { ok: true };
}


// Quick-create debt from the calculator (lighter form than /debts/new)
export async function quickCreateDebt(formData: FormData): Promise<{ ok: boolean; error?: string; id?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  const name = (formData.get('name') as string)?.trim();
  const type = (formData.get('type') as string) || 'other';
  const balanceStr = (formData.get('balance') as string)?.replace(/,/g, '') ?? '0';
  const balance = parseFloat(balanceStr);
  const rateStr = (formData.get('rate') as string) ?? '0';
  const rate = parseFloat(rateStr);
  const minStr = (formData.get('min_payment') as string)?.replace(/,/g, '') ?? '0';
  const minPayment = parseFloat(minStr) || 0;

  if (!name || isNaN(balance) || balance <= 0 || isNaN(rate)) {
    return { ok: false, error: 'invalid' };
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('debts')
    .insert({
      user_id: user.id,
      name,
      type,
      original_principal: balance,
      current_balance: balance,
      interest_rate: rate,
      monthly_payment: minPayment > 0 ? minPayment : null,
      start_date: today,
    })
    .select('id')
    .single();

  if (error) {
    console.error('quickCreateDebt:', error);
    return { ok: false, error: 'db_error' };
  }

  revalidatePath('/debts');
  revalidatePath('/dashboard');
  revalidatePath('/tools/debt');
  return { ok: true, id: data?.id };
}

export async function deactivateDebtPlan() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase
    .from('debt_plans')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_active', true);

  revalidatePath('/debts');
  revalidatePath('/tools/debt');
}

import { decrypt } from '@/lib/encryption';
import { chat, type AIProvider } from '@/lib/ai';
import { FINANCE_EXPERTISE_TH } from '@/lib/ai/prompts';

interface DebtForAI {
  name: string;
  type: string;
  balance: number;
  rate: number;
  monthly_payment: number;
  rate_type?: string | null;
}

interface GoalSnapshot {
  name: string;
  target: number;
  current: number;
  deadline: string | null;
  is_emergency_fund: boolean;
  is_linked: boolean;
  monthly_required: number | null;
}

interface CashflowSnapshot {
  status: 'healthy' | 'tight' | 'critical';
  status_reason: string;
  months_of_runway: number;
  avg_monthly_net: number;
  projected_net_30: number;
  upcoming_fixed_expense: number;
  upcoming_fixed_income: number;
}

interface FinancialSnapshot {
  monthly_income: number;
  monthly_expense_total: number;
  existing_debt_payments: number;
  total_debt: number;
  cash_available: number;
  total_assets: number;
  active_months: number;
  budget_categories?: { name: string; budget: number; spent: number }[];
  goals?: GoalSnapshot[];
  cashflow?: CashflowSnapshot | null;
}

export async function analyzeDebtSituation(
  debts: DebtForAI[],
  snapshot: FinancialSnapshot,
  extra_per_month: number,
  chosenStrategy: 'avalanche' | 'snowball'
): Promise<{ ok: boolean; advice?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('ai_provider, ai_api_key_encrypted')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.ai_provider || !profile?.ai_api_key_encrypted) {
    return { ok: false, error: 'no_ai_key' };
  }

  let apiKey: string;
  try {
    apiKey = await decrypt(profile.ai_api_key_encrypted);
  } catch {
    return { ok: false, error: 'decryption_failed' };
  }

  const dti = snapshot.monthly_income > 0
    ? (snapshot.existing_debt_payments / snapshot.monthly_income) * 100
    : 0;
  const disposableIncome = snapshot.monthly_income - snapshot.monthly_expense_total;
  const monthsToCover = snapshot.monthly_income > 0
    ? snapshot.total_debt / snapshot.monthly_income
    : 0;

  const debtList = debts.map((d, i) =>
    `${i + 1}. ${d.name} (${d.type}): ฿${d.balance.toLocaleString()} · ${d.rate}%/ปี · ผ่อน ฿${d.monthly_payment.toLocaleString()}/เดือน${d.rate_type ? ` · ${d.rate_type}` : ''}`
  ).join('\n');

  const cashflowText = snapshot.cashflow ? `

**Cash Flow ปัจจุบัน:**
- สถานะ: ${snapshot.cashflow.status === 'healthy' ? '✓ แข็งแรง' : snapshot.cashflow.status === 'tight' ? '⚠ ตึง' : '✗ วิกฤต'} (${snapshot.cashflow.status_reason})
- เงินสดสำรองอยู่ได้: ${snapshot.cashflow.months_of_runway.toFixed(1)} เดือน (จากการใช้จ่ายปกติ)
- สุทธิเฉลี่ย/เดือน: ฿${Math.round(snapshot.cashflow.avg_monthly_net).toLocaleString()}
- คาดการณ์ 30 วันข้างหน้า: ฿${Math.round(snapshot.cashflow.projected_net_30).toLocaleString()}
- ค่าใช้จ่ายประจำที่จะมา: ฿${Math.round(snapshot.cashflow.upcoming_fixed_expense).toLocaleString()}/เดือน
- รายรับประจำที่จะเข้า: ฿${Math.round(snapshot.cashflow.upcoming_fixed_income).toLocaleString()}/เดือน
` : '';

  const goalsText = snapshot.goals && snapshot.goals.length > 0 ? `

**เป้าหมายของผู้ใช้ (${snapshot.goals.length} อัน):**
${snapshot.goals.map((g, i) => `${i + 1}. ${g.name}${g.is_emergency_fund ? ' 🛡️ (กองทุนฉุกเฉิน)' : ''}: ฿${g.current.toLocaleString()} / ฿${g.target.toLocaleString()} (${Math.round((g.current / g.target) * 100)}%)${g.deadline ? ` · กำหนด ${g.deadline}` : ''}${g.monthly_required ? ` · ต้องเก็บ ฿${g.monthly_required.toLocaleString()}/เดือน` : ''}${g.is_linked ? ' · ผูกบัญชี (auto-sync)' : ''}`).join('\n')}

📌 ช่วยพิจารณาให้ชัดว่าเป้าหมายไหนควร: ลด/ยืด/ล้มเลิก/รักษาไว้ เพื่อปลดหนี้ก่อน
` : '';

  const budgetText = snapshot.budget_categories && snapshot.budget_categories.length > 0
    ? '\n\n**งบประมาณรายเดือน:**\n' + snapshot.budget_categories.map((b) =>
        `- ${b.name}: ใช้ ฿${b.spent.toLocaleString()} / งบ ฿${b.budget.toLocaleString()} (${b.budget > 0 ? Math.round((b.spent / b.budget) * 100) : 0}%)`
      ).join('\n')
    : '';

  const systemPrompt = `คุณเป็นที่ปรึกษาการเงินผู้เชี่ยวชาญด้านการจัดการหนี้
ผู้ใช้ต้องการคำแนะนำเพื่อปลดหนี้ให้เร็วและมีประสิทธิภาพ

ตอบเป็นภาษาไทย ใช้ markdown โครงสร้างชัดเจน:

## สรุปสถานะหนี้
- DTI ปัจจุบัน + ระดับ (ปลอดภัย/ระวัง/วิกฤต)
- ภาพรวมหนี้ทั้งหมด
- เงินเหลือใช้ต่อเดือน

## วิเคราะห์ปัญหา
- 2-4 ข้อ พร้อมตัวเลขเฉพาะเจาะจง
- เน้นจุดสำคัญที่กระทบมากที่สุด

## กลยุทธ์ที่แนะนำ
- เลือกระหว่าง Avalanche / Snowball / Consolidation / Refinance
- เหตุผลที่เลือก
- ลำดับการโจมตีหนี้

## ✨ เพิ่มรายได้
- 3-5 วิธีเฉพาะเจาะจง พร้อมตัวเลขเป้าหมาย
- เช่น "หางาน freelance 5,000-10,000 บาท/เดือน"
- หรือ "ขายของไม่ใช้ในบ้าน คาด ฿20,000"

## 💸 ลดรายจ่าย
- 3-5 วิธีเฉพาะเจาะจง
- ระบุหมวดที่ใช้เกินงบ (ถ้ามี)
- เช่น "ลดอาหารนอกบ้าน ฿3,000/เดือน"
- หรือ "ยกเลิก subscription ที่ไม่ใช้"

## 💰 ผลกระทบต่อ Cash Flow
- วิเคราะห์ว่าจ่ายเพิ่มเดือนละ X กระทบ runway/เงินเหลือใช้แค่ไหน
- ถ้า Cash Flow ติดลบหรือ runway < 3 เดือน → เตือนว่าอาจสร้างหนี้ใหม่
- เสนอจำนวนที่ปลอดภัยสำหรับ "จ่ายเพิ่ม" ที่ไม่กระทบ Cash Flow

## 🎯 เป้าหมายที่ต้องปรับ
- ดูเป้าหมายแต่ละอันของผู้ใช้ (ที่จะแนบมา)
- บอกชัดๆ ว่าควร:
  * "ลดเป้าหมาย X จาก Y → Z" (ถ้าวงเงินสูงเกิน)
  * "ยืดเวลาเป้าหมาย X จาก Y → Z" (ถ้ากำหนดเร็วเกิน)
  * "ล้มเลิก/พักเป้าหมาย X" (ถ้าหนี้สำคัญกว่ามาก)
  * "เป้าหมาย X ห้ามแตะ — เป็น Emergency Fund" (สำคัญที่สุด)
- ระบุเหตุผลและตัวเลขชัดๆ ทุกครั้ง

## 📅 กรอบเวลา (Timeline)
- ปลดหนี้ทั้งหมดใน X เดือน/ปี
- Milestone รายไตรมาส
- เป้าหมายเงินเก็บฉุกเฉินคู่ขนาน

## ⚠️ เตือน
- ความเสี่ยงที่ต้องระวัง
- ห้ามทำอะไร

ตัวเลขทุกตัวให้ใช้บาทเต็ม (฿) ห้ามใช้ K/M ย่อ
อ้างอิงเทคนิคจริง เช่น คลินิกแก้หนี้ ธปท., รวมหนี้สินเชื่อบุคคล, รีไฟแนนซ์บ้าน
${FINANCE_EXPERTISE_TH}`;

  const userMessage = `ขอคำแนะนำในการจัดการหนี้ทั้งหมดของผู้ใช้ — เน้นวิธีปลดให้เร็วที่สุดด้วยเงื่อนไขจริง

**หนี้ทั้งหมด (${debts.length} ก้อน):**
${debtList}

**ข้อมูลทางการเงิน (เฉลี่ย ${snapshot.active_months} เดือนล่าสุด):**
- รายรับ/เดือน: ฿${snapshot.monthly_income.toLocaleString()}
- รายจ่าย/เดือน (รวมหนี้): ฿${snapshot.monthly_expense_total.toLocaleString()}
- ผ่อนหนี้/เดือน: ฿${snapshot.existing_debt_payments.toLocaleString()}
- เงินเหลือใช้/เดือน: ฿${disposableIncome.toLocaleString()}
- DTI: ${dti.toFixed(1)}%
- หนี้รวม: ฿${snapshot.total_debt.toLocaleString()} (${monthsToCover.toFixed(1)} เท่าของรายได้/เดือน)
- สินทรัพย์รวม: ฿${snapshot.total_assets.toLocaleString()}
- เงินสดที่เข้าถึงได้: ฿${snapshot.cash_available.toLocaleString()}
${budgetText}${cashflowText}${goalsText}

**กลยุทธ์ที่เลือก:** ${chosenStrategy === 'avalanche' ? 'Avalanche (ดอกสูงก่อน)' : 'Snowball (ก้อนเล็กก่อน)'}
**จ่ายเพิ่ม/เดือน:** ฿${extra_per_month.toLocaleString()}

ให้คำแนะนำที่ปฏิบัติได้จริง โฟกัสที่ "เพิ่มรายได้" และ "ลดรายจ่าย" ที่เป็นไปได้ในกรณีนี้ — อย่ายกตัวอย่างเก่าๆ`;

  try {
    const result = await chat(
      profile.ai_provider as AIProvider,
      apiKey,
      [{ role: 'user', content: userMessage }],
      systemPrompt
    );
    return { ok: true, advice: result.text };
  } catch (e: any) {
    console.error('analyzeDebtSituation:', e?.message);
    return { ok: false, error: 'ai_error' };
  }
}
