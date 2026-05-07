'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createInvestmentTransaction } from '@/app/[locale]/(app)/investments/[id]/transactions/actions';

type TxType = 'buy' | 'sell' | 'transfer_in' | 'transfer_out';

const TX_TYPES: { id: TxType; label: string; color: string }[] = [
  { id: 'buy', label: 'ซื้อ', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { id: 'sell', label: 'ขาย', color: 'bg-rose-100 text-rose-700 border-rose-300' },
  { id: 'transfer_in', label: 'โอนเข้า', color: 'bg-sky-100 text-sky-700 border-sky-300' },
  { id: 'transfer_out', label: 'โอนออก', color: 'bg-amber-100 text-amber-700 border-amber-300' },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      บันทึกรายการ
    </Button>
  );
}

export function TransactionForm({ investmentId, currentQty, avgCost, currentPrice }: {
  investmentId: string;
  currentQty: number;
  avgCost: number;
  currentPrice: number;
}) {
  const [state, action] = useFormState<{ error?: string } | undefined, FormData>(createInvestmentTransaction, undefined);
  const [type, setType] = useState<TxType>('buy');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState(currentPrice ? String(currentPrice) : '');
  const [fee, setFee] = useState('');

  const qtyNum = parseFloat(qty.replace(/,/g, '')) || 0;
  const priceNum = parseFloat(price.replace(/,/g, '')) || 0;
  const feeNum = parseFloat(fee.replace(/,/g, '')) || 0;
  const totalValue = qtyNum * priceNum + feeNum;
  const realizedPL = type === 'sell' && qtyNum > 0
    ? (priceNum - avgCost) * qtyNum - feeNum
    : null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="investment_id" value={investmentId} />
      <input type="hidden" name="type" value={type} />

      {/* Type selector */}
      <div className="grid grid-cols-4 gap-1.5">
        {TX_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            className={`rounded-lg border-2 px-2 py-2 text-xs font-medium transition-all ${
              type === t.id ? t.color : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Quantity */}
      <div>
        <Label htmlFor="quantity">จำนวน</Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          step="any"
          inputMode="decimal"
          required
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="0"
        />
        {(type === 'sell' || type === 'transfer_out') && qtyNum > currentQty && (
          <p className="mt-1 text-xs text-destructive">⚠ จำนวนเกินที่มี (มีอยู่ {currentQty})</p>
        )}
      </div>

      {/* Price per unit */}
      <div>
        <Label htmlFor="price_per_unit">ราคาต่อหน่วย</Label>
        <Input
          id="price_per_unit"
          name="price_per_unit"
          type="number"
          step="any"
          inputMode="decimal"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
        />
        {type === 'buy' && avgCost > 0 && priceNum > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            ทุนเฉลี่ยใหม่จะเป็น ฿{((avgCost * currentQty + priceNum * qtyNum + feeNum) / (currentQty + qtyNum)).toFixed(2)}
          </p>
        )}
      </div>

      {/* Fee */}
      <div>
        <Label htmlFor="fee">ค่าธรรมเนียม (ถ้ามี)</Label>
        <Input
          id="fee"
          name="fee"
          type="number"
          step="any"
          inputMode="decimal"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          placeholder="0"
        />
      </div>

      {/* Total + Realized P/L preview */}
      {qtyNum > 0 && priceNum > 0 && (
        <div className="rounded-lg bg-muted/40 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">มูลค่ารวม</span>
            <span className="font-semibold">฿{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          {realizedPL !== null && (
            <div className="mt-1 flex items-center justify-between border-t pt-1">
              <span className="text-muted-foreground">กำไร/ขาดทุนจากการขาย</span>
              <span className={`font-semibold ${realizedPL >= 0 ? 'text-success' : 'text-destructive'}`}>
                {realizedPL >= 0 ? '+' : ''}฿{realizedPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Date */}
      <div>
        <Label htmlFor="date">วันที่</Label>
        <Input id="date" name="date" type="date" required defaultValue={today} />
      </div>

      {/* Note */}
      <div>
        <Label htmlFor="note">หมายเหตุ (ไม่บังคับ)</Label>
        <Textarea id="note" name="note" rows={2} placeholder="เช่น รายการที่ broker XYZ" />
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
