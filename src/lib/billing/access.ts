// ─────────────────────────────────────────────────────────
// AI access checker — figures out whether user can call AI
// 3-tier model:
//  1. Pro subscription → unlimited Lumenfi AI
//  2. Pay-as-you-go credits (advisor only) → Lumenfi AI + deduct
//  3. BYO key → user's encrypted key (unlimited)
//  4. Free plan with limited Lumenfi AI quota (5 chat/day, 1 advisor/month)
// ─────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';
import type { AIProvider } from '@/lib/ai/types';

export type AIFeature = 'chat' | 'advisor' | 'secretary' | 'vision';

type Tier = 'free' | 'pro';

function getTierKey(tier: Tier): string {
  if (tier === 'free') {
    // Try free-tier specific key first, fall back to main key
    return process.env.LUMENFI_FREE_AI_KEY || process.env.LUMENFI_AI_KEY || '';
  }
  return process.env.LUMENFI_AI_KEY || '';
}

const KNOWN_PROVIDERS = new Set(['anthropic', 'openai', 'openrouter', 'gemini']);

function inferProviderFromKey(key: string | undefined): AIProvider | null {
  if (!key) return null;
  // Gemini keys: AIzaSy...
  if (/^AIza[\w-]{30,}/.test(key)) return 'gemini';
  // Anthropic keys: sk-ant-...
  if (key.startsWith('sk-ant-')) return 'anthropic';
  // OpenRouter keys: sk-or-...
  if (key.startsWith('sk-or-')) return 'openrouter';
  // OpenAI keys: sk-... (must be checked AFTER more specific patterns)
  if (key.startsWith('sk-')) return 'openai';
  return null;
}

function getTierProvider(tier: Tier): AIProvider {
  const envVar = tier === 'free'
    ? (process.env.LUMENFI_FREE_AI_PROVIDER || process.env.LUMENFI_AI_PROVIDER)
    : process.env.LUMENFI_AI_PROVIDER;

  // If env value is a known provider name, use it
  if (envVar && KNOWN_PROVIDERS.has(envVar)) {
    return envVar as AIProvider;
  }

  // Otherwise try to infer from the key shape (defensive — covers misconfigured envs)
  const inferred = inferProviderFromKey(getTierKey(tier));
  if (inferred) {
    if (envVar && envVar !== inferred) {
      console.warn(
        `[access] LUMENFI_AI_PROVIDER='${envVar.slice(0, 8)}...' is invalid; using inferred '${inferred}' from key shape`
      );
    }
    return inferred;
  }

  // Final fallback
  console.warn('[access] No valid provider configured — defaulting to anthropic');
  return 'anthropic';
}

function tierKeyConfigured(tier: Tier): boolean {
  const key = getTierKey(tier);
  return !!(key && key.length > 10);
}

function lumenfiKeyConfigured(): boolean {
  return tierKeyConfigured('pro') || tierKeyConfigured('free');
}
export type BillingVia = 'byo' | 'subscription' | 'credits' | 'free';

export interface AIAccess {
  allowed: boolean;
  via: BillingVia | null;
  reason?: string;
  provider?: AIProvider;
  apiKey?: string;
  quota?: {
    used: number;
    limit: number | null;
    remaining: number | null;
    period: 'day' | 'month';
  };
  upgradeUrl?: string;
}

// Free plan quotas (per user) — using Lumenfi key
const FREE_QUOTAS = {
  chat_per_day: 5,
  advisor_per_month: 1,
};

export const FEATURE_COST_USD: Record<AIFeature, number> = {
  chat: 0.005,
  advisor: 0.03,
  secretary: 0.002,
  vision: 0.01,
};

interface UserCtx {
  userId: string;
  hasBYOKey: boolean;
  byoProvider: AIProvider | null;
  subscription: {
    plan_code: string;
    status: string;
    current_period_end: string | null;
    has_lumenfi_ai: boolean;
    has_secretary: boolean;
    advisor_reports_per_month: number | null;
    ai_chat_per_day: number | null;
  } | null;
  creditBalance: number;
}

async function loadUserCtx(): Promise<UserCtx | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, subRes, creditsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('ai_provider, ai_api_key_encrypted')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('user_subscriptions')
      .select('plan_code, status, current_period_end, plan:subscription_plans(has_lumenfi_ai, has_secretary, advisor_reports_per_month, ai_chat_per_day)')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('ai_credits')
      .select('advisor_report_balance')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const sub = subRes.data as any;
  return {
    userId: user.id,
    hasBYOKey: !!(profileRes.data?.ai_provider && profileRes.data?.ai_api_key_encrypted),
    byoProvider: (profileRes.data?.ai_provider as AIProvider) ?? null,
    subscription: sub
      ? {
          plan_code: sub.plan_code,
          status: sub.status,
          current_period_end: sub.current_period_end,
          has_lumenfi_ai: sub.plan?.has_lumenfi_ai ?? false,
          has_secretary: sub.plan?.has_secretary ?? false,
          advisor_reports_per_month: sub.plan?.advisor_reports_per_month ?? null,
          ai_chat_per_day: sub.plan?.ai_chat_per_day ?? null,
        }
      : null,
    creditBalance: creditsRes.data?.advisor_report_balance ?? 0,
  };
}

