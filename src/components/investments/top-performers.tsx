'use client';

import { Link } from '@/i18n/routing';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { HoldingMetric } from '@/lib/queries/portfolio';
import { formatTHB } from '@/lib/utils';

export function TopPerformers({ gainers, losers }: { gainers: HoldingMetric[]; losers: HoldingMetric[] }) {
  if (gainers.length === 0 && losers.length === 0) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {gainers.length > 0 && (
        <div className="rounded-2xl border bg-emerald-50/50 p-4 lg:p-5">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <TrendingUp className="h-3.5 w-3.5" />
            ทำกำไรสูงสุด
          </div>
          <div className="space-y-1.5">
            {gainers.map((h) => (
              <Link key={h.id} href={`/investments/${h.id}/edit`} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/60">
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{h.symbol ?? h.name}</span>
                <span className="shrink-0 font-semibold text-emerald-700">+{h.plPercent.toFixed(1)}%</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{formatTHB(h.pl)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {losers.length > 0 && (
        <div className="rounded-2xl border bg-rose-50/50 p-4 lg:p-5">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-rose-700">
            <TrendingDown className="h-3.5 w-3.5" />
            ขาดทุนหนักสุด
          </div>
          <div className="space-y-1.5">
            {losers.map((h) => (
              <Link key={h.id} href={`/investments/${h.id}/edit`} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/60">
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{h.symbol ?? h.name}</span>
                <span className="shrink-0 font-semibold text-rose-700">{h.plPercent.toFixed(1)}%</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{formatTHB(h.pl)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
