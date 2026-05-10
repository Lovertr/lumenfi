import { createClient } from '@/lib/supabase/server';

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  icon: string;
  color: string;
}

async function ensureDebtPaymentCategory(
  supabase: ReturnType<typeof createClient>,
  userId: string
) {
  try {
    await supabase.from('categories').insert({
      user_id: userId,
      name: 'ชำระหนี้',
      type: 'expense',
      icon: '💳',
      color: '#dc2626',
      archived: false,
    });
  } catch {
    // ignore — most likely a unique-constraint hit, which is fine
  }
}

/**
 * Get user's categories. Auto-seeds default categories on first call if user has none.
 * Also ensures the ชำระหนี้ (debt-payment) category exists.
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, type, icon, color')
      .eq('archived', false)
      .order('name');

    if (error) {
      console.warn('getCategories:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      const seedResult = await supabase.rpc('seed_default_categories', { p_user_id: user.id });
      if (!seedResult.error) {
        await ensureDebtPaymentCategory(supabase, user.id);
        const { data: seeded } = await supabase
          .from('categories')
          .select('id, name, type, icon, color')
          .eq('archived', false)
          .order('name');
        return (seeded as Category[]) ?? [];
      }
    }

    const hasDebtPayment = (data ?? []).some(
      (c) => c.name === 'ชำระหนี้' || c.name === 'Debt Payment'
    );
    if (!hasDebtPayment) {
      await ensureDebtPaymentCategory(supabase, user.id);
      const { data: refreshed } = await supabase
        .from('categories')
        .select('id, name, type, icon, color')
        .eq('archived', false)
        .order('name');
      return (refreshed as Category[]) ?? (data as Category[]) ?? [];
    }

    return (data as Category[]) ?? [];
  } catch {
    return [];
  }
}

export async function getCategoriesByType(type: 'income' | 'expense'): Promise<Category[]> {
  const all = await getCategories();
  return all.filter((c) => c.type === type || c.type === 'both');
}
