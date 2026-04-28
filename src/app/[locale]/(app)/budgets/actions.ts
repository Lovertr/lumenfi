'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function setBudget(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const categoryId = formData.get('category_id') as string;
  const amountStr = (formData.get('amount') as string)?.replace(/,/g, '') ?? '0';
  const amount = parseFloat(amountStr);
  if (!categoryId || isNaN(amount)) return;

  if (amount === 0) {
    await supabase
      .from('budgets')
      .delete()
      .eq('user_id', user.id)
      .eq('category_id', categoryId);
  } else {
    await supabase
      .from('budgets')
      .upsert(
        {
          user_id: user.id,
          category_id: categoryId,
          amount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,category_id' }
      );
  }

  revalidatePath('/budgets');
  revalidatePath('/dashboard');
}

export async function deleteBudget(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = formData.get('id') as string;
  if (!id) return;

  await supabase.from('budgets').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/budgets');
}
