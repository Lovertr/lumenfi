'use server';

import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import type { AIProvider } from '@/lib/ai/types';
import { generateAIResponse } from '@/lib/ai/chat';

interface HelpResponse {
  answer?: string;
  error?: string;
}

export async function askHelpAssistant(question: string): Promise<HelpResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  // Get user's AI key
  const { data: profile } = await supabase
    .from('profiles')
    .select('ai_provider, ai_api_key_encrypted')
    .eq('id', user.id)
    .maybeSingle();

  // Get help articles as context
  const { data: articles } = await supabase
    .from('help_articles')
    .select('title, body')
    .eq('locale', 'th')
    .order('sort_order');

  const articleContext = (articles ?? [])
    .map((a) => `## ${a.title}\n${a.body}`)
    .join('\n\n---\n\n');

  // If no AI key, do keyword search fallback
  if (!profile?.ai_provider || !profile?.ai_api_key_encrypted) {
    const kw = question.toLowerCase();
    const matches = (articles ?? [])
      .filter((a) => a.title.toLowerCase().includes(kw) || a.body.toLowerCase().includes(kw))
      .slice(0, 3);
    if (matches.length === 0) {
      return { error: 'no_ai_key' };
    }
    const out = matches.map((m) => `**${m.title}**\n${m.body.split('\n').slice(0, 5).join('\n')}...`).join('\n\n');
    return { answer: out + '\n\n_(ตั้ง AI API Key ที่ /ai/settings เพื่อให้ AI ตอบเองได้แม่นยำขึ้น)_' };
  }

  let apiKey: string;
  try {
    apiKey = await decrypt(profile.ai_api_key_encrypted);
  } catch {
    return { error: 'decryption_failed' };
  }

  const systemPrompt = `คุณเป็นผู้ช่วยตอบคำถามของแอป Lumenfi (แอปการเงินส่วนตัว) ตอบสั้น ๆ กระชับ เป็นภาษาไทย ใช้ข้อมูลจากคู่มือด้านล่าง ถ้าคำถามนอกเหนือจากคู่มือ บอกตรงๆว่าไม่ทราบและแนะนำให้ติดต่อ tintanee.t@gmail.com

# คู่มือ Lumenfi

${articleContext}`;

  try {
    const answer = await generateAIResponse(
      profile.ai_provider as AIProvider,
      apiKey,
      systemPrompt,
      [{ role: 'user', content: question }],
      { maxTokens: 1024 }
    );
    return { answer };
  } catch (e: any) {
    console.error('[help-assistant]', e);
    return { error: 'ai_failed' };
  }
}
