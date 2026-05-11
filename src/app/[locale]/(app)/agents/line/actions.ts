'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { verifyLineToken, sendLineNotify } from '@/lib/line/notify';

export async function saveLineToken(formData: FormData): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const token = (formData.get('token') as string)?.trim();
  if (!token) return;

  // Verify token works
  const isValid = await verifyLineToken(token);
  if (!isValid) {
    // Still save but mark disabled
    await supabase
      .from('agents')
      .update({ line_notify_token: token, line_notify_enabled: false })
      .eq('user_id', user.id);
    revalidatePath('/agents/line');
    return;
  }

  await supabase
    .from('agents')
    .update({ line_notify_token: token, line_notify_enabled: true })
    .eq('user_id', user.id);

  // Send test message
  sendLineNotify({
    token,
    message: '\n✅ Lumenfi เชื่อมต่อสำเร็จ!\nเมื่อมี lead เข้ามา ระบบจะแจ้งเตือนผ่านที่นี่ทันที',
  }).catch(() => {});

  revalidatePath('/agents/line');
}

export async function toggleLineNotify(formData: FormData): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const enable = formData.get('enable') === 'true';
  await supabase
    .from('agents')
    .update({ line_notify_enabled: enable })
    .eq('user_id', user.id);

  revalidatePath('/agents/line');
}

export async function removeLineToken(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase
    .from('agents')
    .update({ line_notify_token: null, line_notify_enabled: false })
    .eq('user_id', user.id);

  revalidatePath('/agents/line');
}

export async function sendTestNotify(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents')
    .select('line_notify_token, agent_name')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!(agent as any)?.line_notify_token) return;

  await sendLineNotify({
    token: (agent as any).line_notify_token,
    message: `\n🔔 Lumenfi — ทดสอบแจ้งเตือน\nสวัสดี ${(agent as any).agent_name ?? ''} ระบบ LINE Notify พร้อมใช้งานแล้ว`,
  });
}
