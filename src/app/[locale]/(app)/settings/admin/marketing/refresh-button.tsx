'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Diagnostic {
  total_posts_in_db: number;
  published_posts: number;
  published_with_fb_id: number;
  attempted: number;
  succeeded: number;
  failed: number;
}

interface ApiResult {
  ok: boolean;
  updated?: number;
  msg?: string;
  diagnostic?: Diagnostic;
  samples?: Array<{ post_id: string; reach?: number; likes?: number }>;
  errors?: string[];
}

export function RefreshStatsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ApiResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handle = () => {
    setResult(null);
    setShowDetails(false);
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/marketing/refresh-stats', { method: 'POST' });
        const body = await res.json();
        if (!res.ok) {
          setResult({ ok: false, msg: body.message ?? body.error ?? 'failed' });
        } else {
          setResult({ ok: true, ...body });
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
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-[10px] text-emerald-600 hover:underline"
        >
          <CheckCircle2 className="h-3 w-3" /> อัพเดต {result.updated} โพส · {showDetails ? '▲' : 'ดูรายละเอียด ▼'}
        </button>
      )}
      {result && !result.ok && (
        <span className="flex items-center gap-1 text-[10px] text-red-600">
          <AlertTriangle className="h-3 w-3" /> {result.msg}
        </span>
      )}

      {showDetails && result?.diagnostic && (
        <div className="mt-1 max-w-xs rounded-md border bg-muted/40 p-2 text-[10px] text-muted-foreground">
          <div className="mb-1 font-semibold text-foreground">📊 Diagnostic</div>
          <div>Total posts in DB: {result.diagnostic.total_posts_in_db}</div>
          <div>Published: {result.diagnostic.published_posts}</div>
          <div>Has FB ID: {result.diagnostic.published_with_fb_id}</div>
          <div>Attempted: {result.diagnostic.attempted}</div>
          <div>
            Succeeded: <span className="text-emerald-600">{result.diagnostic.succeeded}</span> · Failed:{' '}
            <span className="text-red-600">{result.diagnostic.failed}</span>
          </div>
          {result.samples && result.samples.length > 0 && (
            <div className="mt-2 border-t pt-1">
              <div className="mb-0.5 font-semibold text-foreground">Sample fetch:</div>
              {result.samples.map((s) => (
                <div key={s.post_id} className="truncate">
                  {s.post_id.slice(0, 15)}... reach={s.reach ?? '?'} likes={s.likes ?? '?'}
                </div>
              ))}
            </div>
          )}
          {result.errors && result.errors.length > 0 && (
            <div className="mt-2 border-t pt-1">
              <div className="mb-0.5 font-semibold text-red-600">Errors:</div>
              {result.errors.map((e, i) => (
                <div key={i} className="break-all font-mono text-[9px]">
                  {e}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
