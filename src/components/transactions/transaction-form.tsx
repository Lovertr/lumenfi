'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTransaction } from '@/app/[locale]/(app)/transactions/actions';
import { cn } from '@/lib/utils';
import {
  TrendingDown, TrendingUp, ArrowLeftRight, Repeat, Target, ArrowDown, Bell,
} from 'lucide-react';

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
interface Goal {
  id: string;
  name: string;
  icon: string | null;
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

function AccountPicker({
  accounts,
  value,
  onChange,
  excludeId,
}: {
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
  excludeId?: string;
}) {
  const list = excludeId ? accounts.filter((a) => a.id !== excludeId) : accounts;
  return (
    <div className="grid grid-cols-2 gap-2">
      {list.map((acc) => {
        const active = value === acc.id;
        return (
          <button
            key={acc.id}
            type="button"
            onClick={() => onChange(acc.id)}
            className={cn(
              'rounded-lg border-2 px-3 py-2.5 text-left transition-all',
              active
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background hover:border-primary/40'
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: acc.color }}
              />
              <div className="text-sm font-medium truncate">{acc.name}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function TransactionForm({
  accounts,
  categories,
  goals = [],
}: {
  accounts: Account[];
  categories: Category[];
  goals?: Goal[];
}) {
  const t = useTranslations('Transactions');
  const tForm = useTranslations('Transactions.form');
  const tErr = useTranslations('Transactions.errors');
  const [state, action] = useFormState<State, FormData>(createTransaction, null);

  const [type, setType] = useState<Type>('expense');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [goalId, setGoalId] = useState('');
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [notifyDays, setNotifyDays] = useState(1);

  const today = new Date().toISOString().slice(0, 10);
  const filteredCategories = categories.filter(
    (c) => c.type === type || c.type === 'both'
  );
  const isTransfer = type === 'transfer';

  if (isTransfer && toAccountId === accountId) {
    const alt = accounts.find((a) => a.id !== accountId);
    if (alt && alt.id !== toAccountId) {
      setToAccountId(alt.id);
    }
  }

  return (
    <form action={action} className="space-y-5">
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

      {!isTransfer && (
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

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tErr('no_accounts')}</p>
      ) : isTransfer ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {tForm('fromAccount')}
            </Label>
            <input type="hidden" name="account_id" value={accountId} />
            <AccountPicker
              accounts={accounts}
              value={accountId}
              onChange={setAccountId}
              excludeId={toAccountId}
            />
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
            <AccountPicker
              accounts={accounts}
              value={toAccountId}
              onChange={setToAccountId}
              excludeId={accountId}
            />
          </div>
          {accounts.length < 2 && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {tErr('transfer_need_two_accounts')}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label>{tForm('account')}</Label>
          <input type="hidden" name="account_id" value={accountId} />
          <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="date">{tForm('date')}</Label>
        <Input id="date" name="date" type="date" defaultValue={today} required />
      </div>

      {/* Goal link — now also for transfers */}
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
        <Input id="note" name="note" placeholder={tForm('notePlaceholder')} maxLength={500} />
      </div>

      {/* Recurring — now available for all types including transfer */}
      <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
        <label className="flex cursor-pointer items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Repeat className="h-4 w-4 text-primary" />
            {tForm('saveAsRecurring')}
          </span>
          <input
            type="checkbox"
            name="is_recurring"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-5 w-5 rounded border-input accent-primary"
          />
        </label>
        {isRecurring && (
          <div className="space-y-3 pt-1">
            <div className="space-y-2">
              <Label htmlFor="day_of_month" className="text-xs">
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
              <p className="text-[11px] text-muted-foreground">{tForm('recurringHint')}</p>
            </div>

            {/* Notification settings */}
            <div className="space-y-2 rounded-lg border bg-background p-3">
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
              {notifyEnabled && (
                <p className="text-[11px] text-muted-foreground">{tForm('notifyHint')}</p>
              )}
            </div>
          </div>
        )}
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
