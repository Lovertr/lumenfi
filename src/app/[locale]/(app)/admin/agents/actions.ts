'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { logNotification } from '@/lib/notifications';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

async function assertAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (user.email !== ADMIN_EMAIL) {
    throw new Error('forbidden');
  }
  return user;
}

export async function approveAgent(formData: FormData) {
  const admin = await assertAdmin();
  const agentId = formData.get('agent_id') as string;
  const setDefault = formData.get('set_default') === 'on';
  if (!agentId) return;

  const svc = createServiceClient();

  // If setting default, clear current default first
  if (setDefault) {
    await svc.from('agents').update({ is_default: false }).eq('is_default', true);
  }

  const { data: updated, error } = await svc
    .from('agents')
    .update({
      status: 'active',
      approved_at: new Date().toISOString(),
      approved_by: admin.id,
      ...(setDefault ? { is_default: true } : {}),
    })
    .eq('id', agentId)
    .select('user_id, agent_name, display_name, invite_code')
    .single();

  if (error || !updated) {
    console.error('[approveAgent]', error);
    return;
  }

  // Create a starter trial subscription so they have 14 days of access
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);
  await svc.from('agent_subscriptions').insert({
    agent_id: agentId,
    plan: 'trial',
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: trialEnd.toISOString(),
    trial_leads_used: 0,
    trial_leads_cap: 3,
    monthly_amount: 0,
    billing_cycle: 'monthly',
  });

  // Notify the approved agent in-app
  await logNotification({
    userId: (updated as any).user_id,
    type: 'system',
    severity: 'success',
    title: '✓ บัญชีตัวแทนได้รับการอนุมัติ',
    body: `ยินดีต้อนรับ — ระบบเปิดให้คุณรับ lead ได้แล้ว · ทดลองฟรี 14 วัน · invite link: /i/${(updated as any).invite_code}`,
    url: '/agents/dashboard',
    icon: '💼',
    tag: 'agent-approved',
  });

  revalidatePath('/admin/agents');
  return;
}

export async function rejectAgent(formData: FormData) {
  const admin = await assertAdmin();
  const agentId = formData.get('agent_id') as string;
  const reason = (formData.get('reason') as string) || 'ไม่ตรงเงื่อนไข';
  if (!agentId) return;

  const svc = createServiceClient();
  const { data: agent } = await svc
    .from('agents')
    .select('user_id, agent_name')
    .eq('id', agentId)
    .maybeSingle();

  await svc.from('agents').update({ status: 'suspended' }).eq('id', agentId);

  if (agent?.user_id) {
    await logNotification({
      userId: agent.user_id,
      type: 'system',
      severity: 'warn',
      title: 'การสมัครตัวแทนถูกปฏิเสธ',
      body: `เหตุผล: ${reason} — ติดต่อ admin หากต้องการสอบถามเพิ่มเติม`,
      url: '/agents/dashboard',
      icon: '⚠️',
      tag: 'agent-rejected',
    });
  }

  revalidatePath('/admin/agents');
  return;
}

export async function setDefaultAgent(formData: FormData) {
  await assertAdmin();
  const agentId = formData.get('agent_id') as string;
  if (!agentId) return;

  const svc = createServiceClient();
  // Clear current default
  await svc.from('agents').update({ is_default: false }).eq('is_default', true);
  // Set new default
  const { error } = await svc.from('agents').update({ is_default: true }).eq('id', agentId);
  if (error) {
    console.error('[setDefaultAgent]', error);
    return;
  }
  revalidatePath('/admin/agents');
  return;
}

export async function suspendAgent(formData: FormData) {
  await assertAdmin();
  const agentId = formData.get('agent_id') as string;
  const svc = createServiceClient();
  await svc.from('agents').update({ status: 'suspended' }).eq('id', agentId);
  revalidatePath('/admin/agents');
  return;
}

export async function reactivateAgent(formData: FormData) {
  await assertAdmin();
  const agentId = formData.get('agent_id') as string;
  const svc = createServiceClient();
  await svc.from('agents').update({ status: 'active' }).eq('id', agentId);
  revalidatePath('/admin/agents');
  return;
}
