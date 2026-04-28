'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations, useLocale } from 'next-intl';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createDebt, updateDebt, deleteDebt } from '@/app/[locale]/(app)/debts/actions';
import { debtTypeConfig, debtTypes, type DebtType } from './debt-type-config';
import { DebtTypeFields } from './debt-type-fields';
import { cn } from '@/lib/utils';

interface DebtDefaults {
  id?: string;
  name?: string;
  type?: DebtType;
  lender?: string | null;
  current_balance?: number | string;
  original_principal?: number | string;
  interest_rate?: number | string;
  total_term?: number | null;
  remaining_term?: number | null;
  monthly_payment?: number | string | null;
  start_date?: string | null;
  rate_type?: string | null;
  lock_in_months?: number | null;
  promo_end_date?: string | null;
  post_promo_rate?: number | null;
  credit_limit?: number | null;
  statement_day?: number | null;
  due_day?: number | null;
}

type State = { error?: string } | null;

function SubmitBtn({ mode }: { mode: 'create' | 'edit' }) {
  const t = useTranslations('Debts.form');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? '...' : mode === 'create' ? t('submit') : t('save')}
    </Button>
  );
}

export function DebtForm({ defaults, mode }: { defaults?: DebtDefaults; mode: 'create' | 'edit' }) {
  const t = useTranslations('Debts.form');
  const tType = useTranslations('Debts.types');
  const locale = useLocale();
  const action = mode === 'create' ? createDebt : updateDebt;
  const [state, formAction] = useFormState<State, FormData>(action, null);

  const [type, setType] = useState<DebtType>(defaults?.type ?? 'credit_card');

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-5">
      {mode === 'edit' && defaults?.id && (
        <input type="hidden" name="id" value={defaults.id} />
      )}
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

      <div className="space-y-2">
        <Label htmlFor="name">{t('name')}</Label>
        <Input id="name" name="name" required defaultValue={defaults?.name ?? ''} placeholder={t('namePlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lender">{t('lender')}</Label>
        <Input id="lender" name="lender" defaultValue={defaults?.lender ?? ''} placeholder="KTC, SCB, ..." />
      </div>

      <DebtTypeFields type={type} isTh={locale === 'th'} />

      <div className="space-y-2">
        <Label htmlFor="current_balance">{t('currentBalance')}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">฿</span>
          <Input
            id="current_balance"
            name="current_balance"
            type="text"
            inputMode="decimal"
            required
            defaultValue={defaults?.current_balance != null ? String(defaults.current_balance) : '0'}
            className="pl-8"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="original_principal">{t('originalPrincipal')}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">฿</span>
          <Input
            id="original_principal"
            name="original_principal"
            type="text"
            inputMode="decimal"
            required
            defaultValue={defaults?.original_principal != null ? String(defaults.original_principal) : '0'}
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="interest_rate">{t('interestRate')}</Label>
          <div className="relative">
            <Input
              id="interest_rate"
              name="interest_rate"
              type="text"
              inputMode="decimal"
              required
              defaultValue={defaults?.interest_rate != null ? String(defaults.interest_rate) : '0'}
              className="pr-7"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="total_term">{t('totalTerm')}</Label>
          <Input
            id="total_term"
            name="total_term"
            type="number"
            min="0"
            defaultValue={defaults?.total_term ? String(defaults.total_term) : ''}
            placeholder="60"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="monthly_payment">{t('monthlyPayment')}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">฿</span>
          <Input
            id="monthly_payment"
            name="monthly_payment"
            type="text"
            inputMode="decimal"
            defaultValue={defaults?.monthly_payment != null ? String(defaults.monthly_payment) : '0'}
            className="pl-8"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="start_date">{t('startDate')}</Label>
        <Input
          id="start_date"
          name="start_date"
          type="date"
          defaultValue={defaults?.start_date ?? today}
          required
        />
      </div>

      {state?.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <SubmitBtn mode={mode} />

      {mode === 'edit' && defaults?.id && (
        <form action={deleteDebt}>
          <input type="hidden" name="id" value={defaults.id} />
          <Button
            type="submit"
            variant="ghost"
            size="lg"
            className="w-full text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('delete')}
          </Button>
        </form>
      )}
    </form>
  );
}
