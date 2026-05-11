'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getRouteForUser } from '@/lib/agents/queries';
import { createServiceClient } from '@/lib/supabase/admin';
import { sendLineNotify } from '@/lib/line/notify';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FALLBACK_NOTIFY = process.env.AGENT_NOTIFY_EMAIL ?? 'tintanee.t@gmail.com';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Lumenfi <onboarding@resend.dev>';

async function sendLeadEmail(
  to: string,
  agentDisplayName: string,
  lead: {
    name: string;
    phone: string;
    email: string | null;
    type: string;
    preferredCarrier: string | null;
    estimatedSumInsured: number | null;
    message: string | null;
    userEmail: string | null;
  }
) {
  if (!RESEND_API_KEY) {
    console.log('[Lead] No RESEND_API_KEY — would have sent to', to, lead);
    return { ok: false, reason: 'no_email_provider' };
  }

  const subject = `🔔 ลีดประกันใหม่: ${lead.name} (${lead.type})`;
  const html = `
    <h2>มีลูกค้าขอใบเสนอประกัน</h2>
    <p style="color: #555;">ตัวแทน: <strong>${escape(agentDisplayName)}</strong></p>
    <table style="border-collapse: collapse; font-family: system-ui, sans-serif;">
      <tr><td style="padding: 6px 12px; font-weight: bold;">ชื่อ:</td><td style="padding: 6px 12px;">${escape(lead.name)}</td></tr>
      <tr><td style="padding: 6px 12px; font-weight: bold;">โทร:</td><td style="padding: 6px 12px;"><a href="tel:${escape(lead.phone)}">${escape(lead.phone)}</a></td></tr>
      <tr><td style="padding: 6px 12px; font-weight: bold;">Email:</td><td style="padding: 6px 12px;">${escape(lead.email ?? '—')}</td></tr>
      <tr><td style="padding: 6px 12px; font-weight: bold;">ประเภท:</td><td style="padding: 6px 12px;">${escape(lead.type)}</td></tr>
      <tr><td style="padding: 6px 12px; font-weight: bold;">บริษัทที่สนใจ:</td><td style="padding: 6px 12px;">${escape(lead.preferredCarrier ?? 'ทั้งคู่')}</td></tr>
      <tr><td style="padding: 6px 12px; font-weight: bold;">ทุนที่ต้องการ:</td><td style="padding: 6px 12px;">${lead.estimatedSumInsured ? '฿' + lead.estimatedSumInsured.toLocaleString('th-TH') : '—'}</td></tr>
      <tr><td style="padding: 6px 12px; font-weight: bold;">ข้อความ:</td><td style="padding: 6px 12px;">${escape(lead.message ?? '—')}</td></tr>
      <tr><td style="padding: 6px 12px; font-weight: bold;">User:</td><td style="padding: 6px 12px;">${escape(lead.userEmail ?? '—')}</td></tr>
    </table>
    <p style="margin-top: 16px; color: #666; font-size: 12px;">
      ส่งจากระบบ Lumenfi · ติดต่อกลับลูกค้าภายใน 24 ชั่วโมง
    </p>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[Resend] failed:', res.status, text);
    return { ok: false, reason: 'send_failed' };
  }
  return { ok: true };
}

function escape(s: string): string {
  return String(s ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}

export async function submitInsuranceLead(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const name = (formData.get('name') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim();
  const email = ((formData.get('email') as string) ?? '').trim() || null;
  const type = (formData.get('type') as string) || 'review';
  const preferredCarrier = (formData.get('preferred_carrier') as string) || null;
  const sumInsuredStr = (formData.get('estimated_sum_insured') as string) || '';
  const estimatedSumInsured = sumInsuredStr ? parseFloat(sumInsuredStr.replace(/,/g, '')) : null;
  const message = ((formData.get('message') as string) ?? '').trim() || null;
  const sourceEvent = (formData.get('source_event') as string) || 'manual';

  if (!name || !phone) {
    return { error: 'missing_required' as const };
  }

  // Resolve which agent should receive this lead
  const route = await getRouteForUser(user.id);

  // Insert lead row (with agent_id for audit)
  const { error } = await supabase.from('insurance_leads').insert({
    user_id: user.id,
    agent_id: route.agent_id,           // null if legacy fallback
    type,
    name,
    phone,
    email,
    preferred_carrier: preferredCarrier,
    source_event: sourceEvent,
    estimated_sum_insured: estimatedSumInsured,
    message,
    status: 'new',
  });

  if (error) {
    console.error('[insurance_lead]', error);
    return { error: 'db_failed' as const };
  }

  // Route email to assigned agent (fallback to env if route email is empty)
  const toEmail = route.email || FALLBACK_NOTIFY;
  await sendLeadEmail(toEmail, route.display_name, {
    name,
    phone,
    email,
    type,
    preferredCarrier,
    estimatedSumInsured,
    message,
    userEmail: user.email ?? null,
  });

  // If this agent is on trial, increment leads used + send LINE Notify if configured
  if (route.agent_id) {
    try {
      const svc = createServiceClient();
      const { data: agentRow } = await svc
        .from('agents')
        .select('id, line_notify_token, line_notify_enabled, agent_name')
        .eq('id', route.agent_id)
        .maybeSingle();

      // LINE Notify
      const ag = agentRow as any;
      if (ag?.line_notify_enabled && ag?.line_notify_token) {
        const msgLines = [
          '🔔 ลีดประกันใหม่!',
          `\nลูกค้า: ${name}`,
          `เบอร์: ${phone}`,
          email ? `Email: ${email}` : '',
          `ประเภท: ${type}`,
          preferredCarrier ? `บ.ที่สนใจ: ${preferredCarrier}` : '',
          estimatedSumInsured ? `ทุน: ฿${estimatedSumInsured.toLocaleString('th-TH')}` : '',
          message ? `ข้อความ: ${message}` : '',
        ].filter(Boolean).join('\n');
        sendLineNotify({ token: ag.line_notify_token, message: msgLines }).catch(() => {});
      }

      // Trial counter
      const { data: sub } = await svc
        .from('agent_subscriptions')
        .select('id, plan, trial_leads_used')
        .eq('agent_id', route.agent_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sub && (sub as any).plan === 'trial') {
        await svc
          .from('agent_subscriptions')
          .update({ trial_leads_used: ((sub as any).trial_leads_used ?? 0) + 1 })
          .eq('id', (sub as any).id);
      }

      // Last lead received timestamp
      await svc
        .from('agents')
        .update({ last_lead_received_at: new Date().toISOString() })
        .eq('id', route.agent_id);
    } catch (e) {
      console.warn('[quote] agent post-route update failed:', e);
    }
  }

  revalidatePath('/insurance');
  return { success: true as const };
}
