import { NextResponse } from 'next/server';
import { createClient as createSbClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Daily renewal reminder — 05:00 UTC (12:00 BKK).
 *
 * Finds active subscriptions whose current_period_end is 3 days away,
 * and sends the owner an email nudging them to renew via PromptPay.
 *
 * Idempotency: relies on the "3 days out" window being 1-day-wide, so
 * each subscription only matches once per period.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: true, skipped: 'no_resend_key' });
  }

  const supabase = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const now = Date.now();
  const day = 24 * 3600 * 1000;
  const windowStart = new Date(now + 2 * day).toISOString();
  const windowEnd = new Date(now + 3 * day).toISOString();

  // User subscriptions ending in 2-3 days
  const { data: userSubs } = await supabase
    .from('user_subscriptions')
    .select('user_id, plan_code, billing_cycle, current_period_end')
    .eq('status', 'active')
    .gte('current_period_end', windowStart)
    .lt('current_period_end', windowEnd);

  // Agent subscriptions ending in 2-3 days
  const { data: agentSubs } = await supabase
    .from('agent_subscriptions')
    .select('agent_id, plan, billing_cycle, current_period_end, agents!inner(user_id)')
    .eq('status', 'active')
    .gte('current_period_end', windowStart)
    .lt('current_period_end', windowEnd);

  const targets: Array<{
    userId: string;
    kind: 'user' | 'agent';
    planCode: string;
    cycle: string;
    periodEnd: string;
  }> = [];

  for (const s of userSubs ?? []) {
    targets.push({
      userId: s.user_id,
      kind: 'user',
      planCode: s.plan_code,
      cycle: s.billing_cycle ?? 'monthly',
      periodEnd: s.current_period_end,
    });
  }
  for (const s of agentSubs ?? []) {
    const agentRow = (s as any).agents;
    const uid = Array.isArray(agentRow) ? agentRow[0]?.user_id : agentRow?.user_id;
    if (!uid) continue;
    targets.push({
      userId: uid,
      kind: 'agent',
      planCode: 'agent_' + s.plan,
      cycle: s.billing_cycle === 'annual' ? 'yearly' : 'monthly',
      periodEnd: s.current_period_end,
    });
  }

  if (targets.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  // Fetch emails
  const userIds = Array.from(new Set(targets.map((t) => t.userId)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .in('id', userIds);
  const emailMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    if (p.email) emailMap.set(p.id, p.email);
  }

  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.RESEND_FROM ?? 'noreply@lumenfi.projectostech.com';
  let sent = 0;

  for (const t of targets) {
    const email = emailMap.get(t.userId);
    if (!email) continue;

    // Map plan_code to renewal URL
    let renewalPath: string;
    if (t.planCode.startsWith('agent_')) {
      renewalPath = `/subscription/checkout/${t.planCode}?cycle=${t.cycle}`;
    } else {
      renewalPath = `/subscription/checkout/pro?cycle=${t.cycle}`;
    }
    const renewalUrl = 'https://lumenfi.projectostech.com/th' + renewalPath;

    const daysLeft = Math.round(
      (new Date(t.periodEnd).getTime() - now) / day
    );
    const label = t.kind === 'agent' ? 'Agent ' + t.planCode.replace('agent_', '') : 'Lumenfi Pro';

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + resendKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [email],
          subject: `⏰ ${label} หมดอายุใน ${daysLeft} วัน — ต่ออายุด่วน`,
          text: [
            `${label} ของคุณจะหมดอายุใน ${daysLeft} วัน`,
            ``,
            `รอบปัจจุบันสิ้นสุด: ${new Date(t.periodEnd).toLocaleDateString('th-TH')}`,
            ``,
            `ต่ออายุที่ลิงก์นี้ (โอน PromptPay + slip):`,
            renewalUrl,
            ``,
            `หากไม่ต่ออายุ ระบบจะ downgrade เป็น Free อัตโนมัติเมื่อหมดรอบ`,
          ].join('\n'),
        }),
      });
      sent++;
    } catch (e) {
      console.warn('[renewal-reminder] email failed for', email, e);
    }
  }

  return NextResponse.json({ ok: true, targets: targets.length, sent });
}
