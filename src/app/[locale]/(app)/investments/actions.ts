'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  symbol: z.string().nullable().optional(),
  type: z.enum([
    'thai_stock',
    'foreign_stock',
    'mutual_fund',
    'etf',
    'crypto',
    'gold',
    'reit',
    'property',
    'bond',
    'fixed_deposit',
    'lottery_savings',
    'other',
  ]),
  broker_account: z.string().nullable().optional(),
  quantity: z.number().min(0),
  avg_cost: z.number().min(0),
  current_price: z.number().min(0).nullable().optional(),
  currency: z.string().default('THB'),
  is_tax_saving: z.boolean().default(false),
  tax_fund_type: z.enum(['rmf', 'ssf', 'ssfx', 'pvd', 'gpf']).nullable().optional(),
  lock_in_until: z.string().nullable().optional(),
  goal_id: z.string().uuid().nullable().optional(),
});

export async function createInvestment(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const num = (key: string) => parseFloat((formData.get(key) as string) ?? '0');

  const parsed = createSchema.safeParse({
    name: formData.get('name'),
    symbol: formData.get('symbol') || null,
    type: formData.get('type'),
    broker_account: formData.get('broker_account') || null,
    quantity: num('quantity'),
    avg_cost: num('avg_cost'),
    current_price: num('current_price') || null,
    currency: formData.get('currency') || 'THB',
    is_tax_saving: formData.get('is_tax_saving') === 'true',
    tax_fund_type: (formData.get('tax_fund_type') as string) || null,
    lock_in_until: (formData.get('lock_in_until') as string) || null,
    goal_id: (formData.get('goal_id') as string) || null,
  });

  if (!parsed.success) {
    return { error: 'invalid_data' as const };
  }

  const { error } = await supabase.from('investments').insert({
    ...parsed.data,
    user_id: user.id,
  });

  if (error) {
    console.error('createInvestment:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/investments');
  redirect('/investments');
}

export async function deleteInvestment(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  await supabase.from('investments').update({ archived: true }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/investments');
}

// ─────────────────────────────────────────────────────────
// Update + Delete
// ─────────────────────────────────────────────────────────

export async function updateInvestment(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = formData.get('id') as string;
  if (!id) return { error: 'invalid_data' as const };

  const num = (key: string) => {
    const v = (formData.get(key) as string) ?? '';
    const n = parseFloat(v.replace(/,/g, ''));
    return isFinite(n) ? n : 0;
  };

  const { error } = await supabase
    .from('investments')
    .update({
      name: ((formData.get('name') as string) ?? '').trim(),
      symbol: ((formData.get('symbol') as string) ?? '').trim() || null,
      type: formData.get('type'),
      broker_account: ((formData.get('broker_account') as string) ?? '').trim() || null,
      quantity: num('quantity'),
      avg_cost: num('avg_cost'),
      current_price: num('current_price') || null,
      currency: (formData.get('currency') as string) || 'THB',
      goal_id: (formData.get('goal_id') as string) || null,
      is_tax_saving: formData.get('is_tax_saving') === 'true',
      tax_fund_type: (formData.get('tax_fund_type') as string) || null,
      lock_in_until: (formData.get('lock_in_until') as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('updateInvestment:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/investments');
  redirect('/investments');
}

// ─────────────────────────────────────────────────────────
// Refresh prices using Yahoo Finance / fallback to manual
// ─────────────────────────────────────────────────────────

export async function refreshInvestmentPrices() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, updated: 0 };

  const { data: items } = await supabase
    .from('investments')
    .select('id, symbol, type, current_price')
    .eq('user_id', user.id)
    .not('symbol', 'is', null);

  let updated = 0;
  for (const inv of items ?? []) {
    if (!inv.symbol) continue;
    const price = await fetchYahooPrice(String(inv.symbol), inv.type as string);
    if (price && price > 0) {
      await supabase
        .from('investments')
        .update({ current_price: price, updated_at: new Date().toISOString() })
        .eq('id', inv.id)
        .eq('user_id', user.id);
      updated++;
    }
  }

  revalidatePath('/investments');
  return { ok: true, updated };
}

async function fetchYahooPrice(symbol: string, type: string): Promise<number | null> {
  try {
    let yfSymbol = symbol;
    if (type === 'thai_stock' && !symbol.includes('.')) yfSymbol = `${symbol}.BK`;
    if (type === 'crypto' && !symbol.includes('-')) yfSymbol = `${symbol}-USD`;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === 'number' ? price : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Fetch historical price data for chart display
// ─────────────────────────────────────────────────────────

type Range = '1mo' | '3mo' | '6mo' | '1y' | '5y';

export async function fetchPriceHistory(
  symbol: string,
  type: string,
  range: Range = '6mo',
): Promise<{ ok: boolean; data: { date: string; close: number }[]; error?: string }> {
  if (!symbol) return { ok: false, data: [], error: 'no_symbol' };
  try {
    let yfSymbol = symbol;
    if (type === 'thai_stock' && !symbol.includes('.')) yfSymbol = `${symbol}.BK`;
    if (type === 'crypto' && !symbol.includes('-')) yfSymbol = `${symbol}-USD`;

    const interval = range === '5y' ? '1wk' : '1d';

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      yfSymbol,
    )}?interval=${interval}&range=${range}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return { ok: false, data: [], error: 'fetch_failed' };
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const timestamps: number[] | undefined = result?.timestamp;
    const closes: (number | null)[] | undefined = result?.indicators?.quote?.[0]?.close;
    if (!timestamps || !closes) return { ok: false, data: [], error: 'no_data' };

    const series = timestamps
      .map((t, i) => ({
        date: new Date(t * 1000).toISOString().slice(0, 10),
        close: closes[i],
      }))
      .filter((p): p is { date: string; close: number } => typeof p.close === 'number')
      .map(p => ({ date: p.date, close: Number(p.close.toFixed(2)) }));

    return { ok: true, data: series };
  } catch (e: any) {
    console.error('fetchPriceHistory:', e?.message);
    return { ok: false, data: [], error: 'error' };
  }
}
