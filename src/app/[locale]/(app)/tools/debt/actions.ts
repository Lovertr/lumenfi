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
  chosenStrategy: 'avalanche' | 'snowball',
  extra_unspecified: boolean = false
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

  // Consolidation analysis: weighted avg rate + potential savings
  const totalBalance = debts.reduce((s, d) => s + d.balance, 0);
  const totalCurrentMonthly = debts.reduce((s, d) => s + d.monthly_payment, 0);
  const weightedAvgRate = totalBalance > 0
    ? debts.reduce((s, d) => s + d.balance * d.rate, 0) / totalBalance
    : 0;
  const highestRateDebt = debts.length > 0
    ? debts.reduce((max, d) => (d.rate > max.rate ? d : max), debts[0])
    : null;

  // Estimate consolidation savings at common rates (rough: PMT formula at 60-month term)
  function pmt60(P: number, rPct: number) {
    if (P <= 0) return 0;
    if (rPct === 0) return P / 60;
    const r = rPct / 100 / 12;
    return (P * r) / (1 - Math.pow(1 + r, -60));
  }
  // Sum of "current" interest assuming current minimums (rough — uses weighted avg)
  function estimateTotalInterestAtRate(P: number, monthly: number, rPct: number): number {
    if (P <= 0 || monthly <= 0 || rPct === 0) return 0;
    const r = rPct / 100 / 12;
    const monthsToZero = -Math.log(1 - (P * r) / monthly) / Math.log(1 + r);
    if (!isFinite(monthsToZero) || monthsToZero <= 0) return 0;
    return Math.max(0, monthly * monthsToZero - P);
  }
  const currentTotalInterest = debts.reduce(
    (s, d) => s + estimateTotalInterestAtRate(d.balance, d.monthly_payment, d.rate),
    0
  );
  const consol15Monthly = pmt60(totalBalance, 15);
  const consol15Interest = consol15Monthly * 60 - totalBalance;
  const consol7Monthly = pmt60(totalBalance, 7); // BoT Debt Clinic typical
  const consol7Interest = consol7Monthly * 60 - totalBalance;

  const disposableIncome = snapshot.monthly_income - snapshot.monthly_expense_total;
  const monthsToCover = snapshot.monthly_income > 0
    ? snapshot.total_debt / snapshot.monthly_income
    : 0;

  const debtList = debts.map((d, i) =>
    `${i + 1}. ${d.name} (${d.type}): ฿${d.balance.toLocaleString()} · ${d.rate}%/ปี · ผ่อน ฿${d.monthly_payment.toLocaleString()}/เดือน${d.rate_type ? ` · ${d.rate_type}` : ''}`
  ).join('\n');

  const consolidationText = debts.length >= 2 ? `

**🔄 ข้อมูลสำหรับวิเคราะห์โอกาสรวมหนี้:**
- หนี้รวมทั้งหมด: ฿${totalBalance.toLocaleString()}
- ดอกเบี้ยถ่วงน้ำหนัก (weighted avg): ${weightedAvgRate.toFixed(2)}%
- ก้อนดอกสูงสุด: ${highestRateDebt?.name} ที่ ${highestRateDebt?.rate}%
- ดอกเบี้ยรวมที่ต้องจ่ายตามอัตราเดิม (ประมาณ): ฿${Math.round(currentTotalInterest).toLocaleString()}

**ทางเลือกการรวมหนี้ที่ควรพิจารณา (60 เดือน):**
- ที่ 15%/ปี (P-Loan ธนาคารทั่วไป): ผ่อน ฿${Math.round(consol15Monthly).toLocaleString()}/เดือน, ดอกรวม ฿${Math.round(consol15Interest).toLocaleString()} → ${Math.round(currentTotalInterest - consol15Interest).toLocaleString()} บาท ${currentTotalInterest > consol15Interest ? 'ประหยัดกว่า' : 'แพงกว่า'}เดิม
- ที่ 7%/ปี (คลินิกแก้หนี้ ธปท.): ผ่อน ฿${Math.round(consol7Monthly).toLocaleString()}/เดือน, ดอกรวม ฿${Math.round(consol7Interest).toLocaleString()} → ${Math.round(currentTotalInterest - consol7Interest).toLocaleString()} บาท ${currentTotalInterest > consol7Interest ? 'ประหยัดกว่า' : 'แพงกว่า'}เดิม
` : '';

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

  const systemPrompt = `คุณเป็นที่ปรึกษาการเงินผู้เชี่ยวชาญด้านการจัดการหนี้แบบไทย
ผู้ใช้ต้องการคำแนะนำเพื่อปลดหนี้ให้เร็ว ปลอดภัย และมีประสิทธิภาพ

⚠️ กฎเหล็กที่ต้องเคารพในทุกคำแนะนำ:
1. หนี้มีหลักประกัน (รถ/บ้าน) — ห้ามแนะนำให้หยุดจ่าย แม้ดอกจะต่ำกว่าหนี้อื่น เพราะ:
   * รถ: ค้าง 3 งวดติด → ยึดรถภายใน 30 วัน
   * บ้าน: ค้าง 3-6 งวด → ฟ้องและยึดได้ใน 1-3 ปี
2. หนี้นอกระบบ — ต้องปลดเป็นอันดับแรกเสมอ แม้ดอกจะต่ำกว่า เพราะมีความเสี่ยงทางกายภาพ
3. กลยุทธ์ Avalanche/Snowball ใช้กับ "เงินจ่ายเพิ่ม" เท่านั้น — ทุกก้อนต้องจ่ายขั้นต่ำเสมอ
4. ถ้า Cash Flow จ่ายขั้นต่ำไม่ไหว — ต้องเจรจากับเจ้าหนี้ก่อนผิดนัด ไม่ใช่หยุดจ่าย
5. ถ้าหนี้รวมสูงและจ่ายขั้นต่ำไม่ไหว — แนะนำคลินิกแก้หนี้ ธปท. (debtclinic.bot.or.th)

ตอบเป็นภาษาไทย ใช้ markdown โครงสร้างชัดเจน:

## สรุปสถานะหนี้
- DTI ปัจจุบัน + ระดับ (ปลอดภัย/ระวัง/วิกฤต)
- ภาพรวมหนี้ทั้งหมด
- เงินเหลือใช้ต่อเดือน

## วิเคราะห์ปัญหา
- 2-4 ข้อ พร้อมตัวเลขเฉพาะเจาะจง
- เน้นจุดสำคัญที่กระทบมากที่สุด

## กลยุทธ์ที่แนะนำ
- เลือกระหว่าง Avalanche / Snowball / Consolidation / Refinance / ปรับโครงสร้าง / คลินิกแก้หนี้
- เหตุผลที่เลือก โดยพิจารณา:
  * ประเภทหนี้ (มีหลักประกันหรือไม่)
  * ระยะเวลาผลกระทบถ้าผิดนัด
  * ความสามารถจ่ายปัจจุบัน
- ลำดับการโจมตีหนี้ (พร้อมระบุว่าก้อนไหนต้องจ่ายขั้นต่ำเท่าเดิม / ก้อนไหนทุ่มเงินเพิ่ม)
- ⚠️ ระบุชัดว่าก้อนไหนเป็นหนี้มีหลักประกัน — ห้ามขาดงวดเด็ดขาด

## 💪 ควรจ่ายเพิ่มเท่าไหร่ต่อเดือน
- ถ้าผู้ใช้ระบุ "จ่ายเพิ่ม/เดือน: 🤖 ไม่ได้ระบุ" → แนะนำจำนวนที่เหมาะสมที่สุดด้วยตัวเลขเฉพาะ
  * คำนวณ: เงินเหลือใช้ − เงินสำรองฉุกเฉิน 1-2 เดือน = เงินที่จ่ายเพิ่มได้ปลอดภัย
  * ระบุ 3 ระดับ: **ขั้นต่ำที่ต้องจ่ายเพิ่ม** (ปลอดภัย), **เหมาะที่สุด** (Sweet spot), **เร่งด่วน** (เสี่ยงแต่หมดเร็ว)
  * ตัวอย่าง: 'แนะนำให้จ่ายเพิ่ม ฿3,500/เดือน — ปลดหนี้ใน 18 เดือน, ดอกประหยัด ฿8,200, Cash Flow ยังเหลือ ฿2,500'
  * ถ้า Cash Flow ติดลบหรือใกล้ติดลบ → ระบุชัดว่า '0 บาท + ต้องเพิ่มรายได้/ลดรายจ่ายก่อน'
- ถ้าผู้ใช้ระบุ ฿0 → ยอมรับและแนะนำกลยุทธ์ที่ใช้เฉพาะเงินขั้นต่ำเท่าเดิม + แนะนำว่าถ้าหา ฿X เพิ่มได้จะเร็วขึ้นเท่าไหร่ (ไม่บังคับ)
- ถ้าผู้ใช้ระบุจำนวนแล้ว → ตรวจว่าจำนวนนั้นปลอดภัยกับ Cash Flow หรือไม่ ถ้าเสี่ยงให้เตือนและเสนอจำนวนที่ปลอดภัยกว่า

## 🔄 โอกาสรวมหนี้ (Consolidation)
ถ้ามีหนี้ ≥ 2 ก้อน ต้องประเมินตัวเลือกนี้เสมอด้วยตัวเลขจริง:
- ใช้ดอกเบี้ยถ่วงน้ำหนักปัจจุบัน vs อัตราที่ทำได้จากการรวมหนี้
- เปรียบเทียบ: 'ผ่อนเดิม X/เดือน' vs 'ผ่อนใหม่ Y/เดือน' + 'ดอกประหยัดได้ Z'
- ถ้ามีหนี้ดอก > 15% (บัตรเครดิต/สินเชื่อบุคคล) → ควรรวมเข้าธนาคารดอกถูกหรือคลินิกแก้หนี้
- ระบุ route ที่เหมาะ:
  * **คลินิกแก้หนี้ ธปท.** (NPL บัตร/บุคคล) — ดอก 4-7%, 10 ปี → debtclinic.bot.or.th
  * **P-Loan ธนาคาร** (เช่น KTC P-Loan, KBank) — ดอก 14-22%, 5 ปี
  * **Balance Transfer** บัตรอื่น 0% นาน 6-10 เดือน — ใช้ปลดเร็ว
  * **Debt Buddy / SCB Easy / KBank** — รวมทุกธนาคาร
- ⚠️ ระวังกับดัก:
  * ผ่อน/เดือนน้อยลง แต่ระยะเวลานานขึ้น → ดอกรวมอาจสูงกว่าเดิม
  * Balance Transfer ค่าธรรมเนียม 1-3% + ดอกหลังหมดโปรพุ่งสูง
- 📌 หากตัวเลขแสดงว่าควรรวม — แนะนำให้ผู้ใช้ลองที่ \`/tools/loan\` เปิด 'โหมดรวมหนี้' เพื่อ simulation แม่นยำ

## 🤝 ตัวเลือกการเจรจา (ถ้าจ่ายไม่ไหว)
ถ้า Cash Flow ตึง/วิกฤต หรือมีหนี้ "ใต้น้ำ" (ขั้นต่ำ < ดอกเบี้ย) — แนะนำเฉพาะเจาะจงตามสถานการณ์ เช่น:
- โทรหาธนาคาร X ขอ "พักชำระเงินต้น 6 เดือน" เพื่อลดผ่อนเหลือ Y/เดือน
- ขอ "ยืดเวลาผ่อน" หนี้ก้อน X จาก N → M ปี → ลดผ่อนเหลือ Y/เดือน
- รวมหนี้บัตรเข้าคลินิกแก้หนี้ ธปท. → ดอกลดจาก 18% → 4-7%, ผ่อน 10 ปี
- ขอ Settlement (ตัดต้น) ก้อน X 30-60% ถ้ามีเงินก้อน
- เตือน: ระบุเอกสาร/ขั้นตอนติดต่อจริง

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
อ้างอิงเทคนิคจริง เช่น คลินิกแก้หนี้ ธปท. (debtclinic.bot.or.th), รวมหนี้สินเชื่อบุคคล, รีไฟแนนซ์บ้าน

🎯 หากผู้ใช้มีหนี้รถ ในแผนต้องระบุชัดว่า "ขั้นต่ำ X บาท/เดือน ห้ามพลาดเด็ดขาด เพราะรถจะถูกยึดภายใน 30 วันหลังค้าง 3 งวดติด"
🎯 หากมีหนี้บ้าน — เน้นว่ามีเวลาเจรจามากกว่ารถ
🎯 หากมีหนี้นอกระบบ — ปลดเป็นอันดับ 1 เสมอ ห้ามรอ

📝 สำคัญ: แต่ละ section ตอบสั้น กระชับ 3-5 bullets — เน้นตัวเลขและการกระทำ ไม่อธิบายทฤษฎียาว ทำให้ผู้ใช้อ่านจบและเอาไปทำได้`;

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
${budgetText}${cashflowText}${goalsText}${consolidationText}

**กลยุทธ์ที่เลือก:** ${chosenStrategy === 'avalanche' ? 'Avalanche (ดอกสูงก่อน)' : 'Snowball (ก้อนเล็กก่อน)'}
**จ่ายเพิ่ม/เดือน:** ${extra_unspecified ? '🤖 ไม่ได้ระบุ — ขอให้คุณคำนวณและแนะนำจำนวนที่เหมาะสมที่สุดสำหรับผู้ใช้ จากเงินเหลือใช้และเป้าหมาย Cash Flow' : extra_per_month === 0 ? '฿0 (ผู้ใช้ยืนยันว่าไม่จ่ายเพิ่ม — แนะนำเฉพาะกลยุทธ์โดยใช้เงินที่ผ่อนปกติเท่านั้น)' : `฿${extra_per_month.toLocaleString()}`}

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
