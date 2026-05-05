'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function saveReminderSettings(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const enabled = formData.get('reminder_enabled') === 'on';
  const hourStr = (formData.get('reminder_hour') as string) || '21';
  const hour = Math.min(23, Math.max(0, parseInt(hourStr, 10) || 21));
  const skipIfLogged = formData.get('reminder_skip_if_logged') === 'on';

  await supabase
    .from('profiles')
    .update({
      reminder_enabled: enabled,
      reminder_hour: hour,
      reminder_skip_if_logged: skipIfLogged,
    })
    .eq('id', user.id);

  revalidatePath('/settings/reminder');
  revalidatePath('/settings');
}
