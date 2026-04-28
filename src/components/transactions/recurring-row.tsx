'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Pause, Play, Trash2, Pencil, TrendingDown, TrendingUp, Target as TargetIcon, Wallet } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toggleRecurring, deleteRecurring } from '@/app/[locale]/(app)/transactions/actions';
import { formatTHB } from '@/lib/utils';

interface Recurring {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  day_of_month: number;
  is_active: boolean;
  last_run_on: string | null;
  note: string | null;
  account: { name: string; color: string } | null;
  category: { name: string; icon: string; color: string } | null;
  goal: { name: string; icon: string | null } | null;
}

export function RecurringRow({ r, nextDate }: { r: Recurring; nextDate: string }) {
  const t = useTranslations('Recurring');
  const locale = useLocale();
  const isExpense = r.type === 'expense';

  const next = new Date(nextDate);
  const nextLabel = next.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-lg">
          {r.category?.icon ?? (isExpense ? '💸' : '💰')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">
              {r.category?.name ?? (isExpense ? t('expense') : t('income'))}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                isExpense ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
              }`}
            >
              {isExpense ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              {isExpense ? t('expense') : t('income')}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Wallet className="h-3 w-3" />
              {r.account?.name ?? '—'}
            </span>
            {r.goal && (
              <span className="inline-flex items-center gap-1 text-primary">
                <TargetIcon className="h-3 w-3" />
                {r.goal.icon} {r.goal.name}
              </span>
            )}
            <span>· {t('everyDay', { day: r.day_of_month })}</span>
            <span>· {t('next')}: {nextLabel}</span>
          </div>
          {r.note && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{r.note}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`text-sm font-bold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
            {isExpense ? '-' : '+'}{formatTHB(Number(r.amount))}
          </span>
          <Button asChild size="icon" variant="ghost" className="h-8 w-8" aria-label={t('edit')}>
            <Link href={`/recurring/${r.id}/edit`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <form action={toggleRecurring}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="is_active" value={(!r.is_active).toString()} />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label={r.is_active ? t('pause') : t('resume')}
            >
              {r.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </form>
          <form action={deleteRecurring}>
            <input type="hidden" name="id" value={r.id} />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              aria-label={t('delete')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
