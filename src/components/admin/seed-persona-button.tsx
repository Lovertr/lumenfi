'use client';

import { useState, useTransition } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { seedDemoAccount } from '@/app/[locale]/(app)/settings/admin/seed-demo/actions';
import type { PersonaKey } from '@/lib/demo/personas';

export function SeedPersonaButton({ personaKey }: { personaKey: PersonaKey }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const onClick = () => {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 5000);
      return;
    }
    setError(null);
    setStatus('idle');
    startTransition(async () => {
      const r = await seedDemoAccount(personaKey);
      if (r.ok) {
        setStatus('success');
        setConfirm(false);
        setTimeout(() => setStatus('idle'), 4000);
      } else {
        setStatus('error');
        setError(r.error ?? 'failed');
      }
    });
  };

  if (status === 'success') {
    return (
      <Button size="sm" variant="outline" disabled className="border-success/30 text-success">
        <Check className="mr-1 h-3.5 w-3.5" />
        Seeded ✓
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        onClick={onClick}
        disabled={pending}
        variant={confirm ? 'destructive' : 'default'}
      >
        {pending ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : null}
        {pending ? 'Seeding...' : confirm ? 'ยืนยันรีเซ็ต' : 'Seed'}
      </Button>
      {confirm && !pending && (
        <p className="text-[10px] text-muted-foreground">กดอีกครั้งเพื่อยืนยัน</p>
      )}
      {status === 'error' && error && (
        <p className="flex items-center gap-1 text-[10px] text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error.slice(0, 50)}
        </p>
      )}
    </div>
  );
}
