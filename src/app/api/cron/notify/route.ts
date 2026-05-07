import { NextResponse } from 'next/server';
import { createClient as createSbClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Force dynamic + Node runtime (web-push needs Node, not Edge)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RecurringRow {
  id: string;
  user_id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  day_of_month: number;
  notify_days_before: number;
  last_run_on: string | null;
  last_notified_on: string | null;
  note: string | null;
  category?: { name: string; icon: string } | null;
}

interface PushSub {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function effectiveDay(year: number, month: number, day: number): string {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last)).toISOString().slice(0, 10);
}

function nextRunDate(dayOfMonth: number, lastRunOn: string | null, today = new Date()): string {
  const y = today.getFullYear();
  const m = today.getMonth();
  const todayStr = today.toISOString().slice(0, 10);
  const thisMonth = effectiveDay(y, m, dayOfMonth);
  if (!lastRunOn || lastRunOn < thisMonth) return thisMonth;
  return effectiveDay(y, m + 1, dayOfMonth);
}

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
}

export async function GET(req: Request) {
  // Auth: Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    return NextResponse.json({ error: 'vapid_not_configured' }, { status: 500 });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  // Service-role client to query across users
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createSbClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Pull every active recurring with notify_enabled
  const { data: rows, error } = await supabase
    .from('recurring_transactions')
    .select(`
      id, user_id, type, amount, day_of_month, notify_days_before,
      last_run_on, last_notified_on, note,
      category:categories(name, icon)
    `)
    .eq('is_active', true)
    .eq('notify_enabled', true);

  if (error) {
    console.error('cron query error', error);
    return NextResponse.json({ error: 'db' }, { status: 500 });
  }

  const due: RecurringRow[] = (rows ?? []).filter((r: any) => {
    const next = nextRunDate(r.day_of_month, r.last_run_on, today);
    const days = daysBetween(next, todayStr);
    return (
      days >= 0 &&
      days <= r.notify_days_before &&
      (!r.last_notified_on || r.last_notified_on < next)
    );
  }) as any;

  if (due.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, due: 0 });
  }

  // Group by user
  const byUser = new Map<string, RecurringRow[]>();
  for (const r of due) {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
    byUser.get(r.user_id)!.push(r);
  }

  let sent = 0;
  let failed = 0;

  for (const [userId, userRows] of byUser) {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .eq('user_id', userId);
    if (!subs || subs.length === 0) continue;

    for (const r of userRows) {
      const next = nextRunDate(r.day_of_month, r.last_run_on, today);
      const days = daysBetween(next, todayStr);
      const label =
        r.category?.name ??
        (r.type === 'income' ? 'รายรับ' : r.type === 'expense' ? 'รายจ่าย' : 'โอน');
      const whenTh =
        days === 0 ? 'วันนี้' : days === 1 ? 'พรุ่งนี้' : `อีก ${days} วัน`;
      const payload = JSON.stringify({
        title: 'Lumenfi · รายการประจำใกล้ถึงกำหนด',
        body: `${r.category?.icon ?? '🔔'} ${label} ฿${Number(r.amount).toLocaleString()} · ${whenTh}`,
        url: '/recurring',
        tag: `lumenfi-recurring-${r.id}`,
      });

      let anySent = false;
      for (const s of subs as PushSub[]) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            { TTL: 60 * 60 * 24 }
          );
          sent++;
          anySent = true;
        } catch (e: any) {
          failed++;
          if (e?.statusCode === 410 || e?.statusCode === 404) {
            // Subscription expired/removed — clean up
            await supabase.from('push_subscriptions').delete().eq('id', s.id);
          } else {
            console.error('push send failed', e?.statusCode, e?.body);
          }
        }
      }

      if (anySent) {
        await supabase
          .from('recurring_transactions')
          .update({ last_notified_on: next })
          .eq('id', r.id);
      }
    }
  }

  // === Daily expense reminders ===
  // Get current hour in Asia/Bangkok timezone
  const bkkNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const bkkHour = bkkNow.getHours();
  const bkkDateStr = bkkNow.toISOString().slice(0, 10);

  let remindersSent = 0;

  const { data: reminderProfiles } = await supabase
    .from('profiles')
    .select('id, reminder_enabled, reminder_hour, reminder_skip_if_logged, reminder_last_sent_on')
    .eq('reminder_enabled', true)
    .eq('reminder_hour', bkkHour);

  if (reminderProfiles && reminderProfiles.length > 0) {
    for (const p of reminderProfiles as any[]) {
      // Skip if already sent today
      if (p.reminder_last_sent_on === bkkDateStr) continue;

      // Skip if user already logged a transaction today (when option enabled)
      if (p.reminder_skip_if_logged) {
        const { count: txCount } = await supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', p.id)
          .gte('date', bkkDateStr)
          .lte('date', bkkDateStr);
        if ((txCount ?? 0) > 0) continue;
      }

      // Get push subscriptions
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', p.id);
      if (!subs || subs.length === 0) continue;

      const payload = JSON.stringify({
        title: 'Lumenfi · บันทึกค่าใช้จ่ายวันนี้',
        body: 'อย่าลืมบันทึกรายรับ-รายจ่ายวันนี้นะ — แตะเพื่อเพิ่มเลย',
        url: '/transactions/new',
        tag: 'lumenfi-daily-reminder',
      });

      let anySent = false;
      for (const s of subs as PushSub[]) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            { TTL: 60 * 60 * 4 }
          );
          remindersSent++;
          anySent = true;
        } catch (e: any) {
          if (e?.statusCode === 410 || e?.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', s.id);
          }
        }
      }

      if (anySent) {
        await supabase
          .from('profiles')
          .update({ reminder_last_sent_on: bkkDateStr })
          .eq('id', p.id);
      }
    }
  }


  // ─── Budget overspend alerts ─────────────────────────────
  let budgetAlertsSent = 0;
  try {
    const { data: usersWithBudgets } = await supabase
      .from('budgets')
      .select('user_id')
      .gt('amount', 0);
    const userIds = Array.from(new Set((usersWithBudgets ?? []).map((b) => b.user_id)));

    for (const uid of userIds) {
      const { getBudgetAlerts, formatBudgetMessage } = await import('@/lib/budget-alerts');
      const alerts = await getBudgetAlerts(uid);
      const overAlerts = alerts.filter((a) => a.status === 'over');
      if (overAlerts.length === 0) continue;

      // Only send if not already sent today
      const { data: lastAlertProfile } = await supabase
        .from('profiles')
        .select('budget_alert_last_sent_on')
        .eq('id', uid)
        .maybeSingle();
      if (lastAlertProfile?.budget_alert_last_sent_on === bkkDateStr) continue;

      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', uid);

      let anySent = false;
      const title = `⚠️ มี ${overAlerts.length} หมวดเกินงบ`;
      const body = overAlerts.slice(0, 3).map(formatBudgetMessage).join('\n').slice(0, 250);

      for (const s of (subs ?? [])) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title, body, url: '/budgets', icon: '/icons/icon-192.png' }),
            { TTL: 60 * 60 * 4 }
          );
          budgetAlertsSent++;
          anySent = true;
        } catch (e: any) {
          if (e?.statusCode === 410 || e?.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', s.id);
          }
        }
      }

      if (anySent) {
        await supabase
          .from('profiles')
          .update({ budget_alert_last_sent_on: bkkDateStr })
          .eq('id', uid);
      }
    }
  } catch (e) {
    console.warn('Budget alerts failed:', e);
  }


  // ─── Watchlist price alerts ─────────────────────────────
  let watchlistAlertsSent = 0;
  try {
    const { data: watchItems } = await supabase
      .from('investment_watchlist')
      .select('id, user_id, symbol, type, name, target_price, alert_above')
      .not('target_price', 'is', null);

    if (watchItems && watchItems.length > 0) {
      // Group by user for efficient processing
      const byUserW = new Map<string, any[]>();
      for (const w of watchItems) {
        if (!byUserW.has(w.user_id)) byUserW.set(w.user_id, []);
        byUserW.get(w.user_id)!.push(w);
      }

      for (const [userId, items] of byUserW) {
        // Check rate-limiting: only send max 1 alert batch per user per day
        const { data: profile } = await supabase
          .from('profiles')
          .select('watchlist_alert_last_sent_on')
          .eq('id', userId)
          .maybeSingle();
        if (profile?.watchlist_alert_last_sent_on === bkkDateStr) continue;

        const triggered: { symbol: string; current: number; target: number; above: boolean }[] = [];

        // Fetch current prices for each symbol
        for (const w of items) {
          let yfSym = w.symbol as string;
          if (w.type === 'thai_stock' && !yfSym.includes('.')) yfSym = `${yfSym}.BK`;
          if (w.type === 'crypto' && !yfSym.includes('-')) yfSym = `${yfSym}-USD`;
          try {
            const res = await fetch(
              `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=1d&range=1d`,
              { headers: { 'User-Agent': 'Mozilla/5.0' } }
            );
            if (!res.ok) continue;
            const data = await res.json();
            const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
            if (typeof price !== 'number') continue;

            const target = Number(w.target_price);
            const hit = w.alert_above ? price >= target : price <= target;

            // Save current price back
            await supabase
              .from('investment_watchlist')
              .update({ current_price: price, last_checked: new Date().toISOString() })
              .eq('id', w.id);

            if (hit) {
              triggered.push({
                symbol: w.symbol,
                current: price,
                target,
                above: w.alert_above,
              });
            }
          } catch { /* skip */ }
        }

        if (triggered.length === 0) continue;

        // Send notification
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('id, endpoint, p256dh, auth')
          .eq('user_id', userId);
        if (!subs || subs.length === 0) continue;

        const summary = triggered.length === 1
          ? `${triggered[0].symbol} ${triggered[0].above ? 'แตะ' : 'ลงถึง'} ฿${triggered[0].current.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
          : `${triggered.length} symbols ถึงเป้าแล้ว: ${triggered.slice(0, 3).map(t => t.symbol).join(', ')}${triggered.length > 3 ? '...' : ''}`;

        const payload = JSON.stringify({
          title: 'Lumenfi · 🔔 Watchlist alert',
          body: summary,
          url: '/investments/watchlist',
          tag: 'lumenfi-watchlist',
        });

        let anySent = false;
        for (const s of subs as PushSub[]) {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              payload,
              { TTL: 60 * 60 * 12 }
            );
            watchlistAlertsSent++;
            anySent = true;
          } catch (e: any) {
            if (e?.statusCode === 410 || e?.statusCode === 404) {
              await supabase.from('push_subscriptions').delete().eq('id', s.id);
            }
          }
        }

        if (anySent) {
          await supabase
            .from('profiles')
            .update({ watchlist_alert_last_sent_on: bkkDateStr })
            .eq('id', userId);
        }
      }
    }
  } catch (e) {
    console.warn('Watchlist alerts failed:', e);
  }

  return NextResponse.json({
    ok: true,
    due: due.length,
    sent,
    failed,
    users: byUser.size,
    remindersSent,
    budgetAlertsSent,
    watchlistAlertsSent,
    bkkHour,
  });
}
