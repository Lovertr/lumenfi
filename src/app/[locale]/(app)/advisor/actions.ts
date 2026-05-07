'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { buildAdvisorSnapshot } from '@/lib/advisor/context';
import { generateAdvisorReport } from '@/lib/advisor/generate';
import { ADVISOR_LABELS, type AdvisorDomain } from '@/lib/advisor/prompts';
import type { AIProvider } from '@/lib/ai/types';

export async function generateAndSaveReport(
  domain: AdvisorDomain,
  userQuestion?: string,
): Promise<{ ok: boolean; reportId?: string; error?: string }> {
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

  const snapshot = await buildAdvisorSnapshot();
  if (!snapshot) return { ok: false, error: 'no_snapshot' };

  let content: string;
  try {
    content = await generateAdvisorReport({
      provider: profile.ai_provider as AIProvider,
      apiKey,
      domain,
      snapshot,
      userQuestion,
    });
  } catch (e: any) {
    const msg = e?.message ?? '';
    console.error('generateAndSaveReport:', msg);
    if (msg.includes('401') || msg.includes('403')) return { ok: false, error: 'invalid_api_key' };
    if (msg.includes('429')) return { ok: false, error: 'rate_limited' };
    return { ok: false, error: 'ai_error' };
  }

  // Extract first H1/H2 for summary preview (first non-header paragraph)
  const lines = content.split('\n').filter((l) => l.trim());
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
      content,
      snapshot,
      provider: profile.ai_provider,
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
