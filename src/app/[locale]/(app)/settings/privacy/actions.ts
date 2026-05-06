'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const TABLES = [
  'transactions',
  'accounts',
  'categories',
  'goals',
  'debts',
  'investments',
  'budgets',
  'recurring_transactions',
  'debt_plans',
  'push_subscriptions',
  'ai_conversations',
  'ai_messages',
  'net_worth_snapshots',
  'profiles',
];

export async function exportUserData(): Promise<Record<string, any>> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const out: Record<string, any> = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    user_email: user.email,
  };

  for (const table of TABLES) {
    try {
      const { data } = await supabase.from(table).select('*').eq('user_id', user.id);
      out[table] = data ?? [];
    } catch (e) {
      out[table] = [];
    }
  }

  return out;
}

export async function deleteUserAccount(formData: FormData) {
  const confirmEmail = formData.get('confirm_email') as string;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  if (confirmEmail !== user.email) {
    return { error: 'email_mismatch' as const };
  }

  for (const table of TABLES) {
    try {
      await supabase.from(table).delete().eq('user_id', user.id);
    } catch {}
  }

  await supabase.auth.signOut();
  redirect('/login?deleted=1');
}
