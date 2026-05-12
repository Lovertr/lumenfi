'use client';

import { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReferralShare({ code }: { code: string }) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  // Use the /r/CODE landing page — pretty welcome before signup,
  // so the friend sees who invited them + the Pro 30d reward callout.
  // /register?ref=CODE still works as a fallback (it forwards here).
  const link =
    typeof window !== 'undefined'
      ? `${window.location.origin}/r/${code}`
      : `https://lumenfi.projectostech.com/r/${code}`;

  const shareText = `มาลองใช้ Lumenfi กัน — แอพการเงินส่วนตัว + AI ที่ปรึกษาทางการเงิน

ใส่โค้ด ${code} ตอนสมัคร → เราทั้งคู่ได้ Pro ฟรี 30 วัน

${link}`;

  function copy(text: string, what: 'code' | 'link') {
    navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  }

  function shareNative() {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      (navigator as any)
        .share({ title: 'Lumenfi', text: shareText })
        .catch(() => {});
    } else {
      copy(shareText, 'link');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border-2 border-primary/40 bg-primary/5 p-3">
        <p className="flex-1 font-mono text-xl font-bold tracking-[0.25em] text-primary">{code}</p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => copy(code, 'code')}
          className="shrink-0"
        >
          {copied === 'code' ? (
            <>
              <Check className="mr-1 h-3.5 w-3.5" /> คัดลอกแล้ว
            </>
          ) : (
            <>
              <Copy className="mr-1 h-3.5 w-3.5" /> คัดลอก
            </>
          )}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => copy(link, 'link')}
        >
          {copied === 'link' ? (
            <>
              <Check className="mr-1 h-3.5 w-3.5" /> คัดลอกลิงก์แล้ว
            </>
          ) : (
            <>
              <Copy className="mr-1 h-3.5 w-3.5" /> คัดลอกลิงก์
            </>
          )}
        </Button>
        <Button type="button" className="flex-1" onClick={shareNative}>
          <Share2 className="mr-1 h-3.5 w-3.5" />
          แชร์
        </Button>
      </div>

      <p className="rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
        ลิงก์: <span className="font-mono">{link}</span>
      </p>
    </div>
  );
}
