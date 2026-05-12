/**
 * AI product sync engine.
 *
 * For each insurance company in the catalog:
 *   1. Fetch the company's product listing page HTML
 *   2. Strip to readable text (~10K chars cap to keep token cost reasonable)
 *   3. Send to AI gateway with a structured-extraction prompt
 *   4. Parse the JSON the model returns
 *   5. Upsert rows in insurance_products, marking missing-but-existing rows
 *      as inactive (so retired products fade out without being deleted)
 *   6. Log everything to product_sync_runs for audit + debug
 *
 * Designed to run from a cron route (weekly) AND from an admin "Sync now"
 * button. Uses the service-role client to bypass RLS for writes.
 */

import { callAIViaGateway } from '@/lib/billing/gateway';
import type { SupabaseClient } from '@supabase/supabase-js';

const VALID_CATEGORIES = [
  'life',
  'whole_life',
  'health',
  'ci',
  'retirement',
  'savings',
  'accident',
  'investment_linked',
] as const;

type Category = (typeof VALID_CATEGORIES)[number];

interface ExtractedProduct {
  name: string;
  altName?: string;
  category: Category;
  tagline?: string;
  benefits?: string[];
  ideal?: string;
  salesAngle?: string;
}

export interface SyncResult {
  companyId: string;
  companyCode: string;
  status: 'success' | 'error';
  added: number;
  updated: number;
  markedInactive: number;
  error?: string;
  runId?: string;
}

const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_CHARS = 60_000;
const MAX_TEXT_CHARS = 12_000;

function stripHtml(html: string): string {
  // Aggressively strip — comments, script, style, then tags.
  let out = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  if (out.length > MAX_TEXT_CHARS) out = out.slice(0, MAX_TEXT_CHARS) + '... [TRUNCATED]';
  return out;
}

async function fetchHtml(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        // Pretend to be a real browser — many insurance sites block bots.
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'th,en;q=0.9',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return text.length > MAX_HTML_CHARS ? text.slice(0, MAX_HTML_CHARS) : text;
  } finally {
    clearTimeout(timer);
  }
}

const SYS_PROMPT = `คุณคือ AI ที่ช่วยสกัด (extract) รายชื่อผลิตภัณฑ์ประกันจากเนื้อหาเว็บไซต์
คืนค่าเป็น JSON เท่านั้น ห้ามใส่ข้อความก่อน/หลัง JSON
รูปแบบ:
{
  "products": [
    {
      "name": "ชื่อผลิตภัณฑ์ภาษาไทย",
      "altName": "ชื่อภาษาอังกฤษ (ถ้ามี)",
      "category": "life | whole_life | health | ci | retirement | savings | accident | investment_linked",
      "tagline": "หนึ่งประโยคจุดขาย",
      "benefits": ["ข้อ 1", "ข้อ 2", "ข้อ 3"],
      "ideal": "ใครเหมาะกับผลิตภัณฑ์นี้",
      "salesAngle": "มุมขายที่ตัวแทนใช้ได้ในการเสนอ"
    }
  ]
}
กฎ:
- ห้ามแต่งผลิตภัณฑ์เอง — ต้องเป็นชื่อจริงจากเว็บไซต์
- ห้ามใส่ตัวเลขเบี้ย/วงเงิน (เพราะมีโอกาสผิด)
- ถ้าเนื้อหาไม่เพียงพอ คืน {"products": []}
- categoryต้องอยู่ใน enum ด้านบนเท่านั้น`;

