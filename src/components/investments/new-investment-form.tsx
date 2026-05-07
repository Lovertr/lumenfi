'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createInvestment } from '@/app/[locale]/(app)/investments/actions';
import { investmentTypeConfig, investmentTypes, type InvestmentType } from './investment-type-config';
import { cn } from '@/lib/utils';

type State = { error?: string } | null;

interface Goal {
  id: string;
  name: string;
  icon: string | null;
}

function SubmitBtn() {
  const t = useTranslations('Investments.form');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? '...' : t('submit')}
    </Button>
  );
}

export function NewInvestmentForm({
  defaultTaxSaving = false,
  goals = [],
  defaultGoalId = null,
}: {
  defaultTaxSaving?: boolean;
  goals?: Goal[];
  defaultGoalId?: string | null;
}) {
  const t = useTranslations('Investments.form');
  const tType = useTranslations('Investments.types');
  const [state, action] = useFormState<State, FormData>(createInvestment, null);
  const [type, setType] = useState<InvestmentType>(defaultTaxSaving ? 'mutual_fund' : 'thai_stock');
  const [isTaxSaving, setIsTaxSaving] = useState(defaultTaxSaving);
  const [taxFundType, setTaxFundType] = useState<'rmf' | 'ssf' | 'ssfx' | 'pvd' | 'gpf'>('ssf');
  const [goalId, setGoalId] = useState<string>(defaultGoalId ?? '');

  return (
    <form action={action} className="space-y-5">
      {/* Type picker */}
      <div className="space-y-2">
        <Label>{t('type')}</Label>
        <input type="hidden" name="type" value={type} />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {investmentTypes.map((it) => {
            const cfg = investmentTypeConfig[it];
            const active = type === it;
            return (
              <button
                key={it}
                type="button"
                onClick={() => setType(it)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 transition-all',
                  active ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                )}
              >
                <span className="text-2xl">{cfg.icon}</span>
                <span className="text-xs font-medium leading-tight">{tType(it)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Name + Symbol */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1 space-y-2">
          <Label htmlFor="symbol">Symbol</Label>
          <Input id="symbol" name="symbol" placeholder="AAPL" className="font-mono" maxLength={20} />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="name">{t('name')}</Label>
          <Input id="name" name="name" required placeholder={t('namePlaceholder')} />
        </div>
      </div>

      {/* Broker */}
      <div className="space-y-2">
        <Label htmlFor="broker_account">{t('broker')}</Label>
        <Input id="broker_account" name="broker_account" placeholder={t('brokerPlaceholder')} />
      </div>

      {/* Quantity + Avg cost */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="quantity">{t('quantity')}</Label>
          <Input id="quantity" name="quantity" type="text" inputMode="decimal" required defaultValue="0" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="avg_cost">{t('avgCost')}</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
              ฿
            </span>
            <Input id="avg_cost" name="avg_cost" type="text" inputMode="decimal" required defaultValue="0" className="pl-8" />
          </div>
        </div>
      </div>

      {/* Current price */}
      <div className="space-y-2">
        <Label htmlFor="current_price">{t('currentPrice')}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
            ฿
          </span>
          <Input id="current_price" name="current_price" type="text" inputMode="decimal" defaultValue="0" className="pl-8" />
        </div>
      </div>

      {/* Currency */}
      <div className="space-y-2">
        <Label htmlFor="currency">{t('currency')}</Label>
        <select
          id="currency"
          name="currency"
          defaultValue="THB"
          className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-base"
        >
          <option value="THB">THB (฿)</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="JPY">JPY (¥)</option>
        </select>
      </div>

      {/* Goal linking */}
      {goals.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="goal_id">เชื่อมกับเป้าหมาย (ไม่บังคับ)</Label>
          <input type="hidden" name="goal_id" value={goalId} />
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setGoalId('')}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                goalId === '' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted/40'
              }`}
            >
              — ไม่ผูก —
            </button>
            {goals.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoalId(g.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  goalId === g.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted/40'
                }`}
              >
                {g.icon ?? '🎯'} {g.name}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {goalId ? '✓ มูลค่าการลงทุนนี้จะนับรวมความก้าวหน้าของเป้าหมาย' : 'เลือกเป้าหมายเพื่อให้การลงทุนนี้นับเป็นความก้าวหน้า'}
          </p>
        </div>
      )}

      {/* Tax-saving toggle */}
      <div className="space-y-3 rounded-lg border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-4 dark:bg-emerald-950/20">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="is_tax_saving"
            value="true"
            checked={isTaxSaving}
            onChange={(e) => setIsTaxSaving(e.target.checked)}
            className="h-4 w-4 rounded border-emerald-300 accent-emerald-600"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold">นี่คือกองทุนลดหย่อนภาษี?</p>
            <p className="text-[11px] text-muted-foreground">RMF, SSF, PVD, กบข.</p>
          </div>
        </label>

        {isTaxSaving && (
          <div className="space-y-3 border-t border-emerald-200 pt-3">
            <div>
              <Label htmlFor="tax_fund_type" className="text-xs">ประเภทกองทุน</Label>
              <select
                id="tax_fund_type"
                name="tax_fund_type"
                value={taxFundType}
                onChange={(e) => setTaxFundType(e.target.value as any)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="ssf">SSF (Super Savings Fund)</option>
                <option value="rmf">RMF (Retirement Mutual Fund)</option>
                <option value="ssfx">SSF Extra</option>
                <option value="pvd">PVD (กองทุนสำรองเลี้ยงชีพ)</option>
                <option value="gpf">กบข. (กองทุนบำเหน็จบำนาญข้าราชการ)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="lock_in_until" className="text-xs">วันที่ปลดล็อก (ไม่บังคับ)</Label>
              <Input id="lock_in_until" name="lock_in_until" type="date" className="h-10 text-sm" />
              <p className="mt-1 text-[10px] text-muted-foreground">
                {taxFundType === 'ssf' && '*SSF ต้องถือ 10 ปีนับจากวันที่ซื้อ'}
                {taxFundType === 'rmf' && '*RMF ต้องถือ 5 ปี + อายุ 55 ปีขึ้นไป'}
                {(taxFundType === 'pvd' || taxFundType === 'gpf') && '*ตามเงื่อนไขของกองทุน'}
              </p>
            </div>
          </div>
        )}
      </div>

      {state?.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <SubmitBtn />
    </form>
  );
}
