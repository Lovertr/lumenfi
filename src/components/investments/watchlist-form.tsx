'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addToWatchlist } from '@/app/[locale]/(app)/investments/watchlist/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      เพิ่มเข้า Watchlist
    </Button>
  );
}

export function WatchlistForm() {
  const [state, action] = useFormState<{ error?: string } | undefined, FormData>(addToWatchlist, undefined);
  const [alertAbove, setAlertAbove] = useState(true);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="alert_above" value={String(alertAbove)} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="symbol">Symbol</Label>
          <Input id="symbol" name="symbol" required placeholder="AAPL หรือ PTT" className="font-mono uppercase" />
        </div>
        <div>
          <Label htmlFor="type">ประเภท</Label>
          <select
            id="type"
            name="type"
            required
            defaultValue="thai_stock"
            className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-base"
          >
            <option value="thai_stock">หุ้นไทย</option>
            <option value="foreign_stock">หุ้นต่างประเทศ</option>
            <option value="mutual_fund">กองทุนรวม</option>
            <option value="etf">ETF</option>
            <option value="crypto">Crypto</option>
            <option value="gold">ทองคำ</option>
            <option value="reit">REIT</option>
            <option value="other">อื่นๆ</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="name">ชื่อ (ไม่บังคับ)</Label>
        <Input id="name" name="name" placeholder="เช่น Apple Inc." />
      </div>

      <div>
        <Label htmlFor="target_price">ราคาเป้าหมาย (เพื่อแจ้งเตือน)</Label>
        <Input id="target_price" name="target_price" type="number" step="any" inputMode="decimal" placeholder="0.00" />
      </div>

      <div className="space-y-2">
        <Label>เงื่อนไขแจ้งเตือน</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAlertAbove(true)}
            className={`rounded-lg border-2 p-3 text-sm font-medium transition-all ${
              alertAbove
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                : 'border-border bg-background text-muted-foreground'
            }`}
          >
            ⬆ ราคาขึ้นถึง / เกิน
          </button>
          <button
            type="button"
            onClick={() => setAlertAbove(false)}
            className={`rounded-lg border-2 p-3 text-sm font-medium transition-all ${
              !alertAbove
                ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30'
                : 'border-border bg-background text-muted-foreground'
            }`}
          >
            ⬇ ราคาลงถึง / ต่ำกว่า
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="note">หมายเหตุ (ไม่บังคับ)</Label>
        <Textarea id="note" name="note" rows={2} placeholder="เช่น รอ dip ที่ ฿35 แล้วซื้อ" />
      </div>

      {state?.error && (
        <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {state.error === 'invalid_data' ? 'ข้อมูลไม่ถูกต้อง' : 'เกิดข้อผิดพลาด'}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
