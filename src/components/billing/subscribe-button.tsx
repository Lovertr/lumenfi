'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startSubscriptionCheckout } from '@/app/[locale]/pricing/actions';

export function SubscribeButton() {
  const router = useRouter();
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubscribe = () => {
    setError(null);
    startTransition(async () => {
      const r = await startSubscriptionCheckout(cycle);
      if (r.ok && r.checkoutUrl) {
        router.push(r.checkoutUrl as any);
      } else {
        setError(r.error ?? 'failed');
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1">
        <button
          type="button"
          onClick={() => setCycle('monthly')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            cycle === 'monthly' ? 'bg-background shadow-sm' : 'text-muted-foreground'
          }`}
        >
          รายเดือน · ฿149
        </button>
        <button
          type="button"
          onClick={() => setCycle('yearly')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            cycle === 'yearly' ? 'bg-background shadow-sm' : 'text-muted-foreground'
          }`}
        >
          รายปี · ฿1,490 <span className="text-success">-17%</span>
        </button>
      </div>

      <Button
        onClick={onSubscribe}
        disabled={pending}
        className="w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
        size="lg"
      >
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        เริ่มทดลองฟรี 14 วัน
      </Button>

      <p className="text-center text-[10px] text-muted-foreground">
        ยกเลิกได้ทุกเมื่อ · charge ครั้งแรก {cycle === 'monthly' ? '฿149' : '฿1,490'} หลังครบ 14 วัน
      </p>

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
