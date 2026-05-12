'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { syncCompanyProducts } from '@/lib/agents/product-sync';

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!(profile as any)?.is_admin) redirect('/dashboard');
  return user;
}

export async function syncCompanyNow(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = formData.get('company_id') as string;
  if (!id) return;
  const svc = createServiceClient();
  // Fire-and-await — small UI, this can take 10-30s. Acceptable for admin.
  await syncCompanyProducts(svc, id, 'admin', user.id);
  revalidatePath('/admin/products');
}

export async function toggleProductActive(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get('id') as string;
  const next = formData.get('next') === 'true';
  if (!id) return;
  const svc = createServiceClient();
  await svc.from('insurance_products').update({ active: next }).eq('id', id);
  revalidatePath('/admin/products');
}

export async function updateCompanyResearchUrl(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get('id') as string;
  const url = (formData.get('research_url') as string)?.trim();
  if (!id || !url) return;
  const svc = createServiceClient();
  await svc.from('insurance_companies').update({ research_url: url }).eq('id', id);
  revalidatePath('/admin/products');
}
