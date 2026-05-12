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

  // Look up the company code so we can preserve the ?c= selection in the redirect
  const svc = createServiceClient();
  const { data: company } = await svc
    .from('insurance_companies')
    .select('code')
    .eq('id', id)
    .maybeSingle();
  const codeQs = (company as any)?.code ? `&c=${(company as any).code}` : '';

  let result: 'success' | 'error' = 'success';
  let summary = '';
  try {
    const r = await syncCompanyProducts(svc, id, 'admin', user.id);
    if (r.status === 'error') {
      result = 'error';
      summary = r.error ?? 'unknown_error';
    } else {
      summary = `+${r.added} · ~${r.updated} · -${r.markedInactive}`;
    }
  } catch (e: any) {
    // Any uncaught exception (auth/fetch/AI/parse) — write our own log entry
    // and surface in the redirect, so 'Sync now' is never silent.
    result = 'error';
    summary = (e?.message ?? String(e)).slice(0, 200);
    try {
      await svc.from('product_sync_runs').insert({
        company_id: id,
        triggered_by: 'admin',
        triggered_by_user: user.id,
        status: 'error',
        finished_at: new Date().toISOString(),
        error_message: summary,
      });
    } catch {
      /* swallow */
    }
  }

  revalidatePath('/admin/products');
  redirect(
    `/admin/products?synced=${result}&msg=${encodeURIComponent(summary)}${codeQs}`,
  );
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
