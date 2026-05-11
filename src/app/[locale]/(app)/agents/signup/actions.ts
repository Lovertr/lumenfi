'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { generateInviteCode } from '@/lib/agents/queries';
import { createServiceClient } from '@/lib/supabase/admin';
import { logNotification } from '@/lib/notifications';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

function txt(v: FormDataEntryValue | null): string | null {
  if (!v) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

export async function createAgent(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Check if user already has an agent record
  const { data: existing } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) {
    redirect('/agents/dashboard');
  }

  const display_name = txt(formData.get('display_name'));
  const company = txt(formData.get('company'));
  const agent_name = txt(formData.get('agent_name'));
  const email = txt(formData.get('email'));
  const phone = txt(formData.get('phone'));
  const line_id = txt(formData.get('line_id'));
  const license_number = txt(formData.get('license_number'));
  const license_valid_from = txt(formData.get('license_valid_from'));
  const license_valid_until = txt(formData.get('license_valid_until'));
  const bio = txt(formData.get('bio'));

  // Products: checkboxes return 'on' for each checked. We read by name.
  const products: string[] = [];
  for (const p of ['life', 'health', 'ci', 'retirement', 'savings', 'accident']) {
    if (formData.get(`product_${p}`)) products.push(p);
  }

  if (!display_name || !agent_name || !email || !license_number || !license_valid_until) {
    return { error: 'missing_required' as const };
  }

  // Generate a unique invite code (retry if collision)
  let invite_code = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await supabase
      .from('agents')
      .select('id')
      .eq('invite_code', invite_code)
      .maybeSingle();
    if (!clash) break;
    invite_code = generateInviteCode();
  }

  const { error } = await supabase.from('agents').insert({
    user_id: user.id,
    display_name,
    company,
    agent_name,
    email,
    phone,
    line_id,
    license_number,
    license_valid_from,
    license_valid_until,
    products,
    bio,
    invite_code,
    status: 'pending', // admin must approve
  });

  if (error) {
    console.error('[createAgent]', error);
    return { error: 'db_failed' as const };
  }

  // Notify admin in-app that a new agent applied
  // Try multiple ways to find admin: by email, by is_admin flag, by auth.users
  try {
    const svc = createServiceClient();
    let adminUserId: string | null = null;

    // 1) profiles where email matches ADMIN_EMAIL
    try {
      const r = await svc
        .from('profiles')
        .select('id')
        .eq('email', ADMIN_EMAIL)
        .maybeSingle();
      if ((r.data as any)?.id) adminUserId = (r.data as any).id;
    } catch {}

    // 2) profiles where is_admin = true
    if (!adminUserId) {
      try {
        const r = await svc
          .from('profiles')
          .select('id')
          .eq('is_admin', true)
          .limit(1)
          .maybeSingle();
        if ((r.data as any)?.id) adminUserId = (r.data as any).id;
      } catch {}
    }

    // 3) auth.users via admin API
    if (!adminUserId) {
      try {
        const { data } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
        const u = (data?.users ?? []).find((u: any) => u.email === ADMIN_EMAIL);
        if (u?.id) adminUserId = u.id;
      } catch {}
    }

    if (adminUserId) {
      await logNotification({
        userId: adminUserId,
        type: 'system',
        severity: 'info',
        title: '🔔 มีตัวแทนสมัครใหม่',
        body: `${agent_name} (${display_name}) — กรุณาตรวจสอบใบอนุญาตและอนุมัติ`,
        url: '/admin/agents',
        icon: '💼',
        tag: 'agent-pending',
      });
      console.log('[createAgent] admin notified:', adminUserId);
    } else {
      console.error('[createAgent] could not find admin user with email', ADMIN_EMAIL);
    }
  } catch (e) {
    console.error('[createAgent] admin notify failed:', e);
  }

  revalidatePath('/agents/dashboard');
  redirect('/agents/dashboard?signup=ok');
}

export async function updateAgent(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const updates: Record<string, any> = {
    display_name: txt(formData.get('display_name')),
    company: txt(formData.get('company')),
    agent_name: txt(formData.get('agent_name')),
    email: txt(formData.get('email')),
    phone: txt(formData.get('phone')),
    line_id: txt(formData.get('line_id')),
    license_number: txt(formData.get('license_number')),
    license_valid_from: txt(formData.get('license_valid_from')),
    license_valid_until: txt(formData.get('license_valid_until')),
    bio: txt(formData.get('bio')),
  };
  const products: string[] = [];
  for (const p of ['life', 'health', 'ci', 'retirement', 'savings', 'accident']) {
    if (formData.get(`product_${p}`)) products.push(p);
  }
  updates.products = products;

  const { error } = await supabase
    .from('agents')
    .update(updates)
    .eq('user_id', user.id);

  if (error) {
    console.error('[updateAgent]', error);
    return { error: 'db_failed' as const };
  }

  revalidatePath('/agents/dashboard');
  return { success: true as const };
}
