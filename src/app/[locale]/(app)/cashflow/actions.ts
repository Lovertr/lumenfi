'use server';

import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { chat as aiChat } from '@/lib/ai';
import { buildFinancialContext } from '@/lib/ai/context';
import { getCashFlowAnalysis } from '@/lib/queries/cashflow';
import type { AIProvider } from '@/lib/ai';

const CASHFLOW_SYSTEM_PROMPT_TH = `คุณเป็นที่ปรึกษาด้าน Cash Flow ที่เก่งและตรงประเด็น
- วิเคราะห์ cash flow จากข้อมูลจริงของผู้ใช้ (ดู Financial Snapshot ด้านล่าง)
- ระบุปัญหาที่เห็น พร้อมตัวเลขเฉพาะเจาะจง (เช่น "เดือนนี้ขาดทุน ฿X เพราะ Y")
- แนะนำ action ที่ทำได้ทันที 3-5 ข้อ เรียงจากผลกระทบสูงสุด
- ถ้า runway < 3 เดือน เตือนความเสี่ยงและให้ priority แรกเป็นการเพิ่ม cash buffer
- ใช้ markdown bullets, ตัวเลขเป็นบาท (฿) format ให้อ่านง่าย
- ความยาว 200-400 คำ`;

const CASHFLOW_SYSTEM_PROMPT_EN = `You are a sharp Cash Flow advisor.
- Analyze cash flow from the user's real data (see Financial Snapshot below)
- Cite specific numbers (e.g. "you lost $X this month because Y")
- Give 3-5 immediate actions, ordered by impact
- If runway < 3 months, warn about risk and prioritize cash buffer
- Use markdown bullets, format numbers in THB (฿)
- Length: 200-400 words`;

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

  // Build cashflow-specific context
  const [generalContext, cf] = await Promise.all([
    buildFinancialContext(profile.ai_privacy_mode ?? true),
    getCashFlowAnalysis(),
  ]);

  const cfContext = `\n\n## Cash Flow Detail\n` +
    `- Cash on hand: ฿${cf.totalCashOnHand.toLocaleString()}\n` +
    `- Months of runway: ${cf.monthsOfRunway.toFixed(1)}\n` +
    `- Status: ${cf.status} (${cf.statusReason})\n` +
    `- Last 30 days: income ฿${cf.last30.income.toLocaleString()} / expense ฿${cf.last30.expense.toLocaleString()} / net ${cf.last30.net >= 0 ? '+' : ''}฿${cf.last30.net.toLocaleString()}\n` +
    `- 90-day avg monthly: income ฿${cf.avgMonthlyIncome.toLocaleString()} / expense ฿${cf.avgMonthlyExpense.toLocaleString()} / net ${cf.avgMonthlyNet >= 0 ? '+' : ''}฿${cf.avgMonthlyNet.toLocaleString()}\n` +
    `- Upcoming 30d fixed expense (recurring + debt): ฿${cf.upcomingFixedExpense.toLocaleString()}\n` +
    `- Projected next 30d net: ${cf.projectedNet30 >= 0 ? '+' : ''}฿${cf.projectedNet30.toLocaleString()}`;

  const systemPrompt =
    (locale === 'th' ? CASHFLOW_SYSTEM_PROMPT_TH : CASHFLOW_SYSTEM_PROMPT_EN) +
    '\n\n' + generalContext + cfContext +
    `\n\n---\nReply in ${locale === 'th' ? 'Thai' : 'English'}.`;

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
