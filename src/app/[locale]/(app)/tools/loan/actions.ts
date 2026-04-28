'use server';

import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { chat, type AIProvider } from '@/lib/ai';
import { FINANCE_EXPERTISE_TH } from '@/lib/ai/prompts';

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

ตอบในรูปแบบตัวเลขสกุลบาท (฿) เท่านั้น\n\n${FINANCE_EXPERTISE_TH}`;

  const userMessage = `ผู้ใช้กำลังพิจารณากู้เงิน ช่วยประเมินว่าควรกู้หรือไม่:

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
