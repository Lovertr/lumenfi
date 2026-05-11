/**
 * AI Sales Assistant — for paid agents (Pro/Team).
 * Takes a lead + prospect's financial profile → returns:
 *   - Product recommendation
 *   - Pitch script (opening + value prop + ask)
 *   - Objection responses
 */

import { chat } from '@/lib/ai';
import type { ChatMessage } from '@/lib/ai/types';

export interface SalesContext {
  // Prospect financial profile
  age: number | null;
  monthlyIncome: number;
  monthlyExpense: number;
  totalDebt: number;
  numDependents: number;
  emergencyFund: number;
  existingPolicies: Array<{ type: string; sum_insured: number }>;
  // Gap analysis (from analyzeInsuranceGap)
  gaps: Array<{
    type: string;
    severity: string;
    gap: number;
    recommended: number;
    reasoning: string;
  }>;
  // Lead context
  leadType: string;
  leadMessage: string | null;
  preferredCarrier: string | null;
  estimatedSumInsured: number | null;
  // Agent context (for branding)
  agentCompany: string | null;
  agentName: string;
}

const SYSTEM_PROMPT = `คุณคือ AI ผู้ช่วยขายประกันที่เชี่ยวชาญตลาดไทย ทำงานให้ตัวแทนประกันชีวิตในระบบ Lumenfi

หน้าที่:
1. วิเคราะห์โปรไฟล์การเงินของลูกค้า → แนะนำผลิตภัณฑ์ที่เหมาะที่สุด
2. เขียน script ภาษาไทยสำหรับเปิดการขาย — น้ำเสียงเป็นกันเอง สุภาพ ไม่กดดัน
3. เตรียม objection handling 3 ข้อที่พบบ่อย: "แพง", "ขอคิดดูก่อน", "มีอยู่แล้ว"

กฎ:
- ไม่ระบุชื่อ product เฉพาะถ้าไม่รู้แน่ — ใช้ประเภท (เช่น "term life 20 ปี" แทน "FWD i-Term")
- ใช้ตัวเลขจากข้อมูลจริงของลูกค้า (DTI, gap, dependents) เป็น argument
- เน้น value > price
- ห้ามใส่ข้อมูลที่ไม่มีในข้อมูลที่ให้

Output format:
## 🎯 แนะนำผลิตภัณฑ์
[product type + sum insured ที่แนะนำ + reasoning 2-3 ประโยค]

## 💬 Script เปิดการขาย
[3 พารากราฟ: ทำความรู้จัก / value prop ที่ใช้ตัวเลข / ปิดการนัด]

## 🛡️ Objection Responses
**"แพงจัง / ไม่มีเงิน"** → [คำตอบ]
**"ขอคิดดูก่อน"** → [คำตอบ]
**"มีประกันอยู่แล้ว"** → [คำตอบ]

ใช้ Markdown แต่ห้ามใส่ code block`;

export async function generateSalesPitch(ctx: SalesContext): Promise<string> {
  const apiKey = process.env.LUMENFI_AI_KEY;
  if (!apiKey) throw new Error('LUMENFI_AI_KEY not configured');

  const profileSummary = `
ข้อมูลลูกค้า:
- อายุ: ${ctx.age ?? 'ไม่ระบุ'} ปี
- รายได้/เดือน: ฿${ctx.monthlyIncome.toLocaleString('th-TH')}
- รายจ่าย/เดือน: ฿${ctx.monthlyExpense.toLocaleString('th-TH')}
- หนี้คงเหลือ: ฿${ctx.totalDebt.toLocaleString('th-TH')}
- คนในอุปการะ: ${ctx.numDependents} คน
- เงินสำรอง: ฿${ctx.emergencyFund.toLocaleString('th-TH')}
- ประกันที่มี: ${
    ctx.existingPolicies.length > 0
      ? ctx.existingPolicies.map((p) => `${p.type} ฿${p.sum_insured.toLocaleString('th-TH')}`).join(', ')
      : 'ไม่มี'
  }

ช่องว่างความคุ้มครอง:
${ctx.gaps
  .filter((g) => g.severity !== 'covered')
  .map((g) => `- ${g.type} (${g.severity}): ขาด ฿${g.gap.toLocaleString('th-TH')} — ${g.reasoning}`)
  .join('\n') || '- ครบครันทุกด้านแล้ว'}

ที่ลูกค้าขอใบเสนอ:
- ประเภท: ${ctx.leadType}
- บริษัทที่สนใจ: ${ctx.preferredCarrier ?? 'ไม่ระบุ — เปิดทางเลือก'}
- ทุนที่ต้องการ: ${ctx.estimatedSumInsured ? '฿' + ctx.estimatedSumInsured.toLocaleString('th-TH') : 'ไม่ระบุ'}
- ข้อความ: ${ctx.leadMessage ?? '—'}

ตัวแทน:
- ชื่อ: ${ctx.agentName}
- บริษัท: ${ctx.agentCompany ?? '—'}
`.trim();

  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: `กรุณาวิเคราะห์ + เขียน script + objection handling สำหรับลูกค้าคนนี้:\n\n${profileSummary}`,
    },
  ];

  const res = await chat('gemini', apiKey, messages, SYSTEM_PROMPT);
  return res.text;
}
