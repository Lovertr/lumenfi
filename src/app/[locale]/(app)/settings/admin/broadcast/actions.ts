'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import webpush from 'web-push';
import { logNotification } from '@/lib/notifications';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

export async function sendBroadcastPush(_prev: unknown, formData: FormData): Promise<{
  ok: boolean;
  sent?: number;
  failed?: number;
  totalSubs?: number;
  error?: string;
}> {
  // Auth — only ADMIN_EMAIL allowed
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };
  if (user.email !== ADMIN_EMAIL) return { ok: false, error: 'forbidden' };

  const title = (formData.get('title') as string)?.trim();
  const body = (formData.get('body') as string)?.trim();
  const url = (formData.get('url') as string)?.trim() || '/';
  const tag = (formData.get('tag') as string)?.trim() || `broadcast-${Date.now()}`;

  if (!title || !body) return { ok: false, error: 'missing_fields' };

  // VAPID config
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    return { ok: false, error: 'vapid_not_configured' };
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const admin = createServiceClient();
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, user_id');

  if (!subs || subs.length === 0) {
    return { ok: true, sent: 0, failed: 0, totalSubs: 0 };
  }

  const payload = JSON.stringify({ title, body, url, tag });
  let sent = 0;
  let failed = 0;
  // Track per-user success so we log notification once per user
  const userResults = new Map<string, boolean>();

  for (const s of subs as any[]) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 60 * 60 * 24 }
      );
      sent++;
      userResults.set(s.user_id, true);
    } catch (e: any) {
      failed++;
      if (!userResults.has(s.user_id)) userResults.set(s.user_id, false);
      if (e?.statusCode === 410 || e?.statusCode === 404) {
        await admin.from('push_subscriptions').delete().eq('id', s.id);
      }
    }
  }

  // Log in-app notification for every targeted user
  // Also log for users without push subs so they see it in the bell
  const { data: allUsers } = await admin.from('profiles').select('id');
  for (const u of allUsers ?? []) {
    const userId = (u as any).id;
    const succeeded = userResults.get(userId);
    await logNotification({
      userId,
      type: 'broadcast',
      severity: 'info',
      title,
      body,
      url,
      tag,
      sentAsPush: succeeded === true,
      pushDeliveryStatus: succeeded === true ? 'sent' : succeeded === false ? 'failed' : 'no_subscription',
    });
  }

  return { ok: true, sent, failed, totalSubs: subs.length };
}