function isProActive(sub: UserCtx['subscription']): boolean {
  if (!sub || sub.plan_code !== 'pro') return false;
  if (!['trial', 'active'].includes(sub.status)) return false;
  if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return false;
  return true;
}

async function countUsage(userId: string, feature: AIFeature, period: 'day' | 'month'): Promise<number> {
  const supabase = createClient();
  const since = period === 'day'
    ? new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { count } = await supabase
    .from('ai_usage_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('status', 'success')
    .gte('created_at', since);
  return count ?? 0;
}

export async function checkAIAccess(feature: AIFeature): Promise<AIAccess> {
  const ctx = await loadUserCtx();
  if (!ctx) return { allowed: false, via: null, reason: 'unauthorized' };

  // ─── Path 1: Active Pro subscription → unlimited Lumenfi AI
  if (isProActive(ctx.subscription)) {
    if (!tierKeyConfigured('pro')) {
      // Pro user but Lumenfi key not set — fall through to BYO if available
      if (ctx.hasBYOKey && ctx.byoProvider) {
        return { allowed: true, via: 'byo', provider: ctx.byoProvider };
      }
      return {
        allowed: false,
        via: null,
        reason: 'lumenfi_ai_not_configured',
        upgradeUrl: '/ai/settings',
      };
    }
    return {
      allowed: true,
      via: 'subscription',
      provider: getTierProvider('pro'),
      apiKey: getTierKey('pro'),
    };
  }

  // ─── Path 2: BYO key (works for ALL features, unlimited)
  if (ctx.hasBYOKey && ctx.byoProvider) {
    return { allowed: true, via: 'byo', provider: ctx.byoProvider };
  }

  // ─── Path 3: Pay-as-you-go credits (advisor only)
  if (feature === 'advisor' && ctx.creditBalance > 0 && tierKeyConfigured('pro')) {
    return {
      allowed: true,
      via: 'credits',
      provider: getTierProvider('pro'),
      apiKey: getTierKey('pro'),
      quota: { used: 0, limit: ctx.creditBalance, remaining: ctx.creditBalance, period: 'month' },
    };
  }

  // ─── Path 4: Free quota with Lumenfi AI (limited)

  // Secretary is Pro-only
  if (feature === 'secretary') {
    return {
      allowed: false,
      via: null,
      reason: 'secretary_pro_only',
      upgradeUrl: '/pricing',
    };
  }

  // Chat: 5 per day on Free
  if (feature === 'chat') {
    if (!tierKeyConfigured('free')) {
      return {
        allowed: false,
        via: null,
        reason: 'lumenfi_ai_not_configured',
        upgradeUrl: '/ai/settings',
      };
    }
    const usedToday = await countUsage(ctx.userId, 'chat', 'day');
    if (usedToday >= FREE_QUOTAS.chat_per_day) {
      return {
        allowed: false,
        via: null,
        reason: 'free_chat_quota_exceeded',
        quota: { used: usedToday, limit: FREE_QUOTAS.chat_per_day, remaining: 0, period: 'day' },
        upgradeUrl: '/pricing',
      };
    }
    return {
      allowed: true,
      via: 'free',
      provider: getTierProvider('free'),
      apiKey: getTierKey('free'),
      quota: {
        used: usedToday,
        limit: FREE_QUOTAS.chat_per_day,
        remaining: FREE_QUOTAS.chat_per_day - usedToday,
        period: 'day',
      },
    };
  }

  // Advisor: 1 per month on Free
  if (feature === 'advisor') {
    if (!tierKeyConfigured('free')) {
      return {
        allowed: false,
        via: null,
        reason: 'lumenfi_ai_not_configured',
        upgradeUrl: '/ai/settings',
      };
    }
    const usedThisMonth = await countUsage(ctx.userId, 'advisor', 'month');
    if (usedThisMonth >= FREE_QUOTAS.advisor_per_month) {
      return {
        allowed: false,
        via: null,
        reason: 'free_advisor_quota_exceeded',
        quota: { used: usedThisMonth, limit: FREE_QUOTAS.advisor_per_month, remaining: 0, period: 'month' },
        upgradeUrl: '/pricing',
      };
    }
    return {
      allowed: true,
      via: 'free',
      provider: getTierProvider('free'),
      apiKey: getTierKey('free'),
      quota: {
        used: usedThisMonth,
        limit: FREE_QUOTAS.advisor_per_month,
        remaining: FREE_QUOTAS.advisor_per_month - usedThisMonth,
        period: 'month',
      },
    };
  }

  // Vision (OCR scan) — Free with reasonable limit, BYO unlimited
  if (feature === 'vision') {
    if (!tierKeyConfigured('free')) {
      // OCR scan won't work without Lumenfi key
      if (ctx.hasBYOKey && ctx.byoProvider) {
        return { allowed: true, via: 'byo', provider: ctx.byoProvider };
      }
      return { allowed: false, via: null, reason: 'lumenfi_ai_not_configured', upgradeUrl: '/ai/settings' };
    }
    return {
      allowed: true,
      via: 'free',
      provider: getTierProvider('free'),
      apiKey: getTierKey('free'),
    };
  }

  return {
    allowed: false,
    via: null,
    reason: 'no_ai_access',
    upgradeUrl: '/pricing',
  };
}

export { FREE_QUOTAS };
