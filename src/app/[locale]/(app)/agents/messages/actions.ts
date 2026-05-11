'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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

export async function createMessage(formData: FormData): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const agentId = await getMyAgentId();
  if (!agentId) return;

  const title = (formData.get('title') as string)?.trim();
  const body = (formData.get('body') as string)?.trim();
  const cta_label = (formData.get('cta_label') as string)?.trim() || null;
  const cta_url = (formData.get('cta_url') as string)?.trim() || null;
  const expires_at_str = (formData.get('expires_at') as string)?.trim() || null;

  if (!title || !body) return;

  await supabase.from('agent_messages').insert({
    agent_id: agentId,
    title,
    body,
    cta_label,
    cta_url,
    active: true,
    expires_at: expires_at_str || null,
  });

  revalidatePath('/agents/messages');
  revalidatePath('/dashboard');
}

export async function toggleMessage(formData: FormData): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const agentId = await getMyAgentId();
  if (!agentId) return;

  const id = formData.get('id') as string;
  const active = formData.get('active') === 'true';
  if (!id) return;

  await supabase
    .from('agent_messages')
    .update({ active: !active })
    .eq('id', id)
    .eq('agent_id', agentId);

  revalidatePath('/agents/messages');
}

export async function deleteMessage(formData: FormData): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const agentId = await getMyAgentId();
  if (!agentId) return;

  const id = formData.get('id') as string;
  if (!id) return;

  await supabase
    .from('agent_messages')
    .delete()
    .eq('id', id)
    .eq('agent_id', agentId);

  revalidatePath('/agents/messages');
}
