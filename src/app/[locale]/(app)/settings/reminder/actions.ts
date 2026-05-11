'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import webpush from 'web-push';

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

/**
 * Send a test push to the current user's registered devices.
 * Returns: { sent: number; total: number; reason?: string }
 */
export async function sendTestReminder(): Promise<{
  sent: number;
  total: number;
  reason?: string;
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { sent: 0, total: 0, reason: 'unauthorized' };

  // VAPID setup
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:tintanee.t@gmail.com';
  if (!publicKey || !privateKey) {
    return { sent: 0, total: 0, reason: 'vapid_not_configured' };
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', user.id);

  if (!subs || subs.length === 0) {
    return { sent: 0, total: 0, reason: 'no_subscriptions' };
  }

  const payload = JSON.stringify({
    title: '🔔 Lumenfi · ทดสอบการแจ้งเตือน',
    body: 'ระบบแจ้งเตือนทำงานปกติ — แตะเพื่อเปิดแอพ',
    url: '/transactions/new',
    tag: 'lumenfi-test-reminder',
  });

  let sent = 0;
  for (const s of subs as any[]) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 60 * 60 * 4 }
      );
      sent++;
    } catch (e: any) {
      // 410 = expired subscription, delete it
      if (e?.statusCode === 410 || e?.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', s.id);
      }
      console.warn('[reminder test] push failed:', e?.message ?? e);
    }
  }

  return { sent, total: subs.length };
}
