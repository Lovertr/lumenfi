'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const txSchema = z.object({
  investment_id: z.string().uuid(),
  type: z.enum(['buy', 'sell', 'transfer_in', 'transfer_out']),
  quantity: z.number().min(0),
  price_per_unit: z.number().min(0),
  fee: z.number().min(0).default(0),
  date: z.string(),
  note: z.string().nullable().optional(),
});

export async function createInvestmentTransaction(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const num = (key: string) => {
    const v = (formData.get(key) as string) ?? '';
    const n = parseFloat(v.replace(/,/g, ''));
    return isFinite(n) ? n : 0;
  };

  const investment_id = formData.get('investment_id') as string;
  const parsed = txSchema.safeParse({
    investment_id,
    type: formData.get('type'),
    quantity: num('quantity'),
    price_per_unit: num('price_per_unit'),
    fee: num('fee'),
    date: formData.get('date'),
    note: (formData.get('note') as string) || null,
  });

  if (!parsed.success) {
    return { error: 'invalid_data' as const };
  }

  const data = parsed.data;

  // Fetch the investment to compute realized P/L on sells + update avg_cost on buys
  const { data: inv } = await supabase
    .from('investments')
    .select('id, quantity, avg_cost')
    .eq('id', investment_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!inv) return { error: 'not_found' as const };

  const oldQty = Number(inv.quantity);
  const oldAvg = Number(inv.avg_cost);
  const oldCost = oldQty * oldAvg;

  let newQty = oldQty;
  let newAvg = oldAvg;
  let realized_pl: number | null = null;

  if (data.type === 'buy' || data.type === 'transfer_in') {
    // Update avg cost using weighted average
    newQty = oldQty + data.quantity;
    const addCost = data.quantity * data.price_per_unit + data.fee;
    newAvg = newQty > 0 ? (oldCost + addCost) / newQty : 0;
  } else if (data.type === 'sell' || data.type === 'transfer_out') {
    newQty = Math.max(0, oldQty - data.quantity);
    // Realized P/L = (sell_price - avg_cost) * qty - fee
    if (data.type === 'sell') {
      realized_pl = (data.price_per_unit - oldAvg) * data.quantity - data.fee;
    }
    // avg cost unchanged on partial sell
  }

  // Insert transaction
  const { error: txError } = await supabase.from('investment_transactions').insert({
    user_id: user.id,
    investment_id: data.investment_id,
    type: data.type,
    quantity: data.quantity,
    price_per_unit: data.price_per_unit,
    fee: data.fee,
    date: data.date,
    note: data.note,
    realized_pl,
  });

  if (txError) {
    console.error('createInvestmentTransaction:', txError);
    return { error: 'generic' as const };
  }

  // Update investment qty + avg_cost
  await supabase
    .from('investments')
    .update({
      quantity: newQty,
      avg_cost: newAvg,
      updated_at: new Date().toISOString(),
    })
    .eq('id', investment_id)
    .eq('user_id', user.id);

  revalidatePath('/investments');
  revalidatePath(`/investments/${investment_id}`);
  redirect(`/investments/${investment_id}`);
}

export async function deleteInvestmentTransaction(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = formData.get('id') as string;
  const investment_id = formData.get('investment_id') as string;
  if (!id) return;

  await supabase
    .from('investment_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath(`/investments/${investment_id}`);
}
