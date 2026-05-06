'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createInvestment, updateInvestment } from '@/app/[locale]/(app)/investments/actions';
import { investmentTypeConfig, investmentTypes, type InvestmentType } from './investment-type-config';
import { cn } from '@/lib/utils';

type State = { error?: string } | null;

interface Defaults {
  id?: string;
  name?: string;
  symbol?: string | null;
  type?: InvestmentType;
  broker_account?: string | null;
  quantity?: number;
  avg_cost?: number;
  current_price?: number | null;
  currency?: string;
}

function SubmitBtn({ mode }: { mode: 'create' | 'edit' }) {
  const t = useTranslations('Investments.form');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? '...' : mode === 'create' ? t('submit') : 'อัปเดต'}
    </Button>
  );
}

export function InvestmentForm({
  mode = 'create',
  defaults,
}: {
  mode?: 'create' | 'edit';
  defaults?: Defaults;
}) {
  const t = useTranslations('Investments.form');
  const tType = useTranslations('Investments.types');
  const action_fn = mode === 'edit' ? updateInvestment : createInvestment;
  const [state, action] = useFormState<State, FormData>(action_fn, null);
  const [type, setType] = useState<InvestmentType>(defaults?.type ?? 'thai_stock');

  return (
    <form action={action} className="space-y-5">
      {mode === 'edit' && defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

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

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1 space-y-2">
          <Label htmlFor="symbol">Symbol</Label>
          <Input id="symbol" name="symbol" defaultValue={defaults?.symbol ?? ''} placeholder="AAPL" className="font-mono" maxLength={20} />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="name">{t('name')}</Label>
          <Input id="name" name="name" defaultValue={defaults?.name ?? ''} required placeholder={t('namePlaceholder')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="broker_account">{t('broker')}</Label>
        <Input id="broker_account" name="broker_account" defaultValue={defaults?.broker_account ?? ''} placeholder={t('brokerPlaceholder')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="quantity">{t('quantity')}</Label>
          <Input id="quantity" name="quantity" type="text" inputMode="decimal" required defaultValue={defaults?.quantity ?? 0} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="avg_cost">{t('avgCost')}</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">฿</span>
            <Input id="avg_cost" name="avg_cost" type="text" inputMode="decimal" required defaultValue={defaults?.avg_cost ?? 0} className="pl-8" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="current_price">{t('currentPrice')}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">฿</span>
          <Input id="current_price" name="current_price" type="text" inputMode="decimal" defaultValue={defaults?.current_price ?? 0} className="pl-8" />
        </div>
        <p className="text-[11px] text-muted-foreground">เว้นว่าง = ใช้ราคาทุน — กดปุ่ม "อัปเดตราคา" บนหน้ารายการเพื่อดึงราคาจริง</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">{t('currency')}</Label>
        <select
          id="currency"
          name="currency"
          defaultValue={defaults?.currency ?? 'THB'}
          className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-base"
        >
          <option value="THB">THB (฿)</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="JPY">JPY (¥)</option>
          <option value="CNY">CNY (¥)</option>
          <option value="SGD">SGD (S$)</option>
        </select>
      </div>

      {state?.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <SubmitBtn mode={mode} />
    </form>
  );
}
