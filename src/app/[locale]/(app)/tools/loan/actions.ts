'use server';

import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { chat, type AIProvider } from '@/lib/ai';

interface ConsolidatedDebt {
  name: string;
  balance: number;
  rate: number;
  monthly_payment: number;
  remaining_months: number;
  total_interest_remaining: number;
}

interface LoanContext {
  loan_amount: number;
  loan_rate: number;
  loan_months: number;
  monthly_payment: number;
  monthly_income: number;
  monthly_fixed_expenses: number;
  existing_debt_payments: number;
  reason: string;
  total_debt: number;
  // Consolidation extras (optional)
  consolidation_mode?: boolean;
  consolidated_debts?: ConsolidatedDebt[];
  before_total_monthly?: number;
  before_total_interest?: number;
  before_payoff_months?: number;
}

export async function analyzeLoanFeasibility(ctx: LoanContext): Promise<{
  ok: boolean;
  advice?: string;
  error?: string;
}> {
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

  const newDTI = ((ctx.existing_debt_payments + ctx.monthly_payment) / ctx.monthly_income) * 100;
  const oldDTI = (ctx.existing_debt_payments / ctx.monthly_income) * 100;
  const disposableIncome = ctx.monthly_income - ctx.monthly_fixed_expenses - ctx.existing_debt_payments;
  const remainingAfterNewLoan = disposableIncome - ctx.monthly_payment;

  const systemPrompt = `คุณเป็นที่ปรึกษาการเงินที่เชี่ยวชาญในการประเมินความเหมาะสมของการกู้เงิน
ให้คำตอบเป็นภาษาไทย ใช้ markdown โครงสร้าง:

## สรุป
- ตอบสั้นๆ 1 บรรทัด: **ควรกู้** / **ไม่ควรกู้** / **ควรกู้แต่ปรับ**

## เหตุผล
- 3-4 ข้อเฉพาะเจาะจงพร้อมตัวเลข

## ความเสี่ยง
- 2-3 ข้อ พร้อม mitigation

## คำแนะนำ Action Plan
- 3 ข้อที่ทำได้ทันที

อ้างอิงหลักการ:
- DTI ≤ 40% (ปลอดภัย), 40-50% (ระวัง), >50% (เสี่ยงสูง)
- กฎ 28/36 สำหรับสินเชื่อบ้าน
- กองทุนฉุกเฉิน 3-6 เดือน
- เงินเหลือใช้หลังหนี้ ≥ 30% ของรายได้

ตอบในรูปแบบตัวเลขสกุลบาท (฿) เท่านั้น\n\n📝 ตอบสั้น กระชับ — แต่ละ section 3-5 bullets เน้นตัวเลขและ action`;

  const consolidationBlock = ctx.consolidation_mode && ctx.consolidated_debts && ctx.consolidated_debts.length > 0 ? `

**🔄 โหมดรวมหนี้ (Debt Consolidation)** — ผู้ใช้ต้องการกู้เพื่อปิดหนี้เก่าหลายก้อนแล้วรวมเป็นก้อนเดียว

หนี้เดิมที่จะปิด (${ctx.consolidated_debts.length} ก้อน):
${ctx.consolidated_debts.map((d, i) => `${i + 1}. ${d.name}: ฿${d.balance.toLocaleString()} · ดอก ${d.rate}% · ผ่อน ฿${d.monthly_payment.toLocaleString()}/เดือน · ดอกรวมจนปลด ฿${Math.round(d.total_interest_remaining).toLocaleString()} · จบใน ${d.remaining_months} เดือน`).join('\n')}

**สถานการณ์ก่อนรวมหนี้:**
- ผ่อนหนี้เดิมรวม: ฿${ctx.before_total_monthly?.toLocaleString()}/เดือน
- ดอกที่ต้องจ่ายจนปลดทุกก้อน: ฿${Math.round(ctx.before_total_interest ?? 0).toLocaleString()}
- จะปลดทุกก้อนใน: ${ctx.before_payoff_months} เดือน

**สถานการณ์หลังรวม (เงินกู้ใหม่):**
- ยอดกู้ใหม่: ฿${ctx.loan_amount.toLocaleString()} (= ผลรวมหนี้เดิม)
- ดอก ${ctx.loan_rate}%/ปี × ${ctx.loan_months} เดือน
- ผ่อนใหม่: ฿${ctx.monthly_payment.toLocaleString()}/เดือน
- ลดภาระต่อเดือน: ฿${(ctx.before_total_monthly! - ctx.monthly_payment).toLocaleString()}

**กรุณาเปรียบเทียบและให้คำแนะนำเฉพาะกรณีนี้** — ดอกรวมประหยัดได้กี่บาท, จบเร็วขึ้นหรือช้าลงกี่เดือน, Cash Flow ดีขึ้นแค่ไหน, มีกับดักอะไรไหม (เช่น จ่ายต่อเดือนน้อยลงแต่จบช้าลง = ดอกรวมเยอะขึ้น)
` : '';

  const userMessage = `ผู้ใช้กำลังพิจารณากู้เงิน${ctx.consolidation_mode ? ' (เพื่อรวมหนี้)' : ''} ช่วยประเมินว่าควรกู้หรือไม่:

**รายละเอียดเงินกู้:**
- ยอดกู้: ฿${ctx.loan_amount.toLocaleString()}
- ดอกเบี้ย: ${ctx.loan_rate}%/ปี
- ระยะเวลาผ่อน: ${ctx.loan_months} เดือน
- ผ่อนต่อเดือน: ฿${ctx.monthly_payment.toLocaleString()}
- วัตถุประสงค์: ${ctx.reason || 'ไม่ระบุ'}

**สถานะการเงินผู้ใช้:**
- รายได้ต่อเดือน: ฿${ctx.monthly_income.toLocaleString()}
- รายจ่ายประจำ (ไม่รวมหนี้): ฿${ctx.monthly_fixed_expenses.toLocaleString()}
- ยอดผ่อนหนี้เดิมรวม: ฿${ctx.existing_debt_payments.toLocaleString()}/เดือน
- หนี้สินรวมปัจจุบัน: ฿${ctx.total_debt.toLocaleString()}

**ตัวเลขที่คำนวณได้:**
- DTI ปัจจุบัน: ${oldDTI.toFixed(1)}%
- DTI หลังกู้: ${newDTI.toFixed(1)}%
- เงินเหลือใช้ปัจจุบัน: ฿${disposableIncome.toLocaleString()}/เดือน
- เงินเหลือใช้หลังกู้: ฿${remainingAfterNewLoan.toLocaleString()}/เดือน

${consolidationBlock}

ช่วยวิเคราะห์ตามโครงสร้างที่กำหนด`;

  try {
    const result = await chat(
      profile.ai_provider as AIProvider,
      apiKey,
      [{ role: 'user', content: userMessage }],
      systemPrompt
    );
    return { ok: true, advice: result.text };
  } catch (e: any) {
    console.error('analyzeLoanFeasibility:', e?.message);
    return { ok: false, error: 'ai_error' };
  }
}
