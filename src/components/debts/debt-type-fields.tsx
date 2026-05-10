'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DebtType } from './debt-type-config';

export const RATE_TYPE_HINT: Record<string, { label_th: string; label_en: string; desc_th: string; desc_en: string }> = {
  reducing: {
    label_th: 'ลดต้นลดดอก',
    label_en: 'Reducing balance (amortizing)',
    desc_th: 'ดอกคิดจากเงินต้นคงเหลือ จ่ายเกินขั้นต่ำลดดอกได้',
    desc_en: 'Interest on remaining balance; extra payments reduce interest',
  },
  flat: {
    label_th: 'ลดต้นไม่ลดดอก',
    label_en: 'Flat rate',
    desc_th: 'ดอกคิดจากเงินต้นเริ่มต้นทั้งสัญญา (พบในสินเชื่อรถ)',
    desc_en: 'Interest on original principal regardless of payments (Thai auto loan standard)',
  },
  stepped: {
    label_th: 'ดอกขั้นบันได',
    label_en: 'Stepped rate',
    desc_th: 'ดอกแตกต่างกันตามช่วงเวลา (มาตรฐานสินเชื่อบ้านไทย)',
    desc_en: 'Different rates by period (Thai mortgage standard)',
  },
  promo_then_apr: {
    label_th: 'ผ่อน 0% แล้วดอกขึ้น',
    label_en: '0% promo then APR',
    desc_th: 'ดอก 0% ในช่วงโปร หลังหมดโปรดอกพุ่งสูง',
    desc_en: '0% during promotion, then high APR after',
  },
  daily_revolving: {
    label_th: 'ดอกรายวันหมุนเวียน',
    label_en: 'Daily revolving',
    desc_th: 'บัตรเครดิต — ดอกคิดทุกวันจากยอดค้างเฉลี่ย',
    desc_en: 'Credit card — daily interest on average balance',
  },
};

interface RateStep { from_month: number; to_month: number | null; rate: string; }