export async function syncCompanyProducts(
  supabase: SupabaseClient,
  companyId: string,
  triggeredBy: 'cron' | 'admin' | 'manual' = 'admin',
  triggeredByUser: string | null = null,
): Promise<SyncResult> {
  // 1) Get the company
  const { data: company, error: companyErr } = await supabase
    .from('insurance_companies')
    .select('id, code, name, research_url')
    .eq('id', companyId)
    .maybeSingle();
  if (companyErr || !company) {
    return {
      companyId,
      companyCode: '',
      status: 'error',
      added: 0,
      updated: 0,
      markedInactive: 0,
      error: companyErr?.message ?? 'company_not_found',
    };
  }
  const research_url = (company as any).research_url as string | null;
  if (!research_url) {
    return {
      companyId,
      companyCode: (company as any).code,
      status: 'error',
      added: 0,
      updated: 0,
      markedInactive: 0,
      error: 'no_research_url',
    };
  }

  // 2) Open a sync_runs row in 'running' state
  const { data: runRow } = await supabase
    .from('product_sync_runs')
    .insert({
      company_id: companyId,
      triggered_by: triggeredBy,
      triggered_by_user: triggeredByUser,
      status: 'running',
    })
    .select('id')
    .single();
  const runId = (runRow as any)?.id as string | undefined;

  const finishRun = async (
    status: 'success' | 'error',
    counts: { added: number; updated: number; markedInactive: number },
    error?: string,
    excerpt?: string,
    aiExcerpt?: string,
  ) => {
    if (!runId) return;
    await supabase
      .from('product_sync_runs')
      .update({
        finished_at: new Date().toISOString(),
        status,
        products_added: counts.added,
        products_updated: counts.updated,
        products_marked_inactive: counts.markedInactive,
        error_message: error ?? null,
        raw_excerpt: excerpt ?? null,
        ai_response_excerpt: aiExcerpt ?? null,
      })
      .eq('id', runId);
    await supabase
      .from('insurance_companies')
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: status,
        last_sync_error: status === 'error' ? error ?? null : null,
      })
      .eq('id', companyId);
  };

  // 3) Fetch HTML
  let html: string;
  try {
    html = await fetchHtml(research_url);
  } catch (e: any) {
    await finishRun('error', { added: 0, updated: 0, markedInactive: 0 }, `fetch: ${e?.message ?? e}`);
    return {
      companyId,
      companyCode: (company as any).code,
      status: 'error',
      added: 0,
      updated: 0,
      markedInactive: 0,
      error: `fetch: ${e?.message ?? e}`,
      runId,
    };
  }
  const text = stripHtml(html);
  if (text.length < 200) {
    await finishRun(
      'error',
      { added: 0, updated: 0, markedInactive: 0 },
      'page_empty',
      text.slice(0, 2000),
    );
    return {
      companyId,
      companyCode: (company as any).code,
      status: 'error',
      added: 0,
      updated: 0,
      markedInactive: 0,
      error: 'page_empty',
      runId,
    };
  }

  // 4) Ask AI to extract
  let aiText: string;
  try {
    const r = await callAIViaGateway({
      feature: 'chat',
      systemPrompt: SYS_PROMPT,
      messages: [
        {
          role: 'user',
          content:
            `บริษัท: ${(company as any).name} (${(company as any).code})\n` +
            `URL: ${research_url}\n\n` +
            `เนื้อหาหน้าเว็บ:\n${text}`,
        },
      ],
    });
    aiText = r.text;
  } catch (e: any) {
    await finishRun(
      'error',
      { added: 0, updated: 0, markedInactive: 0 },
      `ai: ${e?.message ?? e}`,
      text.slice(0, 2000),
    );
    return {
      companyId,
      companyCode: (company as any).code,
      status: 'error',
      added: 0,
      updated: 0,
      markedInactive: 0,
      error: `ai: ${e?.message ?? e}`,
      runId,
    };
  }

  // 5) Parse JSON from the AI output (be liberal with junk around it)
  let products: ExtractedProduct[] = [];
  try {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : aiText;
    const parsed = JSON.parse(jsonStr);
    products = Array.isArray(parsed.products) ? parsed.products : [];
  } catch (e: any) {
    await finishRun(
      'error',
      { added: 0, updated: 0, markedInactive: 0 },
      `parse: ${e?.message ?? e}`,
      text.slice(0, 2000),
      aiText.slice(0, 2000),
    );
    return {
      companyId,
      companyCode: (company as any).code,
      status: 'error',
      added: 0,
      updated: 0,
      markedInactive: 0,
      error: `parse: ${e?.message ?? e}`,
      runId,
    };
  }

  // 6) Upsert products + mark missing ones inactive
  const now = new Date().toISOString();
  let added = 0;
  let updated = 0;
  const seenNames: string[] = [];

  for (const raw of products) {
    if (!raw?.name || typeof raw.name !== 'string') continue;
    if (!VALID_CATEGORIES.includes(raw.category as Category)) continue;

    const row = {
      company_id: companyId,
      name: raw.name.trim().slice(0, 200),
      alt_name: raw.altName?.trim().slice(0, 200) ?? null,
      category: raw.category,
      tagline: raw.tagline?.trim().slice(0, 500) ?? null,
      benefits: Array.isArray(raw.benefits)
        ? raw.benefits.filter((b) => typeof b === 'string').slice(0, 10)
        : [],
      ideal: raw.ideal?.trim().slice(0, 500) ?? null,
      sales_angle: raw.salesAngle?.trim().slice(0, 500) ?? null,
      source_url: research_url,
      active: true,
      last_seen_at: now,
    };
    seenNames.push(row.name);

    const { data: existing } = await supabase
      .from('insurance_products')
      .select('id')
      .eq('company_id', companyId)
      .eq('name', row.name)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('insurance_products')
        .update(row)
        .eq('id', (existing as any).id);
      updated++;
    } else {
      const { error: insErr } = await supabase
        .from('insurance_products')
        .insert({ ...row, first_seen_at: now });
      if (!insErr) added++;
    }
  }

  // Mark products absent in this run as inactive (soft delete)
  let markedInactive = 0;
  if (seenNames.length > 0) {
    const { data: absent } = await supabase
      .from('insurance_products')
      .select('id')
      .eq('company_id', companyId)
      .eq('active', true)
      .not('name', 'in', `(${seenNames.map((n) => `"${n.replace(/"/g, '""')}"`).join(',')})`);
    if (absent && Array.isArray(absent) && absent.length > 0) {
      const ids = (absent as any[]).map((r) => r.id);
      await supabase
        .from('insurance_products')
        .update({ active: false })
        .in('id', ids);
      markedInactive = ids.length;
    }
  }

  await finishRun(
    'success',
    { added, updated, markedInactive },
    undefined,
    text.slice(0, 2000),
    aiText.slice(0, 2000),
  );

  return {
    companyId,
    companyCode: (company as any).code,
    status: 'success',
    added,
    updated,
    markedInactive,
    runId,
  };
}
