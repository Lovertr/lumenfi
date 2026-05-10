'use client';

import { useState, useTransition } from 'react';
import { Pencil, Loader2, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adjustDebtBalance } from '@/app/[locale]/(app)/debts/actions';

export function AdjustBalanceDialog({
  debtId,
  debtName,
  currentBalance,
}: {
  debtId: string;
  debtName: string;
  currentBalance: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState(String(currentBalance));
  const [reason, setReason] = useState('');

  const numNew = parseFloat(newBalance.replace(/,/g, '')) || 0;
  const delta = numNew - currentBalance;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    const fd = new FormData();
    fd.append('debt_id', debtId);
    fd.append('new_balance', newBalance);
    if (reason) fd.append('reason', reason);
    startTransition(async () => {
      const r = await adjustDebtBalance(null, fd);
      if (r.ok) {
        setOpen(false);
      } else {
        setError(r.error ?? 'failed');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        title="ปรับยอดคงเหลือ"
        className="inline-flex h-7 items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 text-[11px] font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200"
      >
        <Pencil className="h-3 w-3" />
        ปรับยอด
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={onSubmit}
            className="w-full max-w-md rounded-t-xl bg-background p-5 shadow-xl sm:rounded-xl"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold">ปรับยอดคงเหลือ</h2>
                <p className="text-xs text-muted-foreground">{debtName}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 hover:bg-muted/40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[11px] text-muted-foreground">ยอดปัจจุบันในแอพ</p>
                <p className="text-base font-semibold">฿{currentBalance.toLocaleString()}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_balance">ยอดที่ถูกต้อง (จาก statement จริง)</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
                    ฿
                  </span>
                  <Input
                    id="new_balance"
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    required
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    className="pl-8 text-base font-semibold"
                    placeholder="0"
                  />
                </div>
              </div>

              {numNew !== currentBalance && (
                <div
                  className={
                    'rounded-md p-3 text-xs ' +
                    (delta > 0
                      ? 'bg-rose-50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200'
                      : 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200')
                  }
                >
                  <p className="font-semibold">
                    {delta > 0 ? '↑ ยอดเพิ่ม' : '↓ ยอดลด'} ฿
                    {Math.abs(delta).toLocaleString()}
                  </p>
                  <p className="mt-1 text-[11px] opacity-80">
                    {delta > 0
                      ? 'ดอกเบี้ยทบ / ค่างวดยังไม่บันทึก / ใช้บัตรเพิ่ม'
                      : 'จ่ายเพิ่ม / โปะ / ยอดสมจริงน้อยกว่า'}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">หมายเหตุ (ไม่บังคับ)</Label>
                <Input
                  id="reason"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="เช่น ดอกเบี้ยเดือน เม.ย. / โปะ ฿5,000"
                  maxLength={200}
                />
              </div>

              {error && (
                <p className="flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" /> {error}
                </p>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
                disabled={pending}
              >
                ยกเลิก
              </Button>
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="mr-1 h-3.5 w-3.5" />
                )}
                ยืนยัน
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
