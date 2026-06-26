'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Scale, X, Loader2 } from 'lucide-react';
import { adjustAccountBalance } from '@/app/[locale]/(app)/accounts/actions';

interface Props {
  accountId: string;
  currentBalance: number;
  isLiability?: boolean;
}

export function AdjustBalanceButton({ accountId, currentBalance, isLiability }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    start(async () => {
      const r = await adjustAccountBalance(formData);
      if (r.error) {
        setError(r.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Scale className="h-4 w-4" />
        ปรับยอด
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => !pending && setOpen(false)}>
          <form
            action={onSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">ปรับยอดเงินคงเหลือ</h3>
                <p className="text-xs text-muted-foreground">
                  ตั้งยอดให้ตรงกับธนาคารจริง — รายการก่อนวันที่นี้จะถูกถือว่ารวมในยอดใหม่แล้ว
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={pending} className="rounded-full p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <input type="hidden" name="account_id" value={accountId} />

            <div className="rounded-lg border border-muted bg-muted/30 p-3 text-xs">
              <p className="text-muted-foreground">{isLiability ? 'ยอดคงค้างปัจจุบัน' : 'ยอดเงินปัจจุบัน'}</p>
              <p className="mt-0.5 text-base font-semibold">
                ฿{currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new_balance">
                {isLiability ? 'ยอดคงค้างใหม่ (ใส่ตัวเลขบวก)' : 'ยอดเงินใหม่'}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">฿</span>
                <Input
                  id="new_balance"
                  name="new_balance"
                  type="text"
                  inputMode="decimal"
                  defaultValue={Math.abs(currentBalance).toFixed(2)}
                  required
                  className="pl-7 text-lg font-semibold"
                  autoFocus
                  pattern="[0-9]*\.?[0-9]*"
                />
              </div>
              {isLiability && (
                <p className="text-[10px] text-muted-foreground">
                  ⚠️ บัตรเครดิตเป็นหนี้ — ใส่ยอดที่ติดอยู่กับธนาคาร (ตัวเลขบวก) เช่น 24990.18 ไม่ใช่ -24990.18
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="effective_date">วันที่มีผล</Label>
              <Input
                id="effective_date"
                name="effective_date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
              <p className="text-[10px] text-muted-foreground">บันทึกประวัติ — ใช้แสดงในประวัติการปรับยอด</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason">เหตุผล (ไม่บังคับ)</Label>
              <Textarea
                id="reason"
                name="reason"
                placeholder="เช่น ตรวจกับ Bank app แล้วยอดไม่ตรง / ปรับตามไฟแนนซ์จริง / เบี้ยปรับ"
                rows={2}
              />
            </div>

            {error && (
              <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                เกิดข้อผิดพลาด: {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending} className="flex-1">
                ยกเลิก
              </Button>
              <Button type="submit" disabled={pending} className="flex-1">
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                บันทึก
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
