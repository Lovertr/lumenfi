'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RefreshStatsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; updated?: number; msg?: string } | null>(null);

  const handle = () => {
    setResult(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/marketing/refresh-stats', { method: 'POST' });
        const body = await res.json();
        if (!res.ok) {
          setResult({ ok: false, msg: body.message ?? body.error ?? 'failed' });
        } else {
          setResult({ ok: true, updated: body.updated });
          router.refresh();
        }
      } catch (e) {
        setResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handle} disabled={pending} size="sm" variant="outline">
        <RefreshCw className={'h-3.5 w-3.5 ' + (pending ? 'animate-spin' : '')} />
        <span className="ml-1.5">{pending ? 'กำลัง fetch...' : 'ดึงสถิติล่าสุด'}</span>
      </Button>
      {result?.ok && (
        <span className="flex items-center gap-1 text-[10px] text-emerald-600">
          <CheckCircle2 className="h-3 w-3" /> อัพเดต {result.updated} โพส
        </span>
      )}
      {result && !result.ok && (
        <span className="flex items-center gap-1 text-[10px] text-red-600">
          <AlertTriangle className="h-3 w-3" /> {result.msg}
        </span>
      )}
    </div>
  );
}
