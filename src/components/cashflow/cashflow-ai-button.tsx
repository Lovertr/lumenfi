'use client';

import { useState, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { Brain, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { analyzeCashFlow } from '@/app/[locale]/(app)/cashflow/actions';
import { cn } from '@/lib/utils';

const PROMPTS = [
  { th: 'วิเคราะห์ Cash Flow ของฉันแบบละเอียด', en: 'Detailed cash flow analysis' },
  { th: 'ทำไมเดือนนี้เงินสดตึงตัว', en: 'Why is cash tight this month?' },
  { th: 'แนะนำ Action Plan ปรับปรุง Cash Flow', en: 'Action plan to improve cash flow' },
  { th: 'ฉันใกล้จะติดหนี้ไหม วิธีป้องกัน', en: 'Am I at risk of debt? How to prevent' },
  { th: 'ค่าใช้จ่ายอะไรที่ควรลดก่อน', en: 'Which expenses should I cut first?' },
  { th: 'ตั้งเป้า 90 วันให้ฉันหน่อย', en: 'Set a 90-day plan for me' },
];

// Simple markdown renderer for AI responses
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let inList = false;

  function flushList() {
    if (listItems.length > 0) {
      result.push(
        <ul key={`ul-${result.length}`} className="my-2 ml-2 space-y-1.5 list-disc list-inside">
          {listItems}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  }

  function renderInline(s: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    let key = 0;
    while ((m = regex.exec(s)) !== null) {
      if (m.index > lastIdx) parts.push(s.slice(lastIdx, m.index));
      if (m[1]) parts.push(<strong key={key++}>{m[1]}</strong>);
      else if (m[2]) parts.push(<em key={key++}>{m[2]}</em>);
      else if (m[3]) parts.push(<code key={key++} className="rounded bg-muted px-1 py-0.5 text-xs">{m[3]}</code>);
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < s.length) parts.push(s.slice(lastIdx));
    return parts;
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('## ')) {
      flushList();
      result.push(
        <h3 key={`h3-${i}`} className="mt-4 mb-2 text-base font-bold text-primary first:mt-0">
          {renderInline(trimmed.slice(3))}
        </h3>
      );
    } else if (trimmed.startsWith('### ')) {
      flushList();
      result.push(
        <h4 key={`h4-${i}`} className="mt-3 mb-1.5 text-sm font-semibold">
          {renderInline(trimmed.slice(4))}
        </h4>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(
        <li key={`li-${i}`} className="leading-relaxed">
          {renderInline(trimmed.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      result.push(
        <p key={`p-${i}`} className="my-1.5 leading-relaxed">
          <strong className="text-primary mr-1.5">{trimmed.match(/^\d+/)?.[0]}.</strong>
          {renderInline(trimmed.replace(/^\d+\.\s/, ''))}
        </p>
      );
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      result.push(
        <p key={`p-${i}`} className="my-1.5 leading-relaxed">
          {renderInline(trimmed)}
        </p>
      );
    }
  });
  flushList();

  return result;
}

export function CashFlowAIButton() {
  const locale = useLocale();
  const isTh = locale === 'th';
  const [pending, startTransition] = useTransition();
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);

  function ask(prompt: string) {
    setReply(null);
    setError(null);
    setActivePrompt(prompt);
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
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Brain className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              {isTh ? 'ให้ AI วิเคราะห์ Cash Flow แบบละเอียด' : 'AI cash flow analysis'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isTh
                ? 'AI จะให้รายงาน 5 ส่วน: สถานะ ปัญหา Action Plan เป้าหมาย 90 วัน คำเตือน'
                : 'AI generates a 5-part report: status, problems, action plan, 90-day goal, warnings'}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {PROMPTS.map((p) => {
            const text = isTh ? p.th : p.en;
            const isActive = activePrompt === text;
            return (
              <button
                key={text}
                type="button"
                onClick={() => ask(text)}
                disabled={pending}
                className={cn(
                  'rounded-lg border bg-background px-3 py-2.5 text-left text-xs transition-all',
                  'hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50',
                  isActive && 'border-primary bg-primary/10'
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
            {isTh ? 'AI กำลังวิเคราะห์ละเอียด... (อาจใช้เวลา 10-30 วินาที)' : 'AI is analyzing... (10-30s)'}
          </div>
        )}

        {reply && (
          <div className="mt-4 rounded-lg bg-background border-2 border-primary/30 px-4 py-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" />
              {isTh ? 'AI Cash Flow Advisor' : 'AI Cash Flow Advisor'}
            </p>
            <div className="text-sm">
              {renderMarkdown(reply)}
            </div>
            <button
              type="button"
              onClick={() => {
                setReply(null);
                setActivePrompt(null);
              }}
              className="mt-4 text-xs text-muted-foreground hover:text-foreground"
            >
              {isTh ? 'ปิด / ถามใหม่' : 'Close / ask again'}
            </button>
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
