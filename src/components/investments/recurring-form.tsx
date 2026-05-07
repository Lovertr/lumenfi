'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createRecurringInvestment } from '@/app/[locale]/(app)/investments/recurring/actions';

interface Inv {
  id: string;
  name: string;
  symbol: string | null;
  type: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      สร้าง DCA อัตโนมัติ
    </Button>
  );
}

export function RecurringForm({ investments }: { investments: Inv[] }) {
  const [state, action] = useFormState<{ error?: string } | undefined, FormData>(createRecurringInvestment, undefined);
  const [investmentId, setInvestmentId] = useState<string>(investments[0]?.id ?? '');
  const [mode, setMode] = useState<'amount' | 'quantity'>('amount');
  const [amount, setAmount] = useState('5000');
  const [qty, setQty] = useState('');
  const [day, setDay] = useState('1');

  const today = new Date().toISOString().slice(0, 10);

  if (investments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        ต้องมีรายการลงทุนอย่างน้อย 1 รายการก่อน
      </div>
    );
  }

  const sel = investments.find((i) => i.id === investmentId);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="investment_id" value={investmentId} />
      <input type="hidden" name="mode" value={mode} />

      {/* Investment selector */}
      <div className="space-y-2">
        <Label>เลือกการลงทุน</Label>
        <div className="flex flex-wrap gap-1.5">
          {investments.map((inv) => (
            <button
              key={inv.id}
              type="button"
              onClick={() => setInvestmentId(inv.id)}
              className={`rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all ${
                investmentId === inv.id
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-background hover:border-primary/40'
              }`}
            >
              <span className="font-mono">{inv.symbol ?? inv.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode picker */}
      <div className="space-y-2">
        <Label>โหมด DCA</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('amount')}
            className={`rounded-lg border-2 px-3 py-3 text-sm font-medium transition-all ${
              mode === 'amount' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background hover:border-primary/40'
            }`}
          >
            💵 จำนวนเงินคงที่
            <p className="mt-0.5 text-[10px] font-normal text-muted-foreground">ราคาขึ้นซื้อน้อย ราคาลงซื้อมาก</p>
          </button>
          <button
            type="button"
            onClick={() => setMode('quantity')}
            className={`rounded-lg border-2 px-3 py-3 text-sm font-medium transition-all ${
              mode === 'quantity' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background hover:border-primary/40'
            }`}
          >
            📦 จำนวนหุ้นคงที่
            <p className="mt-0.5 text-[10px] font-normal text-muted-foreground">เก็บหุ้นเป้าหมายต่อรอบ</p>
          </button>
        </div>
      </div>

      {mode === 'amount' ? (
        <div>
          <Label htmlFor="amount_per_run">จำนวนเงินต่อรอบ (บาท)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">฿</span>
            <Input
              id="amount_per_run"
              name="amount_per_run"
              type="number"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-8"
              placeholder="5000"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            ระบบจะคำนวณจำนวนหุ้นจากราคาตลาด ณ วันนั้น
          </p>
        </div>
      ) : (
        <div>
          <Label htmlFor="quantity_per_run">จำนวนหุ้นต่อรอบ</Label>
          <Input
            id="quantity_per_run"
            name="quantity_per_run"
            type="number"
            step="any"
            inputMode="decimal"
            required
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="100"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            ระบบจะใช้ราคาตลาด ณ วันนั้นในการคำนวณค่าใช้จ่าย
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="day_of_month">ลงทุนทุกวันที่ของเดือน</Label>
        <Input
          id="day_of_month"
          name="day_of_month"
          type="number"
          min="1"
          max="31"
          required
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          ถ้าเดือนนั้นไม่มีวันที่ {day} (เช่น 31 ในเดือน 30 วัน) ระบบจะใช้วันสุดท้ายของเดือนแทน
        </p>
      </div>

      <div>
        <Label htmlFor="start_date">วันเริ่มต้น</Label>
        <Input id="start_date" name="start_date" type="date" defaultValue={today} />
        <p className="mt-1 text-[11px] text-muted-foreground">
          การลงทุนรอบแรกจะเกิดขึ้นในวันที่ {day} ของเดือนถัดไป (หรือเดือนนี้ถ้ายังไม่ผ่านวันนั้น)
        </p>
      </div>

      <div>
        <Label htmlFor="note">หมายเหตุ (ไม่บังคับ)</Label>
        <Textarea id="note" name="note" rows={2} placeholder="เช่น DCA เกษียณอายุ" />
      </div>

      {state?.error && (
        <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {state.error === 'invalid_data' ? 'ข้อมูลไม่ถูกต้อง' : 'เกิดข้อผิดพลาด ลองอีกครั้ง'}
        </p>
      )}

      <SubmitButton />

      <p className="rounded-md bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
        ⚠️ DCA นี้เป็นแค่การ <b>บันทึกธุรกรรมอัตโนมัติ</b> — ไม่ได้ซื้อหุ้นจริงผ่าน broker
        คุณยังต้องดำเนินการซื้อจริงเอง (เช่น Streaming) ระบบจะช่วยติดตามและคำนวณ avg cost ให้
      </p>
    </form>
  );
}
