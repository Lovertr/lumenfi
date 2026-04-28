'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const PERIODS = ['this_month', 'last_3', 'all'] as const;

export function AccountMovementFilters({
  accountId,
  period,
}: {
  accountId: string;
  period: string;
}) {
  const t = useTranslations('Accounts.periods');

  return (
    <div className="flex gap-2 overflow-x-auto rounded-xl border bg-muted/30 p-1">
      {PERIODS.map((p) => {
        const active = period === p || (p === 'this_month' && !period);
        return (
          <Link
            key={p}
            href={`/accounts/${accountId}?period=${p}`}
            className={cn(
              'flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-center text-xs font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/50'
            )}
          >
            {t(p)}
          </Link>
        );
      })}
    </div>
  );
}
