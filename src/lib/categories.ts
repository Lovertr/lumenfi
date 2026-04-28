import { createClient } from '@/lib/supabase/server';

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  icon: string;
  color: string;
}

/**
 * Get user's categories. Auto-seeds default categories on first call if user has none.
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

    // Auto-seed defaults if no categories yet
    if (!data || data.length === 0) {
      const seedResult = await supabase.rpc('seed_default_categories', { p_user_id: user.id });
      if (!seedResult.error) {
        const { data: seeded } = await supabase
          .from('categories')
          .select('id, name, type, icon, color')
          .eq('archived', false)
          .order('name');
        return (seeded as Category[]) ?? [];
      }
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
