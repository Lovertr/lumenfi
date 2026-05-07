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
    // Sanity check — if AI returned no useful data at all, treat as failure
    if (parsed.total == null && !parsed.merchant && !parsed.date && !parsed.note) {
      console.warn('scanReceipt: AI returned empty result');
      return { ok: false, error: 'ai_no_data' };
    }
    return { ok: true, ...parsed };
  } catch (e: any) {
    const msg = e?.message ?? '';
    console.error('scanReceipt error:', msg);
    if (msg.includes('401') || msg.includes('403') || msg.toLowerCase().includes('invalid')) {
      return { ok: false, error: 'invalid_api_key' };
    }
    if (msg.includes('429')) {
      return { ok: false, error: 'rate_limited' };
    }
    if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
      return { ok: false, error: 'ai_provider_down' };
    }
    if (msg.toLowerCase().includes('json')) {
      return { ok: false, error: 'ai_bad_response' };
    }
    return { ok: false, error: 'ai_error' };
  }
}
