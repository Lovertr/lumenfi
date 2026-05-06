'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const numOrZero = (v: FormDataEntryValue | null): number => {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return isFinite(n) ? n : 0;
};

const POLICY_TYPES = ['life', 'health', 'critical_illness', 'accident', 'car', 'home', 'travel', 'other'];

export async function createPolicy(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const type = (formData.get('type') as string) || 'life';
  if (!POLICY_TYPES.includes(type)) return { error: 'invalid_type' as const };

  const carrier = ((formData.get('carrier') as string) ?? '').trim();
  if (!carrier) return { error: 'carrier_required' as const };

  const { error } = await supabase.from('insurance_policies').insert({
    user_id: user.id,
    type,
    carrier,
    policy_name: ((formData.get('policy_name') as string) ?? '').trim() || null,
    policy_number: ((formData.get('policy_number') as string) ?? '').trim() || null,
    sum_insured: numOrZero(formData.get('sum_insured')),
    annual_premium: numOrZero(formData.get('annual_premium')),
    start_date: (formData.get('start_date') as string) || null,
    renewal_date: (formData.get('renewal_date') as string) || null,
    beneficiary: ((formData.get('beneficiary') as string) ?? '').trim() || null,
    notes: ((formData.get('notes') as string) ?? '').trim() || null,
  });

  if (error) {
    console.error('createPolicy:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/insurance/policies');
  revalidatePath('/insurance');
  redirect('/insurance/policies');
}

export async function updatePolicy(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = formData.get('id') as string;
  if (!id) return { error: 'invalid_data' as const };

  const type = (formData.get('type') as string) || 'life';
  const carrier = ((formData.get('carrier') as string) ?? '').trim();
  if (!carrier) return { error: 'carrier_required' as const };

  const { error } = await supabase
    .from('insurance_policies')
    .update({
      type,
      carrier,
      policy_name: ((formData.get('policy_name') as string) ?? '').trim() || null,
      policy_number: ((formData.get('policy_number') as string) ?? '').trim() || null,
      sum_insured: numOrZero(formData.get('sum_insured')),
      annual_premium: numOrZero(formData.get('annual_premium')),
      start_date: (formData.get('start_date') as string) || null,
      renewal_date: (formData.get('renewal_date') as string) || null,
      beneficiary: ((formData.get('beneficiary') as string) ?? '').trim() || null,
      notes: ((formData.get('notes') as string) ?? '').trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: 'generic' as const };
  revalidatePath('/insurance/policies');
  revalidatePath('/insurance');
  redirect('/insurance/policies');
}

export async function deletePolicy(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = formData.get('id') as string;
  if (!id) return;

  await supabase.from('insurance_policies').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/insurance/policies');
  revalidatePath('/insurance');
  redirect('/insurance/policies');
}
