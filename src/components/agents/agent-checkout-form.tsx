'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Loader2, QrCode, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { checkoutAgentPlan } from '@/app/[locale]/(app)/agents/billing/actions';

interface Props {
  plan: 'starter' | 'pro' | 'team';
  cycle: 'monthly' | 'annual';
  amountThb: number;
  planName: string;
}

export function AgentCheckoutForm({ plan, cycle, amountThb, planName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubscribe = () => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await checkoutAgentPlan({ plan, cycle });
        if (!r.ok) {
          setError(r.error ?? 'เกิดข้อผิดพลาด');
          return;
        }
        if (r.redirectUrl) {
          router.push(r.redirectUrl as any);
          return;
        }
        setError('ไม่พบ URL สำหรับ checkout');
      } catch (e: any) {
        setError(e?.message ?? 'unknown error');
      }
    });
  };

  const cycleLabel = cycle === 'annual' ? 'รายปี' : 'รายเดือน';
  const amountStr = amountThb.toLocaleString('th-TH');

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <p className="text-xs text-muted-foreground">แพลนที่เลือก</p>
        <p className="mt-0.5 font-semibold">{planName} · {cycleLabel}</p>
        <p className="mt-1 text-lg font-bold">฿{amountStr}</p>
      </div>

      <Button
        type="button"
        onClick={onSubscribe}
        disabled={pending}
        className="w-full"
        size="lg"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            กำลังเตรียม QR...
          </>
        ) : (
          <>
            <QrCode className="mr-2 h-4 w-4" />
            ชำระเงินผ่าน PromptPay
          </>
        )}
      </Button>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-center text-[10px] text-muted-foreground">
        โอนผ่าน PromptPay QR → อัพโหลดสลิป → auto-verify ทันที (หรือ admin ไม่เกิน 2 ชม.)
      </p>
    </div>
  );
}
