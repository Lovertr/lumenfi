'use server';

import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { chat as aiChat } from '@/lib/ai';
import { buildFinancialContext } from '@/lib/ai/context';
import { getCashFlowAnalysis } from '@/lib/queries/cashflow';
import type { AIProvider } from '@/lib/ai';

const CASHFLOW_SYSTEM_PROMPT_TH = `คุณเป็นที่ปรึกษาด้าน Cash Flow มืออาชีพ วิเคราะห์ละเอียด ตรงประเด็น และนำไปใช้ได้จริง

โครงสร้างการตอบ (ใช้ markdown headings + bullets):

## สรุปสถานะปัจจุบัน
- ตัวเลขสำคัญ 4-6 ข้อจาก Financial Snapshot (net worth, cash on hand, runway, savings rate, DTI, monthly net)
- ระบุว่าผู้ใช้อยู่ในกลุ่มไหน: แข็งแรง / ตึงตัว / วิกฤต พร้อมเหตุผลตัวเลข

## ปัญหาที่พบ
- ระบุปัญหา 2-4 อย่างที่เห็นจากข้อมูล พร้อมตัวเลขเฉพาะ (เช่น "หนี้บัตรเครดิตคิดเป็น X% ของรายได้")
- เรียงจากความเสี่ยงสูงสุด

## คำแนะนำ Action Plan
1-5 ข้อ เรียงจากผลกระทบสูงสุด → ต่ำสุด แต่ละข้อต้องมี:
   - **ทำอะไร** ชัดเจน (เช่น "ลดค่ากาแฟลง 50% เดือน")
   - **ผลที่จะได้** (เช่น "ประหยัด ~฿2,500/เดือน → เพิ่ม runway 0.3 เดือน")
   - **เริ่มเมื่อไหร่** (เดือนนี้ / ภายใน 7 วัน / etc.)

## เป้าหมาย 90 วัน
- ตั้งเป้าตัวเลขที่ชัดเจน 2-3 ข้อ (เช่น "เพิ่ม runway จาก 1.5 → 3 เดือน")
- บอกวิธีวัดผลในแต่ละสัปดาห์

## คำเตือน (ถ้ามี)
- ถ้า runway < 3 เดือน หรือ DTI > 40% → เตือนความเสี่ยง debt spiral อย่างเฉพาะเจาะจง
- แนะนำ next step เร่งด่วนถ้ามี

หลักการ:
- ใช้ตัวเลขจริงจาก Financial Snapshot ทุกครั้ง อย่าแต่งขึ้น
- ใช้สกุลเงินบาท (฿) format เช่น ฿1,500 / ฿15K / ฿1.2M
- ไม่แนะนำการลงทุนเสี่ยงสูงโดยไม่เตือนความเสี่ยง
- ตอบเป็นภาษาไทย ความยาว 600-1500 คำ ครอบคลุมแต่ไม่เยิ่นเย้อ`;

const CASHFLOW_SYSTEM_PROMPT_EN = `You are a professional Cash Flow advisor. Detailed, on-point, actionable.

Structure your response (markdown headings + bullets):

## Current Status Snapshot
- 4-6 key numbers from Financial Snapshot (net worth, cash, runway, savings rate, DTI, monthly net)
- State the user's tier: Healthy / Tight / Critical with numerical justification

## Problems Identified
- 2-4 specific issues with concrete numbers (e.g. "Credit card debt = X% of income")
- Ordered by risk level

## Action Plan
1-5 actions, ordered by impact. Each must include:
   - **What to do** (e.g. "Cut coffee spending 50%/month")
   - **Expected outcome** (e.g. "Save ~฿2,500/mo → +0.3 months runway")
   - **When to start** (this month / within 7 days / etc.)

## 90-Day Goal
- 2-3 concrete targets (e.g. "Increase runway 1.5 → 3 months")
- How to measure weekly progress

## Warnings (if applicable)
- If runway < 3mo or DTI > 40%, warn about debt spiral risk specifically
- Recommend urgent next step if needed

Rules:
- Always use real numbers from the Financial Snapshot, never invent
- Use Thai Baht (฿) format: ฿1,500 / ฿15K / ฿1.2M
- Don't recommend high-risk investments without warning
- Length: 600-1500 words, comprehensive but not bloated`;

