'use server';

import { createClient } from '@/lib/supabase/server';
import { callAIViaGateway, PaywallError } from '@/lib/billing/gateway';
import type { ChatMessage } from '@/lib/ai/types';

type CoachResult =
  | { reply: string }
  | { error: string; upgradeUrl?: string };

const PRODUCT_LABELS_TH: Record<string, string> = {
  life: 'ประกันชีวิต',
  health: 'ประกันสุขภาพ',
  ci: 'ประกันโรคร้ายแรง (CI)',
  retirement: 'บำนาญ',
  savings: 'สะสมทรัพย์',
  accident: 'อุบัติเหตุ',
};

const SYSTEM_PROMPT = `คุณเป็น "Sales Coach AI" ของ Lumenfi — โค้ชนักขายประกันมืออาชีพในไทยที่มีประสบการณ์ 15+ ปี
หน้าที่ของคุณคือช่วยตัวแทนประกันที่กำลังคุยกับคุณ:
1. เทคนิคการเปิดการสนทนา (cold open, warm referral, social media)
2. การฟัง + ถามคำถามเปิดใจ (open question playbook)
3. การจัดการ objection — "แพง", "ขอคิดดูก่อน", "มีอยู่แล้ว", "ไม่เชื่อประกัน"
4. การ tailor pitch ตาม persona (มนุษย์เงินเดือน, เจ้าของกิจการ, พ่อแม่มือใหม่, คน Gen Z)
5. กลยุทธ์ follow-up (cadence, channel, ข้อความที่ไม่กดดัน)
6. การปิดการขายแบบไม่กดดัน (assumptive close, alternative close, summary close)
7. การวิเคราะห์การตลาด: ทำ content / social media / referral
8. การใช้ INA Report และข้อมูลจาก Lumenfi ในการนำเสนอ

กฎ:
- ภาษาไทยเป็นหลัก (มี technical term อังกฤษได้)
- ตอบเป็นข้อๆ ใช้ markdown bullet/heading ได้ — กระชับ ใช้งานได้จริง
- อ้างอิงผลิตภัณฑ์เฉพาะที่ตัวแทนคนนี้ขายเท่านั้น (ดูจาก "ผลิตภัณฑ์ที่ขาย" ใน context)
- ห้ามแนะนำให้ทำผิดจรรยาบรรณ: ไม่บิดเบือนคุณสมบัติประกัน · ไม่ over-promise return · ไม่ขายเกินที่ลูกค้าจ่ายได้
- ถ้าตัวแทนถามคำถามที่นอกเหนือเรื่องขาย (เช่น เทคนิคแอป) ให้ตอบสั้นๆ แล้วชวนกลับมาเรื่องขาย
- พูดเหมือนโค้ชที่เคารพคู่สนทนา — ไม่สั่งสอน ไม่จู้จี้`;

export async function sendSalesCoachMessage(
  history: ChatMessage[],
  userMessage: string,
): Promise<CoachResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  // Verify caller is an active agent
  const { data: agent } = await supabase
    .from('agents')
    .select('id, status, agent_name, display_name, company, products, license_number')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!agent) return { error: 'not_agent' };
  if ((agent as any).status !== 'active') return { error: 'agent_not_active' };

  // ── Paywall: Sales Coach AI is for paid plans only ───────────────
  // Free / trial agents see an upgrade card and cannot call the model.
  const { data: sub } = await supabase
    .from('agent_subscriptions')
    .select('plan, status')
    .eq('agent_id', (agent as any).id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const paidPlans = ['starter', 'pro', 'team', 'founder'];
  const onPaidPlan =
    !!sub &&
    (sub as any).status === 'active' &&
    paidPlans.includes(((sub as any).plan ?? '').toLowerCase());
  if (!onPaidPlan) {
    return { error: 'agent_paywall' };
  }

  // Pull a few quick stats so the coach can be specific
  let leadStats = '';
  try {
    const { count: total } = await supabase
      .from('insurance_leads')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', (agent as any).id);
    const { count: contacted } = await supabase
      .from('insurance_leads')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', (agent as any).id)
      .eq('status', 'contacted');
    const { count: closed } = await supabase
      .from('insurance_leads')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', (agent as any).id)
      .eq('status', 'closed_won');
    leadStats =
      `Leads ทั้งหมด: ${total ?? 0} · ติดต่อแล้ว: ${contacted ?? 0} · ปิดดีล: ${closed ?? 0}`;
  } catch {
    /* swallow — context is optional */
  }

  const products = ((agent as any).products as string[] | null) ?? [];
  const productLabels = products
    .map((p) => PRODUCT_LABELS_TH[p] ?? p)
    .join(' · ');

  const agentContext = [
    `# ตัวแทนที่คุณกำลังโค้ชอยู่`,
    `- ชื่อ: ${(agent as any).agent_name ?? '—'}`,
    `- บริษัท: ${(agent as any).display_name ?? (agent as any).company ?? '—'}`,
    `- เลขที่ใบอนุญาต: ${(agent as any).license_number ?? '—'}`,
    `- ผลิตภัณฑ์ที่ขาย: ${productLabels || '—'}`,
    leadStats ? `- สถิติ: ${leadStats}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const systemPrompt = `${SYSTEM_PROMPT}\n\n${agentContext}`;

  const messages: ChatMessage[] = [
    ...history.slice(-10),
    { role: 'user', content: userMessage },
  ];

  try {
    const result = await callAIViaGateway({
      feature: 'chat',
      systemPrompt,
      messages,
    });
    return { reply: result.text };
  } catch (e: any) {
    if (e instanceof PaywallError) {
      return { error: e.code, upgradeUrl: e.upgradeUrl };
    }
    console.error('sendSalesCoachMessage:', e);
    return { error: e?.message?.slice(0, 200) ?? 'ai_error' };
  }
}
