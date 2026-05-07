'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cancelSubscription } from '@/app/[locale]/(app)/pricing/actions';

export function CancelSubscriptionButton() {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
        <p className="text-xs font-semibold text-destructive">ยกเลิก subscription?</p>
        <p className="text-[11px] text-muted-foreground">
          คุณจะใช้งานได้จนถึงสิ้นรอบ billing แล้ว downgrade เป็น Free
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => startTransition(() => cancelSubscription())}
            disabled={pending}
          >
            {pending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            ยืนยัน
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
            ไม่
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
      ยกเลิก
    </Button>
  );
}
