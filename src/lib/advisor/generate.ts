// ─────────────────────────────────────────────────────────
// Generate advisor reports — calls the AI with the right prompt + context
// ─────────────────────────────────────────────────────────

import { generateAIResponse } from '@/lib/ai/chat';
import type { AIProvider } from '@/lib/ai/types';
import { ADVISOR_PROMPTS, type AdvisorDomain } from './prompts';
import { snapshotToMarkdown, type AdvisorSnapshot } from './context';

export interface GenerateOptions {
  provider: AIProvider;
  apiKey: string;
  domain: AdvisorDomain;
  snapshot: AdvisorSnapshot;
  /**
   * Optional follow-up question or user-specific concern
   * (e.g., "ฉันอายุ 45 อยากเกษียณ 55")
   */
  userQuestion?: string;
}

export async function generateAdvisorReport(opts: GenerateOptions): Promise<string> {
  const { provider, apiKey, domain, snapshot, userQuestion } = opts;
  const systemPrompt = ADVISOR_PROMPTS[domain];

  const contextMarkdown = snapshotToMarkdown(snapshot);
  const userMessage = [
    `นี่คือสถานะการเงินของฉัน:\n\n${contextMarkdown}`,
    userQuestion ? `\n\nคำถาม/ข้อกังวลเพิ่มเติม: ${userQuestion}` : '',
    '\n\nกรุณาวิเคราะห์ตามรูปแบบที่กำหนดในระบบ',
  ].join('');

  return await generateAIResponse(
    provider,
    apiKey,
    systemPrompt,
    [{ role: 'user', content: userMessage }],
    { maxTokens: 2500 }
  );
}

// Generate a short executive summary (for notifications, dashboard preview)
const SUMMARY_SYSTEM = `คุณเป็นเลขาทางการเงิน ทำหน้าที่สรุปสถานะให้สั้นที่สุด
- ตอบเป็นภาษาไทย ไม่เกิน 2 ประโยค รวมไม่เกิน 30 คำ
- เน้นประเด็นที่ผู้ใช้ควรรู้ที่สุดก่อน
- ห้าม Markdown, ห้าม bullet, แค่ประโยคธรรมดา
- ถ้ามีเรื่องเร่งด่วน เริ่มด้วย "🚨" หรือ "⚠️"
- ถ้าทุกอย่างดี เริ่มด้วย "✅"`;

export async function generateExecutiveSummary(
  provider: AIProvider,
  apiKey: string,
  snapshot: AdvisorSnapshot,
): Promise<string> {
  const contextMarkdown = snapshotToMarkdown(snapshot);
  return await generateAIResponse(
    provider,
    apiKey,
    SUMMARY_SYSTEM,
    [{ role: 'user', content: `สถานะการเงิน:\n${contextMarkdown}\n\nสรุปให้ภายใน 2 ประโยค 30 คำ` }],
    { maxTokens: 200 }
  );
}
