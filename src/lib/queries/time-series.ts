// ─────────────────────────────────────────────────────────
// Income/Expense time series — flexible granularity (day/week/month)
// ─────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';

export type Granularity = 'day' | 'week' | 'month';

export interface TimeSeriesPoint {
  bucket: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function bucketKey(dateStr: string, granularity: Granularity): string {
  const d = new Date(dateStr);
  if (granularity === 'day') {
    return isoDate(d);
  }
  if (granularity === 'week') {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    return isoDate(monday);
  }
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

export async function getIncomeExpenseTimeSeries(
  granularity: Granularity,
  fromDate: string,
  toDate: string,
  locale = 'th'
): Promise<TimeSeriesPoint[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: txs } = await supabase
    .from('transactions')
    .select('type, amount, date')
    .eq('user_id', user.id)
    .gte('date', fromDate)
    .lte('date', toDate)
    .in('type', ['income', 'expense'])
    .order('date');

  const buckets = new Map<string, { income: number; expense: number }>();

  // Pre-fill empty buckets
  const start = new Date(fromDate);
  const end = new Date(toDate);
  const prefillBuckets = generateBuckets(start, end, granularity);
  for (const b of prefillBuckets) {
    buckets.set(b, { income: 0, expense: 0 });
  }

  for (const t of txs ?? []) {
    const key = bucketKey(t.date as string, granularity);
    if (!buckets.has(key)) buckets.set(key, { income: 0, expense: 0 });
    const cur = buckets.get(key)!;
    const amt = Number(t.amount ?? 0);
    if (t.type === 'income') cur.income += amt;
    else if (t.type === 'expense') cur.expense += amt;
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
