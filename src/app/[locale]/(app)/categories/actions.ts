'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['income', 'expense', 'both']),
  icon: z.string().min(1).max(8),
  color: z.string().default('#3B82F6'),
});

export async function createCategory(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const parsed = createSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    icon: formData.get('icon') || '💰',
    color: formData.get('color') || '#3B82F6',
  });

  if (!parsed.success) {
    return { error: 'invalid_data' as const };
  }

  const { error } = await supabase.from('categories').insert({
    ...parsed.data,
    user_id: user.id,
    is_default: false,
  });

  if (error) {
    console.error('createCategory:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/categories');
  redirect('/categories');
}

export async function deleteCategory(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  await supabase.from('categories').update({ archived: true }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/categories');
}
