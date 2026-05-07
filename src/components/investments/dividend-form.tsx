'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createDividend } from '@/app/[locale]/(app)/investments/[id]/dividends/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      บันทึกเงินปันผล
    </Button>
  );
}

export function DividendForm({ investmentId }: { investmentId: string }) {
  const [state, action] = useFormState<{ error?: string } | undefined, FormData>(createDividend, undefined);
  const [amount, setAmount] = useState('');
  const [tax, setTax] = useState('');
  const [autoTax, setAutoTax] = useState(true);

  const amountNum = parseFloat(amount.replace(/,/g, '')) || 0;
  // Default WHT 10% for Thai stocks
  const taxNum = autoTax ? amountNum * 0.1 : (parseFloat(tax.replace(/,/g, '')) || 0);
  const net = amountNum - taxNum;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="investment_id" value={investmentId} />

      <div>
        <Label htmlFor="amount">เงินปันผลก่อนหักภาษี</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="any"
          inputMode="decimal"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label htmlFor="withholding_tax">ภาษีหัก ณ ที่จ่าย</Label>
          <button
            type="button"
            onClick={() => setAutoTax(!autoTax)}
            className="text-[11px] text-primary hover:underline"
          >
            {autoTax ? 'กรอกเอง' : 'ใช้ 10% อัตโนมัติ'}
          </button>
        </div>
        <Input
          id="withholding_tax"
          name="withholding_tax"
          type="number"
          step="any"
          inputMode="decimal"
          value={autoTax ? taxNum.toFixed(2) : tax}
          onChange={(e) => setTax(e.target.value)}
          disabled={autoTax}
          placeholder="0"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {autoTax ? 'ระบบคำนวณ 10% ตามอัตราหุ้นไทย' : 'กรอกตามที่ broker หักจริง'}
        </p>
      </div>

      {amountNum > 0 && (
        <div className="rounded-lg bg-success/10 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">รับสุทธิ</span>
            <span className="text-lg font-bold text-success">
              ฿{net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="ex_date">วันขึ้นเครื่องหมาย XD (ไม่บังคับ)</Label>
          <Input id="ex_date" name="ex_date" type="date" />
        </div>
        <div>
          <Label htmlFor="pay_date">วันที่จ่าย</Label>
          <Input id="pay_date" name="pay_date" type="date" required defaultValue={today} />
        </div>
      </div>

      <div>
        <Label htmlFor="note">หมายเหตุ (ไม่บังคับ)</Label>
        <Textarea id="note" name="note" rows={2} placeholder="เช่น ปันผลครึ่งปี 2026" />
      </div>

      {state?.error && (
        <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {state.error === 'invalid_data' ? 'ข้อมูลไม่ถูกต้อง' : 'เกิดข้อผิดพลาด ลองอีกครั้ง'}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
