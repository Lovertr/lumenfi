'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const LEAD_STATUSES = ['new', 'contacted', 'meeting', 'won', 'lost'] as const;
type LeadStatus = typeof LEAD_STATUSES[number];

async function getMyAgentId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  return (data as any)?.id ?? null;
}

export async function updateLeadStatus(formData: FormData): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const agentId = await getMyAgentId();
  if (!agentId) return;

  const leadId = formData.get('lead_id') as string;
  const status = (formData.get('status') as string) as LeadStatus;
  if (!leadId || !LEAD_STATUSES.includes(status)) return;

  await supabase
    .from('insurance_leads')
    .update({ status })
    .eq('id', leadId)
    .eq('agent_id', agentId);

  revalidatePath('/agents/dashboard');
}

export async function updateLeadNotes(formData: FormData): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const agentId = await getMyAgentId();
  if (!agentId) return;

  const leadId = formData.get('lead_id') as string;
  const notes = (formData.get('agent_notes') as string)?.trim() || null;
  if (!leadId) return;

  await supabase
    .from('insurance_leads')
    .update({ agent_notes: notes })
    .eq('id', leadId)
    .eq('agent_id', agentId);

  revalidatePath('/agents/dashboard');
}
