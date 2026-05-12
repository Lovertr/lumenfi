import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { syncCompanyProducts } from '@/lib/agents/product-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Weekly cron to refresh product catalog for all active insurance companies.
 * Triggered via Vercel cron + bearer of CRON_SECRET (same convention as other crons).
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const svc = createServiceClient();
  // Skip companies that synced within the last 6 days. With Vercel Hobby's
  // daily-only cron, this is how we approximate a weekly cadence per company.
  const STALE_MS = 6 * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - STALE_MS).toISOString();
  const { data: companies } = await svc
    .from('insurance_companies')
    .select('id, code, last_synced_at')
    .eq('active', true)
    .or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`);
  if (!companies || companies.length === 0) {
    return NextResponse.json({ ok: true, ran: 0 });
  }

  const results: any[] = [];
  for (const c of companies as any[]) {
    try {
      const r = await syncCompanyProducts(svc, c.id, 'cron');
      results.push({ code: c.code, ...r });
    } catch (e: any) {
      results.push({ code: c.code, status: 'error', error: e?.message ?? String(e) });
    }
    // Light delay to avoid hammering AI gateway / company websites in burst
    await new Promise((r) => setTimeout(r, 2000));
  }
  return NextResponse.json({ ok: true, ran: companies.length, results });
}
