'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function markAllRead() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);
  revalidatePath('/notifications');
  revalidatePath('/dashboard');
}

export async function markRead(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);
  revalidatePath('/notifications');
  revalidatePath('/dashboard');
}

export async function deleteNotification(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('notifications').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/notifications');
  revalidatePath('/dashboard');
}

export async function deleteAllRead() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id)
    .not('read_at', 'is', null);
  revalidatePath('/notifications');
}
