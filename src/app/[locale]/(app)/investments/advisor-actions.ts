'use server';

import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { generateInvestmentInsight } from '@/lib/ai/investment-advisor';
import { getPortfolioMetrics } from '@/lib/queries/portfolio';
import type { AIProvider } from '@/lib/ai/types';

export async function getInvestmentInsight(): Promise<{ ok: boolean; text?: string; error?: string }> {
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

  const metrics = await getPortfolioMetrics();
  if (metrics.holdings.length === 0) {
    return { ok: false, error: 'no_holdings' };
  }

  try {
    const text = await generateInvestmentInsight(profile.ai_provider as AIProvider, apiKey, metrics);
    return { ok: true, text };
  } catch (e: any) {
    const msg = e?.message ?? '';
    console.error('getInvestmentInsight error:', msg);
    if (msg.includes('401') || msg.includes('403')) return { ok: false, error: 'invalid_api_key' };
    if (msg.includes('429')) return { ok: false, error: 'rate_limited' };
    return { ok: false, error: 'ai_error' };
  }
}
