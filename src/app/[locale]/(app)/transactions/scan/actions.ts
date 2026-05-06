'use server';

import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { visionParseReceipt } from '@/lib/ai/vision';
import type { AIProvider } from '@/lib/ai/types';

export interface ScanResult {
  ok: boolean;
  error?: string;
  merchant?: string | null;
  date?: string | null;
  total?: number | null;
  type?: 'income' | 'expense';
  category?: string | null;
  note?: string | null;
  account_number?: string | null;
}

export async function scanReceipt(formData: FormData): Promise<ScanResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  const file = formData.get('image') as File | null;
  if (!file || file.size === 0) return { ok: false, error: 'no_image' };
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: 'image_too_large' };

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

  const buf = Buffer.from(await file.arrayBuffer());
  const b64 = buf.toString('base64');
  const mime = file.type || 'image/jpeg';

  try {
    const parsed = await visionParseReceipt(profile.ai_provider as AIProvider, apiKey, b64, mime);
    return { ok: true, ...parsed };
  } catch (e: any) {
    console.error('scanReceipt error:', e?.message);
    return { ok: false, error: 'ai_error' };
  }
}
