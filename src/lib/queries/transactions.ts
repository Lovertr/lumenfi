import { createClient } from '@/lib/supabase/server';

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  account_id: string;
  category_id: string | null;
  date: string;
  note: string | null;
  photo_url: string | null;
  // Joined
  category?: { name: string; icon: string; color: string } | null;
  account?: { name: string; color: string } | null;
}

export async function getRecentTransactions(limit = 50): Promise<Transaction[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('transactions')
      .select(
        'id, type, amount, account_id, category_id, date, note, photo_url, ' +
          'category:categories(name, icon, color), ' +
          'account:accounts(name, color)'
      )
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('getRecentTransactions:', error.message);
      return [];
    }
    // Normalize: Supabase join may return single object or array — flatten to object
    const normalized = (data ?? []).map((row: any) => ({
      ...row,
      category: Array.isArray(row.category) ? row.category[0] ?? null : row.category,
      account: Array.isArray(row.account) ? row.account[0] ?? null : row.account,
    }));
    return normalized as Transaction[];
  } catch {
    return [];
  }
}

export async function getMonthlyTotals(): Promise<{
  income: number;
  expense: number;
  balance: number;
}> {
  try {
    const supabase = createClient();
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount')
      .gte('date', start.toISOString());

    if (error || !data) return { income: 0, expense: 0, balance: 0 };

    let income = 0;
    let expense = 0;
    for (const t of data as { type: string; amount: number }[]) {
      const amt = Number(t.amount);
      if (t.type === 'income') income += amt;
      if (t.type === 'expense') expense += amt;
    }
    return { income, expense, balance: income - expense };
  } catch {
    return { income: 0, expense: 0, balance: 0 };
  }
}

export async function getTopCategories(limit = 5): Promise<
  Array<{ name: string; icon: string; color: string; amount: number }>
> {
  try {
    const supabase = createClient();
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, category:categories(name, icon, color)')
      .eq('type', 'expense')
      .gte('date', start.toISOString());

    if (error || !data) return [];

    const map = new Map<string, { name: string; icon: string; color: string; amount: number }>();
    for (const t of (data as any[]) ?? []) {
      // category from join — could be object or array depending on Supabase
      const cat = Array.isArray(t.category) ? t.category[0] : t.category;
      if (!cat) continue;
      const key = cat.name as string;
      const amt = Number(t.amount);
      const existing = map.get(key);
      if (existing) {
        existing.amount += amt;
      } else {
        map.set(key, {
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          amount: amt,
        });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  } catch {
    return [];
  }
}
