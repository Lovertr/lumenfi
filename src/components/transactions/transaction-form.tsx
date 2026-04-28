'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTransaction } from '@/app/[locale]/(app)/transactions/actions';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, ArrowLeftRight } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  type: string;
  color: string;
}
interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  icon: string;
  color: string;
}

type Type = 'expense' | 'income' | 'transfer';
type State = { error?: string } | null;

function SubmitBtn() {
  const t = useTranslations('Transactions.form');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? t('submitting') : t('submit')}
    </Button>
  );
}

export function TransactionForm({
  accounts,
  categories,
}: {
  accounts: Account[];
  categories: Category[];
}) {
  const t = useTranslations('Transactions');
  const tForm = useTranslations('Transactions.form');
  const tErr = useTranslations('Transactions.errors');
  const [state, action] = useFormState<State, FormData>(createTransaction, null);

  const [type, setType] = useState<Type>('expense');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const filteredCategories = categories.filter(
    (c) => c.type === type || c.type === 'both'
  );

  return (
    <form action={action} className="space-y-5">
      {/* Type tabs */}
      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-3 gap-2 rounded-xl border bg-muted/40 p-1">
        {([
          { v: 'expense', label: t('expense'), icon: TrendingDown, color: 'text-red-600 bg-red-50' },
          { v: 'income', label: t('income'), icon: TrendingUp, color: 'text-green-600 bg-green-50' },
          { v: 'transfer', label: t('transfer'), icon: ArrowLeftRight, color: 'text-blue-600 bg-blue-50' },
        ] as const).map((tab) => {
          const Icon = tab.icon;
          const active = type === tab.v;
          return (
            <button
              key={tab.v}
              type="button"
              onClick={() => setType(tab.v)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? `${tab.color} shadow-sm` : 'text-muted-foreground hover:bg-background'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">{tForm('amount')}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
            ฿
          </span>
          <Input
            id="amount"
            name="amount"
            type="text"
            inputMode="decimal"
            required
            autoFocus
            placeholder="0.00"
            className="pl-8 text-xl font-bold"
          />
        </div>
      </div>

      {/* Category — only show for income/expense */}
      {type !== 'transfer' && (
        <div className="space-y-2">
          <Label>{tForm('category')}</Label>
          <input type="hidden" name="category_id" value={categoryId} />
          {filteredCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tErr('no_categories')}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {filteredCategories.map((cat) => {
                const active = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 transition-all',
                      active
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background hover:border-primary/40'
                    )}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-xs font-medium leading-tight">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Account */}
      <div className="space-y-2">
        <Label>{tForm('account')}</Label>
        <input type="hidden" name="account_id" value={accountId} />
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tErr('no_accounts')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {accounts.map((acc) => {
              const active = accountId === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setAccountId(acc.id)}
                  className={cn(
                    'rounded-lg border-2 px-3 py-2.5 text-left transition-all',
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background hover:border-primary/40'
                  )}
                >
                  <div className="text-sm font-medium truncate">{acc.name}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">{tForm('date')}</Label>
        <Input id="date" name="date" type="date" defaultValue={today} required />
      </div>

      {/* Note */}
      <div className="space-y-2">
        <Label htmlFor="note">{tForm('note')}</Label>
        <Input id="note" name="note" placeholder={tForm('notePlaceholder')} maxLength={500} />
      </div>

      {state?.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {tErr(state.error)}
        </div>
      )}

      <SubmitBtn />
    </form>
  );
}
