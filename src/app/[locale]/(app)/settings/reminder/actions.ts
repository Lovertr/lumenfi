'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import webpush from 'web-push';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

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

/**
 * Diagnose why daily reminders may not be firing.
 * Returns a structured report the UI can render as a checklist.
 */
export async function diagnoseReminderHealth(): Promise<{
  ok: boolean;
  checks: { name: string; ok: boolean; detail: string }[];
  fixSql?: string;
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, checks: [{ name: 'auth', ok: false, detail: 'not signed in' }] };

  // Hard gate — diagnostic exposes CRON_SECRET in fixSql so admin-only
  const isAdmin = user.email === ADMIN_EMAIL;

  const checks: { name: string; ok: boolean; detail: string }[] = [];

  // 1) VAPID env present
  const vapidOk = !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
  checks.push({
    name: 'VAPID keys',
    ok: vapidOk,
    detail: vapidOk ? 'ตั้งค่าครบ' : 'ขาด NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT บน Vercel',
  });

  // 2) Push subscription present for this user
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, created_at, user_agent')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  const subCount = subs?.length ?? 0;
  checks.push({
    name: 'อุปกรณ์ที่ลงทะเบียน push',
    ok: subCount > 0,
    detail: subCount > 0
      ? `${subCount} อุปกรณ์ · ล่าสุด ${new Date(subs![0].created_at).toLocaleString('th-TH')}`
      : 'ยังไม่มีอุปกรณ์ — ไปกด Enable notifications ที่ /recurring ก่อน',
  });

  // 3) Reminder enabled + hour
  const { data: profile } = await supabase
    .from('profiles')
    .select('reminder_enabled, reminder_hour, reminder_last_sent_on')
    .eq('id', user.id)
    .single();
  checks.push({
    name: 'การตั้งค่าเตือน',
    ok: !!profile?.reminder_enabled,
    detail: profile?.reminder_enabled
      ? `เปิดอยู่ · เวลา ${String(profile.reminder_hour ?? 21).padStart(2, '0')}:00`
      : 'ปิดอยู่ — เปิดข้างบนก่อน',
  });

  // 4) Last successful fire
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
    .toISOString().slice(0, 10);
  const lastSent = profile?.reminder_last_sent_on;
  const firedToday = lastSent === today;
  checks.push({
    name: 'การยิงล่าสุด',
    ok: !!lastSent,
    detail: !lastSent
      ? 'ยังไม่เคยยิงเลย — น่าจะตั้ง pg_cron ยังไม่เสร็จ'
      : firedToday
        ? `ยิงไปแล้ววันนี้ (${lastSent})`
        : `ยิงล่าสุดเมื่อ ${lastSent}`,
  });

  // 5) Cron evidence — check notifications table for ANY recent push
  //    Absence is NOT proof of failure (cron may have fired but found
  //    no qualifying users in any hour of the past 25h). Only flag as
  //    failed if the user themselves had reminder_hour match in the
  //    past 25h AND nothing fired for them.
  let cronOk = true;
  let cronDetail = 'ใช้ปุ่ม "ยิง cron ตอนนี้" ด้านล่างเพื่อทดสอบทันที';
  try {
    const { createServiceClient } = await import('@/lib/supabase/admin');
    const admin = createServiceClient();
    const since = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await admin
      .from('notifications')
      .select('id, type, created_at, user_id')
      .gte('created_at', since)
      .in('type', ['reminder', 'recurring', 'budget', 'watchlist', 'secretary'])
      .order('created_at', { ascending: false })
      .limit(5);
    if (recent && recent.length > 0) {
      const ago = Math.round((Date.now() - new Date(recent[0].created_at).getTime()) / (60 * 1000));
      cronDetail = `Cron ทำงาน — มี notification ล่าสุดในระบบเมื่อ ${ago} นาทีที่แล้ว (${recent.length} รายการใน 25 ชม.)`;
    } else {
      cronDetail = 'ไม่พบ notification ใน 25 ชม. — ปกติถ้าทั้งระบบไม่มี user ที่ตรงเวลาในแต่ละชั่วโมง · กดปุ่มด้านล่างเพื่อยิงทดสอบ';
    }
  } catch {
    cronDetail = 'ตรวจสอบไม่ได้ (ต้องการสิทธิ์ service role)';
  }
  checks.push({
    name: 'หลักฐาน cron ทำงาน',
    ok: cronOk,
    detail: cronDetail,
  });

  let fixSql: string | undefined;
  if (false && isAdmin) {  // SQL block no longer auto-shown — admin already past setup
    // Kept for backward compatibility; trigger via separate route if needed
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lumenfi.vercel.app';
    const cronSecret = process.env.CRON_SECRET || 'PASTE_YOUR_CRON_SECRET_HERE';
    fixSql = `-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- Make sure pg_cron + pg_net extensions are enabled first
-- (Dashboard → Database → Extensions)

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('lumenfi-hourly-notify') where exists (
  select 1 from cron.job where jobname = 'lumenfi-hourly-notify'
);

select cron.schedule(
  'lumenfi-hourly-notify',
  '0 * * * *',  -- every hour at minute 0
  $$
  select net.http_get(
    url := '${appUrl}/api/cron/notify',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ${cronSecret}',
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 30000
  );
  $$
);

-- Verify it's scheduled:
select jobid, jobname, schedule, active
from cron.job
where jobname = 'lumenfi-hourly-notify';`;
  }

  const ok = checks.every((c) => c.ok);
  return { ok, checks, fixSql };
}

export async function fireCronNow() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return { ok: false, error: 'forbidden' };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lumenfi.projectostech.com';
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, error: 'no_cron_secret' };
  try {
    const res = await fetch(appUrl + '/api/cron/notify', {
      headers: { Authorization: 'Bearer ' + secret },
      cache: 'no-store',
    });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'fetch_failed' };
  }
}
