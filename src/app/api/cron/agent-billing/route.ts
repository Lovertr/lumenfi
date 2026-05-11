/**
 * Daily cron — expire ended agent subscriptions + send 7-day-before warnings.
 *
 * Schedule via Vercel cron (vercel.json) — runs once a day at 02:00 ICT.
 */
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { logNotification } from '@/lib/notifications';
import { sendLineNotify } from '@/lib/line/notify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CRON_SECRET = process.env.CRON_SECRET ?? '';

function authOk(req: Request): boolean {
  if (!CRON_SECRET) return true; // dev mode — allow
  const h = req.headers.get('authorization') ?? '';
  return h === `Bearer ${CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const svc = createServiceClient();
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 86400000);

  let expired = 0;
  let warned = 0;

  // 1) Expire subs whose period is over
  try {
    const { data: toExpire } = await svc
      .from('agent_subscriptions')
      .select('id, agent_id, plan, current_period_end')
      .eq('status', 'active')
      .lt('current_period_end', now.toISOString());

    for (const sub of (toExpire ?? []) as any[]) {
      await svc
        .from('agent_subscriptions')
        .update({ status: 'expired' })
        .eq('id', sub.id);
      expired++;

      // Find the agent's user_id to notify
      const { data: agent } = await svc
        .from('agents')
        .select('user_id, agent_name')
        .eq('id', sub.agent_id)
        .maybeSingle();
      if ((agent as any)?.user_id) {
        await logNotification({
          userId: (agent as any).user_id,
          type: 'system',
          severity: 'warn',
          title: '⏰ แพ็คเกจหมดอายุแล้ว',
          body: `แพ็คเกจ ${sub.plan} ของคุณหมดอายุ — ระบบหยุดรับ leads ใหม่ กดอัพเกรดเพื่อใช้งานต่อ`,
          url: '/agents/billing',
          icon: '⚠️',
          tag: 'agent-sub-expired',
        });
        // LINE Notify
        const { data: ag2 } = await svc
          .from('agents')
          .select('line_notify_token, line_notify_enabled')
          .eq('id', sub.agent_id)
          .maybeSingle();
        if ((ag2 as any)?.line_notify_enabled && (ag2 as any)?.line_notify_token) {
          sendLineNotify({
            token: (ag2 as any).line_notify_token,
            message: `\n⏰ Lumenfi — แพ็คเกจ ${sub.plan} ของคุณหมดอายุแล้ว\nกรุณาอัพเกรดเพื่อรับ leads ต่อ`,
          }).catch(() => {});
        }
      }
    }
  } catch (e) {
    console.error('[cron/agent-billing] expire failed:', e);
  }

  // 2) Warn agents whose sub ends within 7 days (and we haven't warned recently)
  try {
    const { data: ending } = await svc
      .from('agent_subscriptions')
      .select('id, agent_id, plan, current_period_end')
      .eq('status', 'active')
      .gte('current_period_end', now.toISOString())
      .lt('current_period_end', in7Days.toISOString());

    for (const sub of (ending ?? []) as any[]) {
      const { data: agent } = await svc
        .from('agents')
        .select('user_id, agent_name')
        .eq('id', sub.agent_id)
        .maybeSingle();
      if (!(agent as any)?.user_id) continue;

      // Avoid spamming — only notify if we haven't sent this tag in last 6 days
      const sixDaysAgo = new Date(now.getTime() - 6 * 86400000).toISOString();
      const { data: recent } = await svc
        .from('notifications')
        .select('id')
        .eq('user_id', (agent as any).user_id)
        .eq('tag', 'agent-sub-ending')
        .gte('created_at', sixDaysAgo)
        .limit(1)
        .maybeSingle();
      if (recent) continue;

      const daysLeft = Math.ceil(
        (new Date(sub.current_period_end).getTime() - now.getTime()) / 86400000
      );

      await logNotification({
        userId: (agent as any).user_id,
        type: 'system',
        severity: 'info',
        title: `🔔 แพ็คเกจใกล้หมดอายุ — เหลือ ${daysLeft} วัน`,
        body: `แพ็คเกจ ${sub.plan} จะหมดอายุใน ${daysLeft} วัน — ต่ออายุก่อนเพื่อไม่ให้ขาดช่วงรับ leads`,
        url: '/agents/billing',
        icon: '⏰',
        tag: 'agent-sub-ending',
      });
      // LINE Notify
      const { data: ag3 } = await svc
        .from('agents')
        .select('line_notify_token, line_notify_enabled')
        .eq('id', sub.agent_id)
        .maybeSingle();
      if ((ag3 as any)?.line_notify_enabled && (ag3 as any)?.line_notify_token) {
        sendLineNotify({
          token: (ag3 as any).line_notify_token,
          message: `\n⏰ Lumenfi — แพ็คเกจของคุณจะหมดอายุใน ${daysLeft} วัน\nต่ออายุก่อนเพื่อไม่ขาดช่วงรับ leads`,
        }).catch(() => {});
      }
      warned++;
    }
  } catch (e) {
    console.error('[cron/agent-billing] warn failed:', e);
  }

  return NextResponse.json({ ok: true, expired, warned });
}
