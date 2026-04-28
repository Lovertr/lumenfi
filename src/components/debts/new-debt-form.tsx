'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createDebt } from '@/app/[locale]/(app)/debts/actions';
import { debtTypeConfig, debtTypes, type DebtType } from './debt-type-config';
import { cn } from '@/lib/utils';

type State = { error?: string } | null;

function SubmitBtn() {
  const t = useTranslations('Debts.form');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? '...' : t('submit')}
    </Button>
  );
}

export function NewDebtForm() {
  const t = useTranslations('Debts.form');
  const tType = useTranslations('Debts.types');
  const [state, action] = useFormState<State, FormData>(createDebt, null);
  const [type, setType] = useState<DebtType>('credit_card');

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-5">
      {/* Type picker */}
      <div className="space-y-2">
        <Label>{t('type')}</Label>
        <input type="hidden" name="type" value={type} />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {debtTypes.map((dt) => {
            const cfg = debtTypeConfig[dt];
            const Icon = cfg.icon;
            const active = type === dt;
            return (
              <button
                key={dt}
                type="button"
                onClick={() => setType(dt)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 transition-all',
                  active ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                )}
              >
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', cfg.bg, cfg.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium leading-tight">{tType(dt)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">{t('name')}</Label>
        <Input id="name" name="name" required placeholder={t('namePlaceholder')} />
      </div>

      {/* Lender */}
      <div className="space-y-2">
        <Label htmlFor="lender">{t('lender')}</Label>
        <Input id="lender" name="lender" placeholder="KTC, SCB, ..." />
      </div>

      {/* Current balance */}
      <div className="space-y-2">
        <Label htmlFor="current_balance">{t('currentBalance')}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
            ฿
          </span>
          <Input
            id="current_balance"
            name="current_balance"
            type="text"
            inputMode="decimal"
            required
            defaultValue="0"
            className="pl-8"
          />
        </div>
      </div>

      {/* Original principal */}
      <div className="space-y-2">
        <Label htmlFor="original_principal">{t('originalPrincipal')}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
            ฿
          </span>
          <Input
            id="original_principal"
            name="original_principal"
            type="text"
            inputMode="decimal"
            required
            defaultValue="0"
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Interest rate */}
        <div className="space-y-2">
          <Label htmlFor="interest_rate">{t('interestRate')}</Label>
          <div className="relative">
            <Input
              id="interest_rate"
              name="interest_rate"
              type="text"
              inputMode="decimal"
              required
              defaultValue="0"
              className="pr-7"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              %
            </span>
          </div>
        </div>

        {/* Total term */}
        <div className="space-y-2">
          <Label htmlFor="total_term">{t('totalTerm')}</Label>
          <Input id="total_term" name="total_term" type="number" min="0" placeholder="60" />
        </div>
      </div>

      {/* Monthly payment */}
      <div className="space-y-2">
        <Label htmlFor="monthly_payment">{t('monthlyPayment')}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
            ฿
          </span>
          <Input
            id="monthly_payment"
            name="monthly_payment"
            type="text"
            inputMode="decimal"
            defaultValue="0"
            className="pl-8"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="start_date">{t('startDate')}</Label>
        <Input id="start_date" name="start_date" type="date" defaultValue={today} required />
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
