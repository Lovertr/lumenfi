'use client';

import { useState, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { Brain, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { analyzeCashFlow } from '@/app/[locale]/(app)/cashflow/actions';
import { cn } from '@/lib/utils';

const PROMPTS = [
  { th: 'วิเคราะห์ Cash Flow ของฉันเดือนนี้', en: 'Analyze my cash flow this month' },
  { th: 'ทำไมเดือนนี้เงินสดตึงตัว', en: 'Why is cash tight this month?' },
  { th: 'แนะนำวิธีปรับปรุง Cash Flow ของฉัน', en: 'How can I improve my cash flow?' },
  { th: 'ฉันใกล้จะติดหนี้ไหม', en: 'Am I at risk of going into debt?' },
  { th: 'ค่าใช้จ่ายอะไรที่ควรลดก่อน', en: 'Which expenses should I cut first?' },
];

export function CashFlowAIButton() {
  const locale = useLocale();
  const isTh = locale === 'th';
  const [pending, startTransition] = useTransition();
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function ask(prompt: string) {
    setReply(null);
    setError(null);
    startTransition(async () => {
      const result = await analyzeCashFlow(prompt, locale);
      if (result.error) {
        setError(result.error);
      } else {
        setReply(result.reply ?? '');
      }
    });
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5">
      <CardContent className="p-4 lg:p-6">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Brain className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              {isTh ? 'ให้ AI วิเคราะห์ Cash Flow' : 'Ask AI to analyze cash flow'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isTh
                ? 'AI จะดูข้อมูลการเงินของคุณและให้คำแนะนำแบบเฉพาะ'
                : 'AI will review your finances and give tailored advice'}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {PROMPTS.map((p) => {
            const text = isTh ? p.th : p.en;
            return (
              <button
                key={text}
                type="button"
                onClick={() => ask(text)}
                disabled={pending}
                className={cn(
                  'rounded-lg border bg-background px-3 py-2.5 text-left text-xs transition-all',
                  'hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50'
                )}
              >
                {text}
              </button>
            );
          })}
        </div>

        {pending && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-background border px-3 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isTh ? 'AI กำลังวิเคราะห์...' : 'AI is analyzing...'}
          </div>
        )}

        {reply && (
          <div className="mt-4 rounded-lg bg-background border-2 border-primary/30 px-4 py-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" />
              {isTh ? 'AI Advisor' : 'AI Advisor'}
            </p>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{reply}</div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              {error === 'no_key_configured' ? (
                <span>
                  {isTh ? 'ยังไม่ได้ตั้ง API key — ' : 'No API key set — '}
                  <a href={`/${locale}/ai/settings`} className="underline font-medium">
                    {isTh ? 'ตั้งที่นี่' : 'set up here'}
                  </a>
                </span>
              ) : (
                <span>{error}</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
