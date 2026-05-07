// ─────────────────────────────────────────────────────────
// AI Gateway — single chokepoint for all AI calls in Lumenfi
// Handles: access check → key resolution → call → usage log → credit deduct
// ─────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import { chat } from '@/lib/ai';
import type { AIProvider, ChatMessage } from '@/lib/ai/types';
import { checkAIAccess, FEATURE_COST_USD, type AIFeature, type AIAccess } from './access';

export class PaywallError extends Error {
  constructor(
    public readonly code: string,
    public readonly upgradeUrl: string,
    public readonly access: AIAccess,
  ) {
    super(`Paywall: ${code}`);
  }
}

export interface GatewayOptions {
  feature: AIFeature;
  domain?: string;
  systemPrompt: string;
  messages: ChatMessage[];
}

export interface GatewayResult {
  text: string;
  via: string;
  provider: AIProvider;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Make an AI call with billing enforcement + usage logging.
 * Throws PaywallError if user has no quota / no access.
 */
export async function callAIViaGateway(opts: GatewayOptions): Promise<GatewayResult> {
  const access = await checkAIAccess(opts.feature);

  if (!access.allowed) {
    throw new PaywallError(access.reason ?? 'unknown', access.upgradeUrl ?? '/pricing', access);
  }

  // Resolve API key
  let apiKey = access.apiKey;
  if (access.via === 'byo') {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('unauthorized');
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_api_key_encrypted')
      .eq('id', user.id)
      .single();
    if (!profile?.ai_api_key_encrypted) {
      throw new PaywallError('no_byo_key', '/ai/settings', access);
    }
    apiKey = await decrypt(profile.ai_api_key_encrypted);
  }

  if (!apiKey) {
    throw new PaywallError('no_api_key', '/pricing', access);
  }

  const provider = access.provider ?? 'anthropic';

  // Make the actual AI call
  let result;
  let status: 'success' | 'error' = 'success';
  let errorCode: string | null = null;
  try {
    result = await chat(provider, apiKey, opts.messages, opts.systemPrompt);
  } catch (e: any) {
    status = 'error';
    errorCode = e?.message?.slice(0, 100) ?? 'ai_error';
    // Log the failure too
    await logUsage(opts.feature, opts.domain, provider, access.via!, 0, 0, status, errorCode);
    throw e;
  }

  // Log success
  await logUsage(
    opts.feature,
    opts.domain,
    provider,
    access.via!,
    result.usage?.inputTokens ?? 0,
    result.usage?.outputTokens ?? 0,
    'success',
    null,
  );

  // Deduct credit if pay-as-you-go
  if (access.via === 'credits' && opts.feature === 'advisor') {
    await deductCredit(1);
  }

  return {
    text: result.text,
    via: access.via!,
    provider,
    inputTokens: result.usage?.inputTokens,
    outputTokens: result.usage?.outputTokens,
  };
}

async function logUsage(
  feature: AIFeature,
  domain: string | undefined,
  provider: AIProvider,
  via: string,
  inputTokens: number,
  outputTokens: number,
  status: string,
  errorCode: string | null,
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Use service client to bypass RLS (insert-only via gateway)
    const admin = createServiceClient();
    await admin.from('ai_usage_log').insert({
      user_id: user.id,
      feature,
      domain: domain ?? null,
      provider,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: FEATURE_COST_USD[feature] ?? 0,
      via,
      status,
      error_code: errorCode,
    });
  } catch (e) {
    console.warn('logUsage failed:', e);
  }
}

async function deductCredit(amount: number) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const admin = createServiceClient();
    const { data: cur } = await admin
      .from('ai_credits')
      .select('advisor_report_balance, total_used')
      .eq('user_id', user.id)
      .maybeSingle();

    if (cur) {
      await admin
        .from('ai_credits')
        .update({
          advisor_report_balance: Math.max(0, (cur.advisor_report_balance ?? 0) - amount),
          total_used: (cur.total_used ?? 0) + amount,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    }
  } catch (e) {
    console.warn('deductCredit failed:', e);
  }
}

/**
 * Get user's current usage for display in UI
 */
export async function getCurrentQuotaUsage(): Promise<{
  chatToday: number;
  advisorThisMonth: number;
  creditBalance: number;
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { chatToday: 0, advisorThisMonth: 0, creditBalance: 0 };

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [chatRes, advisorRes, creditRes] = await Promise.all([
    supabase
      .from('ai_usage_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('feature', 'chat')
      .eq('status', 'success')
      .gte('created_at', todayStart),
    supabase
      .from('ai_usage_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('feature', 'advisor')
      .eq('status', 'success')
      .gte('created_at', monthStart),
    supabase
      .from('ai_credits')
      .select('advisor_report_balance')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  return {
    chatToday: chatRes.count ?? 0,
    advisorThisMonth: advisorRes.count ?? 0,
    creditBalance: creditRes.data?.advisor_report_balance ?? 0,
  };
}
