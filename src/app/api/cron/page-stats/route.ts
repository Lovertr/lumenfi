import { NextResponse } from 'next/server';
import { createClient as createSbClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * FB Page-level stats poller — daily cron.
 * Pulls page_fans (total followers), impressions, engaged users.
 * Stores each day's snapshot in fb_page_stats.
 */

const PAGE_ID = '153033261562809';  // Lumenfi FB Page

const METRICS = [
  'page_fans',
  'page_fan_adds',
  'page_impressions',
  'page_engaged_users',
].join(',');

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: true, skipped: 'no_token' });
  }

  try {
    // page_fans = day-based lifetime metric, others = day period
    const url = `https://graph.facebook.com/v19.0/${PAGE_ID}/insights?metric=${METRICS}&period=day&access_token=${token}`;
    const res = await fetch(url, { cache: 'no-store' });
    const body = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(body?.error ?? body));

    const out: Record<string, number> = {};
    for (const item of body.data ?? []) {
      const val = Number(item.values?.[item.values.length - 1]?.value ?? 0);
      if (item.name === 'page_fans') out.page_fans = val;
      else if (item.name === 'page_fan_adds') out.page_new_fans = val;
      else if (item.name === 'page_impressions') out.page_impressions = val;
      else if (item.name === 'page_engaged_users') out.page_engaged_users = val;
    }

    const supabase = createSbClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    await supabase.from('fb_page_stats').insert({
      page_id: PAGE_ID,
      page_fans: out.page_fans ?? null,
      page_impressions: out.page_impressions ?? null,
      page_engaged_users: out.page_engaged_users ?? null,
      page_new_fans: out.page_new_fans ?? null,
    });

    return NextResponse.json({ ok: true, ...out });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[cron/page-stats]', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
