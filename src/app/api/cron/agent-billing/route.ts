/**
 * Daily cron — expire ended agent subscriptions + send 7-day-before warnings.
 *
 * Schedule via Vercel cron (vercel.json) — runs once a day at 02:00 ICT.
 */
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { logNotification } from '@/lib/notifications';
import { sendLineNotify } from '@/lib/line/notify';
import { createCharge, isOmiseConfigured } from '@/lib/billing/omise';

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

  // 3) Auto-renew — find subs ending in 1-3 days with auto_renew=true, attempt charge
  let renewed = 0;
  let renewFailed = 0;
  if (isOmiseConfigured()) {
    const in1Day = new Date(now.getTime() + 1 * 86400000);
    const in3Days = new Date(now.getTime() + 3 * 86400000);
    try {
      const { data: toRenew } = await svc
        .from('agent_subscriptions')
        .select('id, agent_id, plan, billing_cycle, monthly_amount, omise_customer_id, charge_retry_count')
        .eq('status', 'active')
        .eq('auto_renew', true)
        .gte('current_period_end', in1Day.toISOString())
        .lt('current_period_end', in3Days.toISOString())
        .not('omise_customer_id', 'is', null);

      for (const sub of (toRenew ?? []) as any[]) {
        if ((sub.charge_retry_count ?? 0) >= 3) continue; // hard stop after 3 retries

        const monthlyAmt = Number(sub.monthly_amount ?? 0);
        const amountThb = sub.billing_cycle === 'annual' ? monthlyAmt * 12 : monthlyAmt;
        if (amountThb <= 0) continue;

        const periodDays = sub.billing_cycle === 'annual' ? 365 : 30;
        const newPeriodEnd = new Date(now.getTime() + periodDays * 86400000);

        try {
          const charge = await createCharge({
            amount: amountThb * 100,
            currency: 'thb',
            description: `Lumenfi Agent ${sub.plan} renewal (${sub.billing_cycle})`,
            customer: sub.omise_customer_id,
            metadata: {
              tx_type: 'agent_renewal',
              agent_id: sub.agent_id,
              sub_id: sub.id,
              plan_code: sub.plan,
            },
          });

          if (charge.status === 'successful') {
            // Extend period, reset retry counter
            await svc
              .from('agent_subscriptions')
              .update({
                current_period_start: now.toISOString(),
                current_period_end: newPeriodEnd.toISOString(),
                charge_retry_count: 0,
                last_charge_failure_at: null,
                omise_subscription_id: charge.id,
              })
              .eq('id', sub.id);

            await svc.from('payment_transactions').insert({
              user_id: null,
              type: 'agent_subscription',
              amount_thb: amountThb,
              plan_code: sub.plan,
              billing_cycle: sub.billing_cycle,
              payment_provider: 'omise',
              provider_charge_id: charge.id,
              provider_customer_id: sub.omise_customer_id,
              status: 'succeeded',
              metadata: { agent_id: sub.agent_id, renewal: true },
            });

            // Notify agent
            const { data: agent } = await svc
              .from('agents')
              .select('user_id, line_notify_token, line_notify_enabled')
              .eq('id', sub.agent_id)
              .maybeSingle();
            if ((agent as any)?.user_id) {
              await logNotification({
                userId: (agent as any).user_id,
                type: 'system',
                severity: 'success',
                title: '✓ ต่ออายุแพ็คเกจสำเร็จ',
                body: `แพ็คเกจ ${sub.plan} ของคุณได้รับการต่ออายุอัตโนมัติ ฿${amountThb.toLocaleString('th-TH')} — ใช้งานได้ต่อ ${periodDays} วัน`,
                url: '/agents/billing',
                icon: '✅',
                tag: 'agent-renewed',
              });
              if ((agent as any).line_notify_enabled && (agent as any).line_notify_token) {
                sendLineNotify({
                  token: (agent as any).line_notify_token,
                  message: `\n✅ Lumenfi — ต่ออายุ ${sub.plan} สำเร็จ ฿${amountThb.toLocaleString('th-TH')}\nใช้งานได้ต่ออีก ${periodDays} วัน`,
                }).catch(() => {});
              }
            }
            renewed++;
          } else {
            // charge not successful (3DS expired, declined, etc.)
            await svc
              .from('agent_subscriptions')
              .update({
                charge_retry_count: (sub.charge_retry_count ?? 0) + 1,
                last_charge_failure_at: now.toISOString(),
              })
              .eq('id', sub.id);
            renewFailed++;
          }
        } catch (e: any) {
          console.warn('[cron/agent-billing] renew charge failed', sub.id, e?.message);
          await svc
            .from('agent_subscriptions')
            .update({
              charge_retry_count: (sub.charge_retry_count ?? 0) + 1,
              last_charge_failure_at: now.toISOString(),
            })
            .eq('id', sub.id);

          // Notify agent of failure
          const { data: agent } = await svc
            .from('agents')
            .select('user_id, line_notify_token, line_notify_enabled')
            .eq('id', sub.agent_id)
            .maybeSingle();
          if ((agent as any)?.user_id) {
            await logNotification({
              userId: (agent as any).user_id,
              type: 'system',
              severity: 'warn',
              title: '⚠️ ตัดบัตรไม่สำเร็จ',
              body: `ระบบไม่สามารถต่ออายุแพ็คเกจ ${sub.plan} ได้ — กรุณาตรวจสอบบัตรหรือเปลี่ยนบัตรใหม่`,
              url: '/agents/billing',
              icon: '⚠️',
              tag: 'agent-renew-failed',
            });
            if ((agent as any).line_notify_enabled && (agent as any).line_notify_token) {
              sendLineNotify({
                token: (agent as any).line_notify_token,
                message: `\n⚠️ Lumenfi — ตัดบัตรไม่สำเร็จ\nแพ็คเกจ ${sub.plan} ใกล้หมดอายุ กรุณาเปลี่ยนบัตรในแอพ`,
              }).catch(() => {});
            }
          }
          renewFailed++;
        }
      }
    } catch (e) {
      console.error('[cron/agent-billing] renew failed:', e);
    }
  }

  return NextResponse.json({ ok: true, expired, warned, renewed, renewFailed });
}
