'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { ChevronDown, ExternalLink, Sparkles, Zap, Brain, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProviderInfo {
  id: 'anthropic' | 'openai' | 'gemini' | 'openrouter';
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  dashboardUrl: string;
  keyPrefix: string;
  pricing: { th: string; en: string };
  freeBadge?: { th: string; en: string };
  recommended?: boolean;
  steps: { th: string[]; en: string[] };
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    icon: Sparkles,
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    dashboardUrl: 'https://console.anthropic.com/settings/keys',
    keyPrefix: 'sk-ant-...',
    recommended: true,
    pricing: {
      th: 'Pay-as-you-go ~$3-15 ต่อ 1M tokens, มี $5 ฟรีตอนสมัคร',
      en: 'Pay-as-you-go ~$3-15 per 1M tokens, $5 free credit on signup',
    },
    steps: {
      th: [
        'ไปที่ console.anthropic.com แล้ว Sign up หรือ Sign in',
        'ไปที่เมนู "API Keys" ในแถบซ้าย (หรือคลิกลิงก์ด้านบน)',
        'กด "Create Key" → ตั้งชื่อ (เช่น "Lumenfi") → Create',
        'Copy key ที่เริ่มต้นด้วย sk-ant-... (จะเห็นครั้งเดียว!)',
        'กลับมาที่นี่ เลือก provider = Anthropic แล้ววาง key',
        'แนะนำ: เติมเครดิต $5-10 ที่ Settings → Billing เพื่อใช้ได้ต่อเนื่อง',
      ],
      en: [
        'Go to console.anthropic.com and Sign up / Sign in',
        'Open "API Keys" in the left sidebar (or click the link above)',
        'Click "Create Key" → name it (e.g. "Lumenfi") → Create',
        'Copy the key starting with sk-ant-... (shown only once!)',
        'Come back here, select provider = Anthropic, paste the key',
        'Tip: Add $5-10 credit at Settings → Billing for sustained use',
      ],
    },
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: Zap,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    dashboardUrl: 'https://aistudio.google.com/apikey',
    keyPrefix: 'AIza...',
    freeBadge: { th: 'ฟรี!', en: 'Free!' },
    pricing: {
      th: 'มี Free tier ใจดี — 15 requests/minute, 1M tokens/day',
      en: 'Generous free tier — 15 RPM, 1M tokens/day',
    },
    steps: {
      th: [
        'ไปที่ aistudio.google.com/apikey แล้ว Sign in ด้วย Google account',
        'กด "Create API Key" → เลือก project (ใช้ default ได้)',
        'Copy key ที่เริ่มต้นด้วย AIza...',
        'กลับมาที่นี่ เลือก provider = Google Gemini แล้ววาง key',
        'ใช้ฟรีได้เลยไม่ต้องผูกบัตร เหมาะสำหรับเริ่มต้น',
      ],
      en: [
        'Go to aistudio.google.com/apikey and sign in with Google',
        'Click "Create API Key" → choose project (default is fine)',
        'Copy the key starting with AIza...',
        'Come back here, select provider = Google Gemini, paste the key',
        'Free to use without a credit card — perfect for starters',
      ],
    },
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    icon: Brain,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    dashboardUrl: 'https://platform.openai.com/api-keys',
    keyPrefix: 'sk-...',
    pricing: {
      th: 'Pay-as-you-go ~$0.15-15 ต่อ 1M tokens (gpt-4o-mini ถูกที่สุด)',
      en: 'Pay-as-you-go ~$0.15-15 per 1M tokens (gpt-4o-mini cheapest)',
    },
    steps: {
      th: [
        'ไปที่ platform.openai.com/api-keys แล้ว Sign in',
        'ก่อนสร้าง key ให้เติมเครดิตก่อน — Settings → Billing → Add payment method',
        'กลับมา API Keys → "Create new secret key"',
        'ตั้งชื่อ → Create → Copy key (เริ่มด้วย sk-...)',
        'กลับมาที่นี่ เลือก provider = OpenAI แล้ววาง key',
        'หมายเหตุ: ตั้งแต่ 2024 ต้องเติมเครดิตก่อนใช้งาน API',
      ],
      en: [
        'Go to platform.openai.com/api-keys and sign in',
        'Before creating key, add credit — Settings → Billing → Add payment method',
        'Back to API Keys → "Create new secret key"',
        'Name it → Create → Copy key (starts with sk-...)',
        'Come back here, select provider = OpenAI, paste the key',
        'Note: Since 2024, prepaid credit is required before API use',
      ],
    },
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    icon: Globe,
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    dashboardUrl: 'https://openrouter.ai/settings/keys',
    keyPrefix: 'sk-or-...',
    pricing: {
      th: '1 key ใช้ได้หลาย model (Claude, GPT, Gemini, Llama, ฯลฯ) ราคาตาม model',
      en: '1 key for multiple models (Claude, GPT, Gemini, Llama, etc.), price varies',
    },
    steps: {
      th: [
        'ไปที่ openrouter.ai แล้ว Sign up (ใช้ Google ได้)',
        'ไปที่ Settings → Keys → "Create Key"',
        'ตั้งชื่อ + ตั้ง credit limit (optional) → Create',
        'Copy key ที่เริ่มต้นด้วย sk-or-...',
        'กลับมาที่นี่ เลือก provider = OpenRouter แล้ววาง key',
        'แนะนำ: เติม $5-10 เพื่อใช้ได้หลาย model เปรียบเทียบกัน',
      ],
      en: [
        'Go to openrouter.ai and sign up (Google login works)',
        'Open Settings → Keys → "Create Key"',
        'Name it + set optional credit limit → Create',
        'Copy the key starting with sk-or-...',
        'Come back here, select provider = OpenRouter, paste the key',
        'Tip: Add $5-10 to try multiple models and compare',
      ],
    },
  },
];