export function DebtTypeFields({
  type,
  isTh,
}: {
  type: DebtType;
  isTh: boolean;
}) {
  // Default rate_type per debt type
  const defaultRateType =
    type === 'mortgage' ? 'stepped' :
    type === 'auto_loan' ? 'flat' :
    type === 'credit_card' ? 'daily_revolving' :
    type === 'installment_zero' ? 'promo_then_apr' :
    type === 'student_loan' ? 'reducing' :
    'reducing';

  const [rateType, setRateType] = useState<string>(defaultRateType);

  // Stepped schedule for mortgage
  const [steps, setSteps] = useState<RateStep[]>(
    type === 'mortgage'
      ? [
          { from_month: 1, to_month: 12, rate: '2.99' },
          { from_month: 13, to_month: 24, rate: '3.49' },
          { from_month: 25, to_month: 36, rate: '4.49' },
          { from_month: 37, to_month: null, rate: '5.50' },
        ]
      : []
  );

  function addStep() {
    const last = steps[steps.length - 1];
    setSteps([...steps, { from_month: last ? (last.to_month ?? last.from_month) + 1 : 1, to_month: null, rate: '5.0' }]);
  }
  function removeStep(idx: number) {
    setSteps(steps.filter((_, i) => i !== idx));
  }
  function updateStep(idx: number, key: keyof RateStep, value: string) {
    setSteps(steps.map((s, i) => i === idx ? { ...s, [key]: key === 'rate' ? value : (value ? parseInt(value, 10) : null) } : s));
  }

  const showStepped = rateType === 'stepped';
  const showLockIn = type === 'mortgage';
  const showCreditFields = type === 'credit_card' || rateType === 'daily_revolving';
  const showPromo = rateType === 'promo_then_apr' || type === 'installment_zero';

  return (
    <div className="space-y-4">
      {/* Rate type selector */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Info className="h-4 w-4 text-primary" />
          {isTh ? 'วิธีคิดดอกเบี้ย' : 'Interest calculation type'}
        </Label>
        <input type="hidden" name="rate_type" value={rateType} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Object.entries(RATE_TYPE_HINT).map(([key, info]) => {
            const active = rateType === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setRateType(key)}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-lg border-2 p-2.5 text-left transition-all',
                  active ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                )}
              >
                <span className="text-sm font-medium">{isTh ? info.label_th : info.label_en}</span>
                <span className="text-[10px] leading-tight text-muted-foreground">
                  {isTh ? info.desc_th : info.desc_en}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stepped rate schedule */}
      {showStepped && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">
              {isTh ? 'ตารางอัตราดอกเบี้ย' : 'Rate schedule'}
            </Label>
            <Button type="button" size="sm" variant="ghost" onClick={addStep} className="h-7 px-2 text-xs">
              <Plus className="mr-1 h-3 w-3" />
              {isTh ? 'เพิ่มช่วง' : 'Add'}
            </Button>
          </div>
          <input type="hidden" name="rate_schedule" value={JSON.stringify(
            steps.map((s) => ({ from_month: s.from_month, to_month: s.to_month, rate: parseFloat(s.rate) || 0 }))
          )} />
          <div className="space-y-1.5">
            {steps.map((s, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-3">
                  <p className="text-[10px] text-muted-foreground">{isTh ? 'เดือนที่' : 'From month'}</p>
                  <Input
                    value={String(s.from_month)}
                    onChange={(e) => updateStep(i, 'from_month', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-3">
                  <p className="text-[10px] text-muted-foreground">{isTh ? 'ถึงเดือนที่' : 'To month'}</p>
                  <Input
                    value={s.to_month != null ? String(s.to_month) : ''}
                    placeholder={isTh ? 'ตลอด' : 'ongoing'}
                    onChange={(e) => updateStep(i, 'to_month', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-5">
                  <p className="text-[10px] text-muted-foreground">{isTh ? 'ดอก%/ปี' : 'Rate %/yr'}</p>
                  <Input
                    value={s.rate}
                    onChange={(e) => updateStep(i, 'rate', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => removeStep(i)} className="col-span-1 h-8 w-8 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {isTh
              ? '💡 มาตรฐานสินเชื่อบ้านไทย: ปี 1 = 2.99%, ปี 2 = 3.49%, ปี 3 = 4.49%, ปี 4+ = MRR'
              : '💡 Thai mortgage standard: Y1=2.99%, Y2=3.49%, Y3=4.49%, Y4+ = MRR'}
          </p>
        </div>
      )}

      {/* Lock-in for mortgage */}
      {showLockIn && (
        <div className="space-y-2">
          <Label htmlFor="lock_in_months">
            {isTh ? 'Lock-in period (เดือน)' : 'Lock-in period (months)'}
          </Label>
          <Input id="lock_in_months" name="lock_in_months" type="number" min={0} max={120} defaultValue="36" />
          <p className="text-[11px] text-muted-foreground">
            {isTh
              ? 'ช่วงห้ามรีไฟแนนซ์ (มาตรฐาน 36 เดือน) — ถ้าปิดก่อนโดนค่าปรับ 1-3%'
              : "Period before refinance allowed (typical 36 months) — early payoff penalty 1-3%"}
          </p>
        </div>
      )}

      {/* Promo for 0% installment */}
      {showPromo && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="promo_end_date">{isTh ? 'วันสิ้นสุดโปรโมชัน' : 'Promo end date'}</Label>
            <Input id="promo_end_date" name="promo_end_date" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="post_promo_rate">{isTh ? 'ดอกหลังหมดโปร %/ปี' : 'Post-promo rate %/yr'}</Label>
            <Input id="post_promo_rate" name="post_promo_rate" type="text" inputMode="decimal" defaultValue="18" placeholder="18" />
          </div>
        </div>
      )}

      {/* Credit limit only — statement/due day moved to main form */}
      {showCreditFields && (
        <div className="space-y-2">
          <Label htmlFor="credit_limit">{isTh ? 'วงเงินบัตร' : 'Credit limit'}</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">฿</span>
            <Input id="credit_limit" name="credit_limit" type="text" inputMode="decimal" placeholder="100000" className="pl-6" />
          </div>
        </div>
      )}
    </div>
  );
}
