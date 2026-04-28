'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const baseSchema = z.object({
  name: z.string().min(1).max(100),
  target_amount: z.number().positive(),
  current_amount: z.number().min(0).default(0),
  deadline: z.string().nullable().optional(),
  is_emergency_fund: z.boolean().default(false),
  color: z.string().default('#10B981'),
  icon: z.string().default('🎯'),
});

function parseGoalForm(formData: FormData) {
  const target = parseFloat((formData.get('target_amount') as string) ?? '0');
  const current = parseFloat((formData.get('current_amount') as string) ?? '0');

  return baseSchema.safeParse({
    name: formData.get('name'),
    target_amount: target,
    current_amount: isNaN(current) ? 0 : current,
    deadline: (formData.get('deadline') as string) || null,
    is_emergency_fund: formData.get('is_emergency_fund') === 'on',
    color: formData.get('color') || '#10B981',
    icon: formData.get('icon') || '🎯',
  });
}

export async function createGoal(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const parsed = parseGoalForm(formData);
  if (!parsed.success) {
    return { error: 'invalid_data' as const };
  }

  const { error } = await supabase.from('goals').insert({
    ...parsed.data,
    user_id: user.id,
  });

  if (error) {
    console.error('createGoal:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/goals');
  redirect('/goals');
}

export async function updateGoal(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = formData.get('id') as string;
  if (!id) return { error: 'invalid_data' as const };

  const parsed = parseGoalForm(formData);
  if (!parsed.success) {
    return { error: 'invalid_data' as const };
  }

  const { error } = await supabase
    .from('goals')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('updateGoal:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/goals');
  revalidatePath('/dashboard');
  redirect('/goals');
}

export async function deleteGoal(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  await supabase.from('goals').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/goals');
  revalidatePath('/dashboard');
  redirect('/goals');
}
