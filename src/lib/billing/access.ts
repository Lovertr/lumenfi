// ─────────────────────────────────────────────────────────
// AI access checker — figures out whether user can call AI,
// and via what billing path (subscription / credits / BYO key)
// ─────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';
import type { AIProvider } from '@/lib/ai/types';

export type AIFeature = 'chat' | 'advisor' | 'secretary' | 'vision';
export type BillingVia = 'byo' | 'subscription' | 'credits' | 'free';

export interface AIAccess {
  allowed: boolean;
  via: BillingVia | null;
  reason?: string;
  // What model + provider to use
  provider?: AIProvider;
  apiKey?: string;
  // For UI — current quota state
  quota?: {
    used: number;
    limit: number | null; // null = unlimited
    remaining: number | null;
    period: 'day' | 'month';
  };
  // Available actions to fix (no-quota / no-key states)
  upgradeUrl?: string;
}

// Cost estimates per feature (USD per call) — used for analytics
export const FEATURE_COST_USD: Record<AIFeature, number> = {
  chat: 0.005,      // ~30 chat × $0.005 = $0.15/mo
  advisor: 0.03,    // longer context + output
  secretary: 0.002, // short summary
  vision: 0.01,    // image processing
};

interface UserCtx {
  userId: string;
  hasBYOKey: boolean;
  byoProvider: AIProvider | null;
  byoApiKeyEncrypted: string | null;
  subscription: {
    plan_code: string;
    status: string;
    current_period_end: string | null;
    has_lumenfi_ai: boolean;
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
      .select('plan_code, status, current_period_end, plan:subscription_plans(has_lumenfi_ai, advisor_reports_per_month, ai_chat_per_day)')
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
    byoApiKeyEncrypted: profileRes.data?.ai_api_key_encrypted ?? null,
    subscription: sub
      ? {
          plan_code: sub.plan_code,
          status: sub.status,
          current_period_end: sub.current_period_end,
          has_lumenfi_ai: sub.plan?.has_lumenfi_ai ?? false,
          advisor_reports_per_month: sub.plan?.advisor_reports_per_month ?? null,
          ai_chat_per_day: sub.plan?.ai_chat_per_day ?? null,
        }
      : null,
    creditBalance: creditsRes.data?.advisor_report_balance ?? 0,
  };
}

function isSubscriptionActive(sub: UserCtx['subscription']): boolean {
  if (!sub) return false;
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

/**
 * Determine if user can call AI for a given feature.
 * Order of preference:
 * 1. Active subscription with Lumenfi AI → use Lumenfi key
 * 2. Pay-as-you-go credits (advisor only) → use Lumenfi key, deduct credit
 * 3. BYO key → use user's encrypted key
 * 4. Free trial counter (limited use)
 * 5. Block + show paywall
 */
export async function checkAIAccess(feature: AIFeature): Promise<AIAccess> {
  const ctx = await loadUserCtx();
  if (!ctx) return { allowed: false, via: null, reason: 'unauthorized' };

  // ─── Path 1: Active subscription with Lumenfi AI
  if (isSubscriptionActive(ctx.subscription) && ctx.subscription?.has_lumenfi_ai) {
    const sub = ctx.subscription!;

    // Check chat daily limit
    if (feature === 'chat' && sub.ai_chat_per_day !== null) {
      const usedToday = await countUsage(ctx.userId, 'chat', 'day');
      if (usedToday >= sub.ai_chat_per_day) {
        return {
          allowed: false,
          via: 'subscription',
          reason: 'daily_limit_exceeded',
          quota: { used: usedToday, limit: sub.ai_chat_per_day, remaining: 0, period: 'day' },
        };
      }
    }

    // Check advisor monthly limit
    if (feature === 'advisor' && sub.advisor_reports_per_month !== null) {
      const usedThisMonth = await countUsage(ctx.userId, 'advisor', 'month');
      if (usedThisMonth >= sub.advisor_reports_per_month) {
        return {
          allowed: false,
          via: 'subscription',
          reason: 'monthly_limit_exceeded',
          quota: {
            used: usedThisMonth,
            limit: sub.advisor_reports_per_month,
            remaining: 0,
            period: 'month',
          },
        };
      }
    }

    return {
      allowed: true,
      via: 'subscription',
      provider: getLumenfiProvider(),
      apiKey: getLumenfiKey(),
      quota: feature === 'advisor' && sub.advisor_reports_per_month !== null
        ? {
            used: await countUsage(ctx.userId, 'advisor', 'month'),
            limit: sub.advisor_reports_per_month,
            remaining: sub.advisor_reports_per_month - await countUsage(ctx.userId, 'advisor', 'month'),
            period: 'month',
          }
        : undefined,
    };
  }

  // ─── Path 2: Pay-as-you-go credits (advisor only)
  if (feature === 'advisor' && ctx.creditBalance > 0) {
    return {
      allowed: true,
      via: 'credits',
      provider: getLumenfiProvider(),
      apiKey: getLumenfiKey(),
      quota: { used: 0, limit: ctx.creditBalance, remaining: ctx.creditBalance, period: 'month' },
    };
  }

  // ─── Path 3: BYO key
  if (ctx.hasBYOKey && ctx.byoProvider && ctx.byoApiKeyEncrypted) {
    return {
      allowed: true,
      via: 'byo',
      provider: ctx.byoProvider,
      // Decrypt happens at call site
    };
  }

  // ─── Path 4 / 5: blocked, no access
  return {
    allowed: false,
    via: null,
    reason: feature === 'advisor' ? 'no_advisor_quota' : 'no_ai_access',
    upgradeUrl: '/pricing',
  };
}

function getLumenfiKey(): string {
  return process.env.LUMENFI_AI_KEY ?? '';
}

function getLumenfiProvider(): AIProvider {
  return (process.env.LUMENFI_AI_PROVIDER as AIProvider) ?? 'anthropic';
}
