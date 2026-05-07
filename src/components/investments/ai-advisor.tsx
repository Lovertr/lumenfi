'use client';

import { useState, useTransition } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getInvestmentInsight } from '@/app/[locale]/(app)/investments/advisor-actions';

export function AIAdvisor() {
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const r = await getInvestmentInsight();
      if (r.ok && r.text) {
        setText(r.text);
      } else {
        setError(r.error ?? 'unknown');
      }
    });
  };

  const errorText: Record<string, string> = {
    no_ai_key: 'ยังไม่ได้ตั้งค่า AI key — ไปที่หน้าตั้งค่า → AI ก่อน',
    decryption_failed: 'ถอดรหัส API key ไม่สำเร็จ ลองตั้งค่าใหม่',
    no_holdings: 'ยังไม่มีรายการลงทุนให้วิเคราะห์',
    invalid_api_key: 'API key ไม่ถูกต้อง',
    rate_limited: 'ใช้งานบ่อยเกินไป รอสักครู่',
    ai_error: 'AI ตอบไม่ได้ ลองอีกครั้ง',
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-500 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold">ที่ปรึกษา AI</h2>
            <p className="text-[11px] text-muted-foreground">วิเคราะห์ portfolio + แนะนำการกระจายความเสี่ยง</p>
          </div>
          {!text && (
            <Button size="sm" onClick={onClick} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'วิเคราะห์'}
            </Button>
          )}
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorText[error] ?? 'เกิดข้อผิดพลาด'}</span>
          </div>
        )}

        {text && (
          <>
            <article className="mt-4 prose prose-sm max-w-none dark:prose-invert prose-headings:mt-3 prose-headings:mb-1 prose-headings:font-semibold prose-h2:text-sm prose-p:text-xs prose-p:my-1.5 prose-ul:my-1.5 prose-li:text-xs prose-li:my-0.5">
              {text.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (trimmed.startsWith('## ')) {
                  return <h2 key={i} className="mt-3 text-sm font-semibold">{trimmed.slice(3)}</h2>;
                }
                if (trimmed.startsWith('- ')) {
                  return <li key={i} className="ml-4 text-xs">{trimmed.slice(2)}</li>;
                }
                if (trimmed === '') return null;
                return <p key={i} className="text-xs leading-relaxed">{trimmed}</p>;
              })}
            </article>
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => { setText(null); setError(null); }}>
                วิเคราะห์ใหม่
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
