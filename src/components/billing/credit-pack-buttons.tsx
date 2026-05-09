'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startCreditCheckout } from '@/app/[locale]/(app)/pricing/actions';

const PACKS = [
  { size: 10, price: 79, label: '10 reports', save: '~12% off' },
  { size: 50, price: 349, label: '50 reports', save: '~22% off · ยอดนิยม', highlight: true },
  { size: 100, price: 599, label: '100 reports', save: '~33% off' },
];

export function CreditPackButtons() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activePack, setActivePack] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onBuy = (size: number) => {
    setActivePack(size);
    setError(null);
    startTransition(async () => {
      const r = await startCreditCheckout(size);
      if (r.ok && r.checkoutUrl) {
        router.push(r.checkoutUrl as any);
      } else {
        setError(r.error ?? 'failed');
        setActivePack(null);
      }
    });
  };

  return (
    <div className="space-y-2">
      {PACKS.map((p) => (
        <button
          key={p.size}
          type="button"
          onClick={() => onBuy(p.size)}
          disabled={pending}
          className={`w-full rounded-lg border-2 p-3 text-left text-sm transition-all ${
            p.highlight
              ? 'border-amber-500/50 bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/20'
              : 'border-border hover:border-primary/40 hover:bg-muted/40'
          } disabled:opacity-50`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{p.label}</p>
              <p className="text-[11px] text-muted-foreground">{p.save}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">฿{p.price}</p>
              {pending && activePack === p.size && (
                <Loader2 className="ml-auto mt-1 h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        </button>
      ))}
      {error && (
        <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {error === 'omise_not_configured'
            ? 'การชำระเงินยังไม่พร้อม — กรุณาตั้งค่า Omise ก่อน'
            : 'เกิดข้อผิดพลาด ลองอีกครั้ง'}
        </p>
      )}
    </div>
  );
}