export async function analyzeCashFlow(
  userQuestion: string,
  locale: string
): Promise<{ reply?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'not_authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('ai_provider, ai_api_key_encrypted, ai_privacy_mode')
    .eq('id', user.id)
    .single();

  if (!profile?.ai_provider || !profile?.ai_api_key_encrypted) {
    return { error: 'no_key_configured' };
  }

  let apiKey: string;
  try {
    apiKey = await decrypt(profile.ai_api_key_encrypted);
    if (!apiKey) return { error: 'decryption_failed' };
  } catch {
    return { error: 'decryption_failed' };
  }

  const [generalContext, cf] = await Promise.all([
    buildFinancialContext(profile.ai_privacy_mode ?? true),
    getCashFlowAnalysis(),
  ]);

  const cfContext = `\n\n## Cash Flow Detail\n` +
    `- Cash on hand: ฿${cf.totalCashOnHand.toLocaleString()}\n` +
    `- Months of runway: ${cf.monthsOfRunway.toFixed(1)}\n` +
    `- Status: ${cf.status} (${cf.statusReason})\n` +
    `- Last 30 days: income ฿${cf.last30.income.toLocaleString()} / expense ฿${cf.last30.expense.toLocaleString()} / net ${cf.last30.net >= 0 ? '+' : ''}฿${cf.last30.net.toLocaleString()}\n` +
    `- Last 60 days: income ฿${cf.last60.income.toLocaleString()} / expense ฿${cf.last60.expense.toLocaleString()} / net ${cf.last60.net >= 0 ? '+' : ''}฿${cf.last60.net.toLocaleString()}\n` +
    `- Last 90 days: income ฿${cf.last90.income.toLocaleString()} / expense ฿${cf.last90.expense.toLocaleString()} / net ${cf.last90.net >= 0 ? '+' : ''}฿${cf.last90.net.toLocaleString()}\n` +
    `- 90-day avg monthly: income ฿${cf.avgMonthlyIncome.toLocaleString()} / expense ฿${cf.avgMonthlyExpense.toLocaleString()} / net ${cf.avgMonthlyNet >= 0 ? '+' : ''}฿${cf.avgMonthlyNet.toLocaleString()}\n` +
    `- Avg daily: income ฿${cf.avgDailyIncome.toFixed(0)} / expense ฿${cf.avgDailyExpense.toFixed(0)}\n` +
    `- Upcoming 30d fixed expense (recurring + debt): ฿${cf.upcomingFixedExpense.toLocaleString()}\n` +
    `- Upcoming 30d fixed income: ฿${cf.upcomingFixedIncome.toLocaleString()}\n` +
    `- Projected next 30d net: ${cf.projectedNet30 >= 0 ? '+' : ''}฿${cf.projectedNet30.toLocaleString()}`;

  const systemPrompt =
    (locale === 'th' ? CASHFLOW_SYSTEM_PROMPT_TH : CASHFLOW_SYSTEM_PROMPT_EN) +
    '\n\n' + generalContext + cfContext +
    `\n\n---\nReply in ${locale === 'th' ? 'Thai' : 'English'}. Use markdown formatting (## for headings, - for bullets, ** for bold).`;

  try {
    const result = await aiChat(
      profile.ai_provider as AIProvider,
      apiKey,
      [{ role: 'user', content: userQuestion }],
      systemPrompt
    );
    return { reply: result.text };
  } catch (e: any) {
    console.error('analyzeCashFlow:', e);
    return { error: e?.message?.slice(0, 200) ?? 'ai_error' };
  }
}
