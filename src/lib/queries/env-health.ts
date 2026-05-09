// ─────────────────────────────────────────────────────────
// Env health check — detect missing or misconfigured env vars
// Used in /settings/admin to alert admin when something's missing
// ─────────────────────────────────────────────────────────

export interface EnvCheck {
  key: string;
  required: boolean;
  set: boolean;
  description: string;
  category: 'core' | 'ai' | 'payment' | 'push' | 'optional';
  setupHint?: string;
}

export function checkEnvVars(): EnvCheck[] {
  const env = process.env;

  const checks: EnvCheck[] = [
    // Core (Supabase)
    {
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      required: true,
      set: !!env.NEXT_PUBLIC_SUPABASE_URL,
      description: 'Supabase project URL',
      category: 'core',
    },
    {
      key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      required: true,
      set: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      description: 'Supabase public (anon) key',
      category: 'core',
    },
    {
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      required: true,
      set: !!env.SUPABASE_SERVICE_ROLE_KEY,
      description: 'Supabase service role key (cron + admin queries)',
      category: 'core',
    },
    {
      key: 'CRON_SECRET',
      required: true,
      set: !!env.CRON_SECRET,
      description: 'Vercel cron auth secret (generate: openssl rand -hex 32)',
      category: 'core',
    },

    // AI (Lumenfi key for Free + Pro users)
    {
      key: 'LUMENFI_AI_KEY',
      required: false,
      set: !!(env.LUMENFI_AI_KEY && env.LUMENFI_AI_KEY.length > 10),
      description: 'AI key for Free quota + Pay-go + Pro users',
      category: 'ai',
      setupHint:
        'Required for Free quota (5 chat/วัน + 1 advisor/เดือน), Pay-go credits, and Pro subscription. Without this, only BYO key users can use AI.',
    },
    {
      key: 'LUMENFI_AI_PROVIDER',
      required: false,
      set: !!env.LUMENFI_AI_PROVIDER,
      description: 'AI provider name (anthropic/openai/gemini/openrouter)',
      category: 'ai',
      setupHint: 'Default: anthropic. Match your LUMENFI_AI_KEY provider.',
    },

    // Payment (Omise)
    {
      key: 'OMISE_PUBLIC_KEY',
      required: false,
      set: !!env.OMISE_PUBLIC_KEY,
      description: 'Omise publishable key (for tokenization)',
      category: 'payment',
    },
    {
      key: 'NEXT_PUBLIC_OMISE_PUBLIC_KEY',
      required: false,
      set: !!env.NEXT_PUBLIC_OMISE_PUBLIC_KEY,
      description: 'Public-side Omise key (for client Omise.js)',
      category: 'payment',
      setupHint: 'Same value as OMISE_PUBLIC_KEY but exposed to browser',
    },
    {
      key: 'OMISE_SECRET_KEY',
      required: false,
      set: !!env.OMISE_SECRET_KEY,
      description: 'Omise secret key (for server charges)',
      category: 'payment',
    },
    {
      key: 'OMISE_WEBHOOK_SECRET',
      required: false,
      set: !!env.OMISE_WEBHOOK_SECRET,
      description: 'Verify Omise webhook signatures',
      category: 'payment',
      setupHint: 'Set in Omise Dashboard → Webhooks',
    },

    // Push notifications (web-push)
    {
      key: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
      required: false,
      set: !!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      description: 'VAPID public key for web push',
      category: 'push',
    },
    {
      key: 'VAPID_PRIVATE_KEY',
      required: false,
      set: !!env.VAPID_PRIVATE_KEY,
      description: 'VAPID private key',
      category: 'push',
    },
    {
      key: 'VAPID_SUBJECT',
      required: false,
      set: !!env.VAPID_SUBJECT,
      description: 'VAPID subject (mailto:admin@your-domain.com)',
      category: 'push',
    },

    // Optional
    {
      key: 'RESEND_API_KEY',
      required: false,
      set: !!env.RESEND_API_KEY,
      description: 'Email service (insurance lead notifications)',
      category: 'optional',
    },
    {
      key: 'NEXT_PUBLIC_APP_URL',
      required: false,
      set: !!env.NEXT_PUBLIC_APP_URL,
      description: 'Production URL (for redirect URIs)',
      category: 'optional',
      setupHint: 'e.g. https://lumenfi.projectostech.com',
    },
  ];

  return checks;
}

export function envHealthScore(checks: EnvCheck[]): number {
  const required = checks.filter((c) => c.required);
  const setRequired = required.filter((c) => c.set);
  const optional = checks.filter((c) => !c.required);
  const setOptional = optional.filter((c) => c.set);

  // 70% from required, 30% from optional
  const reqScore = required.length > 0 ? (setRequired.length / required.length) * 70 : 70;
  const optScore = optional.length > 0 ? (setOptional.length / optional.length) * 30 : 30;
  return Math.round(reqScore + optScore);
}
