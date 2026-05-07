// ─────────────────────────────────────────────────────────
// AI Investment Advisor — สรุป + แนะนำการลงทุน (BYO key)
// ─────────────────────────────────────────────────────────

import { generateAIResponse } from './chat';
import type { AIProvider } from './types';
import type { PortfolioMetrics } from '@/lib/queries/portfolio';

const SYSTEM_PROMPT = `คุณเป็นที่ปรึกษาการลงทุนของคนไทย พูดเป็นภาษาไทยล้วน อ่านง่าย ใช้ tone เป็นกันเองแต่ดูน่าเชื่อถือ
หน้าที่: วิเคราะห์ portfolio ของผู้ใช้แล้วให้ insight ที่นำไปใช้จริงได้

หลักการ:
1. ตรงประเด็น ไม่อ้อมค้อม
2. ใช้ข้อมูลจริงที่ได้รับ — ห้ามแต่งตัวเลข
3. แนะนำเฉพาะที่เหมาะกับขนาด portfolio และความหลากหลายของผู้ใช้
4. **ห้ามให้คำแนะนำที่เจาะจงหุ้น/กองทุน** เพราะคุณไม่รู้ความเสี่ยงรับได้ของผู้ใช้ — ให้เฉพาะหลักการกระจายความเสี่ยง
5. **เตือนเสมอ** ว่าเป็นการวิเคราะห์เบื้องต้น ไม่ใช่คำแนะนำการลงทุน

โครงสร้างคำตอบ (ใช้ Markdown):
## สรุป Portfolio
[2-3 ประโยค]

## จุดแข็ง
- [bullet 2-3 ข้อ]

## จุดที่ควรพิจารณา
- [bullet 2-3 ข้อ — เช่น กระจุกตัวเกิน, ขาด FX hedge, ฯลฯ]

## ข้อเสนอแนะ
- [3-5 ข้อ ปฏิบัติได้จริง]

## ⚠️ Disclaimer
[1 ประโยคสั้น — เตือนว่าไม่ใช่คำแนะนำการลงทุน]`;

export async function generateInvestmentInsight(
  provider: AIProvider,
  apiKey: string,
  metrics: PortfolioMetrics,
): Promise<string> {
  // Build a concise prompt with the relevant data
  const summary = {
    totalValueTHB: metrics.totalValue,
    totalCostTHB: metrics.totalCost,
    totalPL_THB: metrics.totalPL,
    totalPL_Percent: Number(metrics.totalPLPercent.toFixed(2)),
    holdingsCount: metrics.holdings.length,
    valueByType: Object.fromEntries(
      Object.entries(metrics.valueByType).map(([k, v]) => [k, Math.round(v)])
    ),
    valueByCurrency: Object.fromEntries(
      Object.entries(metrics.valueByCurrency).map(([k, v]) => [k, Math.round(v)])
    ),
    valueByMarket: Object.fromEntries(
      Object.entries(metrics.valueByMarket).map(([k, v]) => [k, Math.round(v)])
    ),
    topHoldings: metrics.holdings
      .slice(0, 8)
      .map((h) => ({
        symbol: h.symbol ?? h.name,
        type: h.type,
        currency: h.currency,
        valueTHB: Math.round(h.valueTHB),
        plPercent: Number(h.plPercent.toFixed(1)),
      })),
  };

  const userMessage = `วิเคราะห์ portfolio นี้:\n\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\`\n\nให้คำแนะนำตามรูปแบบที่กำหนด`;

  return await generateAIResponse(
    provider,
    apiKey,
    SYSTEM_PROMPT,
    [{ role: 'user', content: userMessage }],
    { maxTokens: 1500 }
  );
}
