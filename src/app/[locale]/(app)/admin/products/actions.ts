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

export type SyncNowResult = {
  ok: boolean;
  companyCode: string;
  message: string;       // success: "+X · ~Y · -Z"   error: "reason: ..."
  added?: number;
  updated?: number;
  markedInactive?: number;
};

export async function syncCompanyNow(companyId: string): Promise<SyncNowResult> {
  const user = await requireAdmin();
  if (!companyId) {
    return { ok: false, companyCode: '', message: 'missing_company_id' };
  }

  const svc = createServiceClient();
  const { data: company } = await svc
    .from('insurance_companies')
    .select('code')
    .eq('id', companyId)
    .maybeSingle();
  const code = (company as any)?.code ?? '';

  try {
    const r = await syncCompanyProducts(svc, companyId, 'admin', user.id);
    revalidatePath('/admin/products');
    if (r.status === 'error') {
      return { ok: false, companyCode: code, message: r.error ?? 'unknown_error' };
    }
    return {
      ok: true,
      companyCode: code,
      message: `+${r.added} · ~${r.updated} · -${r.markedInactive}`,
      added: r.added,
      updated: r.updated,
      markedInactive: r.markedInactive,
    };
  } catch (e: any) {
    const msg = (e?.message ?? String(e)).slice(0, 200);
    try {
      await svc.from('product_sync_runs').insert({
        company_id: companyId,
        triggered_by: 'admin',
        triggered_by_user: user.id,
        status: 'error',
        finished_at: new Date().toISOString(),
        error_message: msg,
      });
    } catch {
      /* swallow */
    }
    revalidatePath('/admin/products');
    return { ok: false, companyCode: code, message: msg };
  }
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

export async function clearCompanyProducts(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get('company_id') as string;
  if (!id) return;
  const svc = createServiceClient();
  // Soft delete — mark all inactive instead of dropping rows (preserves audit
  // history of products the company once offered).
  await svc
    .from('insurance_products')
    .update({ active: false })
    .eq('company_id', id)
    .eq('active', true);
  revalidatePath('/admin/products');
}
