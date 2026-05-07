'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  symbol: z.string().min(1).max(20),
  type: z.enum([
    'thai_stock', 'foreign_stock', 'mutual_fund', 'etf', 'crypto', 'gold', 'reit', 'other',
  ]),
  name: z.string().nullable().optional(),
  target_price: z.number().min(0).nullable().optional(),
  alert_above: z.boolean().default(true),
  note: z.string().nullable().optional(),
});

export async function addToWatchlist(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const num = (key: string) => {
    const v = (formData.get(key) as string) ?? '';
    const n = parseFloat(v.replace(/,/g, ''));
    return isFinite(n) ? n : 0;
  };

  const parsed = schema.safeParse({
    symbol: ((formData.get('symbol') as string) ?? '').trim().toUpperCase(),
    type: formData.get('type'),
    name: (formData.get('name') as string) || null,
    target_price: num('target_price') || null,
    alert_above: formData.get('alert_above') === 'true',
    note: (formData.get('note') as string) || null,
  });

  if (!parsed.success) return { error: 'invalid_data' as const };

  // Try to fetch current price
  let currentPrice: number | null = null;
  try {
    const sym = parsed.data.symbol;
    const t = parsed.data.type;
    let yfSym = sym;
    if (t === 'thai_stock' && !sym.includes('.')) yfSym = `${sym}.BK`;
    if (t === 'crypto' && !sym.includes('-')) yfSym = `${sym}-USD`;
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=1d&range=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (res.ok) {
      const data = await res.json();
      const p = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (typeof p === 'number') currentPrice = p;
    }
  } catch { /* ignore */ }

  const { error } = await supabase.from('investment_watchlist').insert({
    user_id: user.id,
    ...parsed.data,
    current_price: currentPrice,
    last_checked: new Date().toISOString(),
  });

  if (error) {
    console.error('addToWatchlist:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/investments/watchlist');
  redirect('/investments/watchlist');
}

export async function removeFromWatchlist(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = formData.get('id') as string;
  if (!id) return;

  await supabase.from('investment_watchlist').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/investments/watchlist');
}

export async function refreshWatchlistPrices() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, updated: 0 };

  const { data: items } = await supabase
    .from('investment_watchlist')
    .select('id, symbol, type')
    .eq('user_id', user.id);

  let updated = 0;
  for (const w of items ?? []) {
    let yfSym = w.symbol as string;
    if (w.type === 'thai_stock' && !yfSym.includes('.')) yfSym = `${yfSym}.BK`;
    if (w.type === 'crypto' && !yfSym.includes('-')) yfSym = `${yfSym}-USD`;
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=1d&range=1d`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 600 },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (typeof price === 'number') {
        await supabase.from('investment_watchlist').update({
          current_price: price,
          last_checked: new Date().toISOString(),
        }).eq('id', w.id).eq('user_id', user.id);
        updated++;
      }
    } catch { /* skip */ }
  }

  revalidatePath('/investments/watchlist');
  return { ok: true, updated };
}
