'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateAccount, deleteAccount } from '@/app/[locale]/(app)/accounts/actions';
import { accountTypeConfig, accountTypes, type AccountType } from './account-type-config';
import { AccountFormFields, AccountNoteField } from './account-form-fields';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#0F172A',
];

interface ExistingAccount {
  id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  color: string;
  credit_limit: number | null;
  include_in_net_worth: boolean;
  bank_name?: string | null;
  account_number?: string | null;
  account_holder?: string | null;
  note?: string | null;
  statement_day?: number | null;
  due_day?: number | null;
}

type State = { error?: string } | null;

function SubmitBtn() {
  const t = useTranslations('Accounts.form');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? t('submitting') : t('submit')}
    </Button>
  );
}

export function EditAccountForm({ account }: { account: ExistingAccount }) {
  const t = useTranslations('Accounts.form');
  const tType = useTranslations('Accounts.types');
  const tErr = useTranslations('Accounts.errors');
  const [state, formAction] = useFormState<State, FormData>(updateAccount, null);
  const [selectedType, setSelectedType] = useState<AccountType>(account.type);
  const [selectedColor, setSelectedColor] = useState(account.color);

  const isCreditCard = selectedType === 'credit_card';

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="id" value={account.id} />

        <div className="space-y-2">
          <Label>{t('type')}</Label>
          <input type="hidden" name="type" value={selectedType} />
          <div className="grid grid-cols-3 gap-2">
            {accountTypes.map((type) => {
              const cfg = accountTypeConfig[type];
              const Icon = cfg.icon;
              const isActive = selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all',
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background hover:border-primary/40'
                  )}
                >
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', cfg.bg, cfg.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium">{tType(type)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">{t('name')}</Label>
          <Input id="name" name="name" required defaultValue={account.name} />
        </div>

        <AccountFormFields
          type={selectedType}
          defaults={{
            bank_name: account.bank_name,
            account_number: account.account_number,
            account_holder: account.account_holder,
            statement_day: account.statement_day,
            due_day: account.due_day,
          }}
        />

        <div className="space-y-2">
          <Label htmlFor="initial_balance">{t('initialBalance')}</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
              ฿
            </span>
            <Input
              id="initial_balance"
              name="initial_balance"
              type="text"
              inputMode="decimal"
              required
              defaultValue={Number(account.initial_balance).toString()}
              className="pl-8 text-lg font-bold"
            />
          </div>
          <p className="text-xs text-muted-foreground">{t('initialBalanceHint')}</p>
        </div>

        {isCreditCard && (
          <div className="space-y-2">
            <Label htmlFor="credit_limit">{t('creditLimit')}</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
                ฿
              </span>
              <Input
                id="credit_limit"
                name="credit_limit"
                type="text"
                inputMode="decimal"
                defaultValue={account.credit_limit ?? '0'}
                className="pl-8"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>{t('color')}</Label>
          <input type="hidden" name="color" value={selectedColor} />
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                className={cn(
                  'h-8 w-8 rounded-full border-2 transition-all',
                  selectedColor === c ? 'border-foreground scale-110' : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <AccountNoteField defaultValue={account.note} />

        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <Label htmlFor="include_in_net_worth" className="cursor-pointer">
            {t('includeInNetWorth')}
          </Label>
          <input
            id="include_in_net_worth"
            name="include_in_net_worth"
            type="checkbox"
            defaultChecked={account.include_in_net_worth}
            className="h-5 w-5 rounded border-input accent-primary"
          />
        </div>

        {state?.error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {tErr(state.error)}
          </div>
        )}

        <SubmitBtn />
      </form>

      <form action={deleteAccount}>
        <input type="hidden" name="id" value={account.id} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="w-full text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
          ลบบัญชี / Delete
        </Button>
      </form>
    </div>
  );
}
