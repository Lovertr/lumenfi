'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateRecurring, deleteRecurring } from '@/app/[locale]/(app)/transactions/actions';
import { cn } from '@/lib/utils';
import {
  TrendingDown, TrendingUp, ArrowLeftRight, Repeat, Target, ArrowDown, Bell, Trash2,
} from 'lucide-react';

interface Account { id: string; name: string; type: string; color: string; }
interface Category { id: string; name: string; type: 'income' | 'expense' | 'both'; icon: string; color: string; }
interface Goal { id: string; name: string; icon: string | null; }
interface RecurringDefaults {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  goal_id: string | null;
  day_of_month: number;
  note: string | null;
  is_active: boolean;
  notify_enabled: boolean;
  notify_days_before: number;
}

type State = { error?: string } | null;

function SubmitBtn() {
  const t = useTranslations('Recurring');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? '...' : t('save')}
    </Button>
  );
}

export function RecurringEditForm({
  defaults,
  accounts,
  categories,
  goals,
}: {
  defaults: RecurringDefaults;
  accounts: Account[];
  categories: Category[];
  goals: Goal[];
}) {
  const t = useTranslations('Transactions');
  const tForm = useTranslations('Transactions.form');
  const tRec = useTranslations('Recurring');
  const [state, action] = useFormState<State, FormData>(updateRecurring, null);

  const [type] = useState(defaults.type); // type is locked on edit
  const [accountId, setAccountId] = useState(defaults.account_id);
  const [toAccountId, setToAccountId] = useState(defaults.to_account_id ?? accounts[1]?.id ?? '');
  const [categoryId, setCategoryId] = useState(defaults.category_id ?? '');
  const [goalId, setGoalId] = useState(defaults.goal_id ?? '');
  const [dayOfMonth, setDayOfMonth] = useState(defaults.day_of_month);
  const [notifyEnabled, setNotifyEnabled] = useState(defaults.notify_enabled);
  const [notifyDays, setNotifyDays] = useState(defaults.notify_days_before);

  const filteredCategories = categories.filter((c) => c.type === type || c.type === 'both');
  const isTransfer = type === 'transfer';

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={defaults.id} />
      <input type="hidden" name="type" value={type} />

      <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        {tRec('typeLockHint')} —{' '}
        <span className="font-semibold">
          {type === 'income' ? t('income') : type === 'expense' ? t('expense') : t('transfer')}
        </span>{' '}
        ({tRec('createNewIfChange')})
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">{tForm('amount')}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">฿</span>
          <Input
            id="amount"
            name="amount"
            type="text"
            inputMode="decimal"
            required
            defaultValue={String(defaults.amount)}
            className="pl-8 text-xl font-bold"
          />
        </div>
      </div>

      {!isTransfer && filteredCategories.length > 0 && (
        <div className="space-y-2">
          <Label>{tForm('category')}</Label>
          <input type="hidden" name="category_id" value={categoryId} />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {filteredCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 transition-all',
                  categoryId === cat.id ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                )}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-medium leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isTransfer ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {tForm('fromAccount')}
            </Label>
            <input type="hidden" name="account_id" value={accountId} />
            <div className="grid grid-cols-2 gap-2">
              {accounts.filter((a) => a.id !== toAccountId).map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setAccountId(acc.id)}
                  className={cn(
                    'rounded-lg border-2 px-3 py-2.5 text-left transition-all',
                    accountId === acc.id ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: acc.color }} />
                    <div className="text-sm font-medium truncate">{acc.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-muted/50">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {tForm('toAccount')}
            </Label>
            <input type="hidden" name="to_account_id" value={toAccountId} />
            <div className="grid grid-cols-2 gap-2">
              {accounts.filter((a) => a.id !== accountId).map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setToAccountId(acc.id)}
                  className={cn(
                    'rounded-lg border-2 px-3 py-2.5 text-left transition-all',
                    toAccountId === acc.id ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: acc.color }} />
                    <div className="text-sm font-medium truncate">{acc.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>{tForm('account')}</Label>
          <input type="hidden" name="account_id" value={accountId} />
          <div className="grid grid-cols-2 gap-2">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setAccountId(acc.id)}
                className={cn(
                  'rounded-lg border-2 px-3 py-2.5 text-left transition-all',
                  accountId === acc.id ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: acc.color }} />
                  <div className="text-sm font-medium truncate">{acc.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="day_of_month" className="flex items-center gap-1.5">
          <Repeat className="h-4 w-4 text-primary" />
          {tForm('dayOfMonth')}
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{tForm('everyMonthOn')}</span>
          <Input
            id="day_of_month"
            name="day_of_month"
            type="number"
            min={1}
            max={31}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
            className="h-9 w-20 text-center"
          />
          <span className="text-xs text-muted-foreground">{tForm('ofEachMonth')}</span>
        </div>
      </div>

      {goals.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Target className="h-4 w-4 text-primary" />
            {tForm('linkGoal')}
          </Label>
          <input type="hidden" name="goal_id" value={goalId} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setGoalId('')}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                !goalId ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:bg-muted/40'
              )}
            >
              {tForm('noGoal')}
            </button>
            {goals.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoalId(g.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  goalId === g.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:bg-muted/40'
                )}
              >
                {g.icon && <span>{g.icon}</span>}
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="note">{tForm('note')}</Label>
        <Input id="note" name="note" defaultValue={defaults.note ?? ''} maxLength={500} />
      </div>

      <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
        <label className="flex cursor-pointer items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4 text-amber-600" />
            {tForm('notifyMe')}
          </span>
          <input
            type="checkbox"
            name="notify_enabled"
            checked={notifyEnabled}
            onChange={(e) => setNotifyEnabled(e.target.checked)}
            className="h-5 w-5 rounded border-input accent-primary"
          />
        </label>
        {notifyEnabled && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">{tForm('notifyDaysBefore')}</span>
            <Input
              name="notify_days_before"
              type="number"
              min={0}
              max={14}
              value={notifyDays}
              onChange={(e) => setNotifyDays(Math.min(14, Math.max(0, parseInt(e.target.value) || 0)))}
              className="h-9 w-16 text-center"
            />
            <span className="text-xs text-muted-foreground">{tForm('daysBeforeUnit')}</span>
          </div>
        )}
      </div>

      {state?.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <SubmitBtn />

      <form action={deleteRecurring}>
        <input type="hidden" name="id" value={defaults.id} />
        <Button
          type="submit"
          variant="ghost"
          size="lg"
          className="w-full text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {tRec('delete')}
        </Button>
      </form>
    </form>
  );
}
