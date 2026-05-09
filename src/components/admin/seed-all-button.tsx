'use client';

import { useState, useTransition } from 'react';
import { Loader2, Check, AlertCircle, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { seedAllDemoAccounts } from '@/app/[locale]/(app)/settings/admin/seed-demo/actions';

export function SeedAllButton() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<{ key: string; ok: boolean; error?: string }[]>([]);
  const [confirm, setConfirm] = useState(false);

  const onClick = () => {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 5000);
      return;
    }
    setStatus('idle');
    startTransition(async () => {
      const r = await seedAllDemoAccounts();
      setResults(r.results);
      setStatus(r.ok ? 'success' : 'error');
      setConfirm(false);
      if (r.ok) setTimeout(() => setStatus('idle'), 6000);
    });
  };

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        onClick={onClick}
        disabled={pending}
        variant={confirm ? 'destructive' : 'default'}
        className="w-full"
      >
        {pending ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Database className="mr-2 h-3.5 w-3.5" />
        )}
        {pending ? 'กำลัง Seed ทุก persona...' : confirm ? 'ยืนยัน Seed All (ใช้เวลา ~30 วิ)' : 'Seed All Personas'}
      </Button>
      {confirm && !pending && (
        <p className="text-center text-[10px] text-muted-foreground">กดอีกครั้งเพื่อยืนยัน</p>
      )}
      {status === 'success' && results.length > 0 && (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-[11px] dark:bg-emerald-950/20">
          <p className="flex items-center gap-1 font-semibold text-emerald-900 dark:text-emerald-200">
            <Check className="h-3 w-3" /> Seeded {results.filter((r) => r.ok).length}/{results.length} personas
          </p>
        </div>
      )}
      {status === 'error' && results.length > 0 && (
        <div className="rounded border border-rose-200 bg-rose-50 p-2 text-[11px] dark:bg-rose-950/20">
          <p className="flex items-center gap-1 font-semibold text-rose-900 dark:text-rose-200">
            <AlertCircle className="h-3 w-3" /> มี error
          </p>
          {results.filter((r) => !r.ok).map((r) => (
            <p key={r.key} className="text-rose-800 dark:text-rose-300">
              {r.key}: {r.error?.slice(0, 60)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