export function ProviderSetupGuide() {
  const locale = useLocale();
  const isTh = locale === 'th';
  const [openId, setOpenId] = useState<string | null>('anthropic');

  return (
    <div className="space-y-2">
      <div className="px-1">
        <h2 className="text-sm font-semibold">
          {isTh ? 'วิธีขอ API Key แต่ละ provider' : 'How to get an API key'}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isTh ? 'คลิกที่ provider ที่สนใจเพื่อดูขั้นตอน' : 'Click a provider to see steps'}
        </p>
      </div>

      {PROVIDERS.map((p) => {
        const Icon = p.icon;
        const isOpen = openId === p.id;
        const steps = isTh ? p.steps.th : p.steps.en;
        const pricing = isTh ? p.pricing.th : p.pricing.en;
        const freeBadge = p.freeBadge ? (isTh ? p.freeBadge.th : p.freeBadge.en) : null;

        return (
          <div key={p.id} className="rounded-xl border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : p.id)}
              className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/40"
            >
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', p.bg, p.color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{p.name}</p>
                  {freeBadge && (
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                      {freeBadge}
                    </span>
                  )}
                  {p.recommended && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {isTh ? 'แนะนำ' : 'Recommended'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{pricing}</p>
              </div>
              <ChevronDown
                className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', isOpen && 'rotate-180')}
              />
            </button>

            {isOpen && (
              <div className="border-t bg-muted/30 px-4 py-4 space-y-3">
                <a
                  href={p.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-xs font-medium text-background hover:opacity-90"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {isTh ? 'เปิดหน้า dashboard' : 'Open dashboard'}
                </a>

                <ol className="space-y-2">
                  {steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>

                <div className="rounded-lg bg-background border px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">
                    {isTh ? 'Key จะมีรูปแบบ:' : 'Key format:'}
                  </p>
                  <code className="font-mono text-xs">{p.keyPrefix}</code>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
