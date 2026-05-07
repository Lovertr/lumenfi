// ─────────────────────────────────────────────────────────
// Income/Expense time series — flexible granularity (day/week/month)
// ─────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';

export type Granularity = 'day' | 'week' | 'month';

export interface TimeSeriesPoint {
  /** ISO start date of the bucket (day for day, Monday for week, 1st for month) */
  bucket: string;
  /** Display label */
  label: string;
  income: number;
  expense: number;
  net: number;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Bucket key based on granularity
function bucketKey(dateStr: string, granularity: Granularity): string {
  const d = new Date(dateStr);
  if (granularity === 'day') {
    return isoDate(d);
  }
  if (granularity === 'week') {
    // ISO Monday-based week — find Monday of that date
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    return isoDate(monday);
  }
  // month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function bucketLabel(bucketIso: string, granularity: Granularity, locale = 'th'): string {
  const d = new Date(bucketIso);
  if (granularity === 'day') {
    return d.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  }
  if (granularity === 'week') {
    return d.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  }
  return d.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
    month: 'short',
    year: '2-digit',
  });
}

/**
 * Build time series of income/expense by bucket.
 * @param granularity day | week | month
 * @param months  number of months to look back (e.g. 3, 6, 12, 36, 60)
 */
export async function getIncomeExpenseTimeSeries(
  granularity: Granularity,
  months: number,
  locale = 'th'
): Promise<TimeSeriesPoint[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const since = new Date();
  since.setMonth(since.getMonth() - months);
  since.setHours(0, 0, 0, 0);
  const sinceStr = isoDate(since);

  const { data: txs } = await supabase
    .from('transactions')
    .select('type, amount, date')
    .eq('user_id', user.id)
    .gte('date', sinceStr)
    .in('type', ['income', 'expense'])
    .order('date');

  const buckets = new Map<string, { income: number; expense: number }>();

  // Pre-fill empty buckets so the chart shows zeros for periods with no data
  const prefillBuckets = generateBuckets(since, new Date(), granularity);
  for (const b of prefillBuckets) {
    buckets.set(b, { income: 0, expense: 0 });
  }

  for (const t of txs ?? []) {
    const key = bucketKey(t.date as string, granularity);
    const cur = buckets.get(key) ?? { income: 0, expense: 0 };
    const amt = Number(t.amount ?? 0);
    if (t.type === 'income') cur.income += amt;
    else if (t.type === 'expense') cur.expense += amt;
    buckets.set(key, cur);
  }

  const sortedKeys = Array.from(buckets.keys()).sort();
  return sortedKeys.map((k) => {
    const v = buckets.get(k)!;
    return {
      bucket: k,
      label: bucketLabel(k, granularity, locale),
      income: v.income,
      expense: v.expense,
      net: v.income - v.expense,
    };
  });
}

function generateBuckets(start: Date, end: Date, granularity: Granularity): string[] {
  const out: string[] = [];
  const cur = new Date(start);
  if (granularity === 'day') {
    while (cur <= end) {
      out.push(isoDate(cur));
      cur.setDate(cur.getDate() + 1);
    }
  } else if (granularity === 'week') {
    const day = cur.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    cur.setDate(cur.getDate() + diff);
    while (cur <= end) {
      out.push(isoDate(cur));
      cur.setDate(cur.getDate() + 7);
    }
  } else {
    cur.setDate(1);
    while (cur <= end) {
      out.push(isoDate(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  return out;
}
