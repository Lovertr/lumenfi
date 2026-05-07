'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { buildAdvisorSnapshot, snapshotToMarkdown } from '@/lib/advisor/context';
import { ADVISOR_PROMPTS, ADVISOR_LABELS, type AdvisorDomain } from '@/lib/advisor/prompts';
import { callAIViaGateway, PaywallError } from '@/lib/billing/gateway';

export async function generateAndSaveReport(
  domain: AdvisorDomain,
  userQuestion?: string,
): Promise<{ ok: boolean; reportId?: string; error?: string; upgradeUrl?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  const snapshot = await buildAdvisorSnapshot();
  if (!snapshot) return { ok: false, error: 'no_snapshot' };

  const systemPrompt = ADVISOR_PROMPTS[domain];
  const contextMarkdown = snapshotToMarkdown(snapshot);
  const userMessage = [
    `นี่คือสถานะการเงินของฉัน:\n\n${contextMarkdown}`,
    userQuestion ? `\n\nคำถาม/ข้อกังวลเพิ่มเติม: ${userQuestion}` : '',
    '\n\nกรุณาวิเคราะห์ตามรูปแบบที่กำหนดในระบบ',
  ].join('');

  let result;
  try {
    result = await callAIViaGateway({
      feature: 'advisor',
      domain,
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
  } catch (e: any) {
    if (e instanceof PaywallError) {
      return {
        ok: false,
        error: e.code,
        upgradeUrl: e.upgradeUrl,
      };
    }
    const msg = e?.message ?? '';
    console.error('generateAndSaveReport:', msg);
    if (msg.includes('401') || msg.includes('403')) return { ok: false, error: 'invalid_api_key' };
    if (msg.includes('429')) return { ok: false, error: 'rate_limited' };
    return { ok: false, error: 'ai_error' };
  }

  // Extract summary
  const lines = result.text.split('\n').filter((l) => l.trim());
  let summary: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('#') || l.startsWith('-')) continue;
    summary = l.slice(0, 200);
    break;
  }

  const title = ADVISOR_LABELS[domain].title;

  const { data: inserted, error } = await supabase
    .from('advisor_reports')
    .insert({
      user_id: user.id,
      domain,
      title,
      summary,
      content: result.text,
      snapshot,
      provider: result.provider,
      input_tokens: result.inputTokens ?? null,
      output_tokens: result.outputTokens ?? null,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('save advisor report:', error);
    return { ok: false, error: 'save_failed' };
  }

  revalidatePath('/advisor');
  return { ok: true, reportId: inserted?.id };
}

export async function deleteAdvisorReport(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = formData.get('id') as string;
  if (!id) return;

  await supabase.from('advisor_reports').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/advisor');
}
