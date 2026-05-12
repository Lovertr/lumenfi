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

// ───────────────────────────────────────────────────────────────────────
// KNOWN PRODUCT SEEDS — public marketing names that an admin can hand to
// the AI as anchors. The AI must include these AND can add more it knows.
// This keeps research mode honest while still letting it discover new SKUs.
// ───────────────────────────────────────────────────────────────────────
const KNOWN_PRODUCT_SEEDS: Record<string, string[]> = {
  BLA: [
    // คุ้มครองชีวิต
    'บีแอลเอ พรีเมียร์ลิงค์',
    'บีแอลเอ เวลธ์ลิงค์',
    'กรุงเทพ แฮปปี้ คิดส์',
    'แฮปปี้เซฟวิ่ง 999',
    'เพรสทีจ ไลฟ์',
    'แฮปปี้ โฮลไลฟ์ (มีเงินปันผล)',
    'ตลอดชีพ สุดคุ้ม',
    'ห่วงรัก พรีเมียร์ 99/20',
    'ห่วงรัก พรีเมียร์ 9901',
    'ห่วงรัก พรีเมียร์ (มีเงินปันผล)',
    'บีแอลเอ ตลอดชีพ 99/99',
    // สร้างเงินออม
    'เพรสทีจ เซฟวิ่ง 12/6',
    'กรุงเทพ สุดคุ้ม',
    'กรุงเทพ สมาร์ทคิดส์',
    'แฮปปี้เซฟวิ่ง 15/7',
    'แท็กซ์ เซฟเวอร์ 10/5 (มีเงินปันผล)',
    'เพรสทีจ เซฟวิ่ง 10/4',
    'บีแอลเอ แฮปปี้เซฟวิ่ง 99/5 (มีเงินปันผล)',
    'บีแอลเอ แฮปปี้เซฟวิ่ง 99/10 (มีเงินปันผล)',
    'บีแอลเอ แฮปปี้เซฟวิ่ง 126',
    'บีแอลเอ แฮปปี้เซฟวิ่ง 14/7 (มีเงินปันผล)',
    'บีแอลเอ แฮปปี้เซฟวิ่ง 16/8 (มีเงินปันผล)',
    'บีแอลเอ แฮปปี้เซฟวิ่ง 18/10 (มีเงินปันผล)',
    'บีแอลเอ แฮปปี้เซฟวิ่ง 208 (มีเงินปันผล)',
    'บีแอลเอ แฮปปี้เซฟวิ่ง 2515 (มีเงินปันผล)',
    'บีแอลเอ ปันสุข 80/20',
    // วางแผนเกษียณ
    'บำนาญ แฮปปี้ เพนชั่น',
    // คุ้มครองสุขภาพ + CI
    'บีแอลเอ มัลติแคร์',
    'บีแอลเอ มัลติ ซีไอ',
  ],
  AIA: [
    'AIA Annuity Sure',
    'AIA Annuity Fix 7',
    'AIA Annuity Premium 90',
    'AIA Health Saver',
    'AIA H&S Plus Gold',
    'AIA Issara Plus',
    'AIA Pay Life',
    'AIA CI Plus',
    'AIA CI SuperCare',
    'AIA Multi-Pay CI',
    'AIA Endowment 15/8',
    'AIA Endowment 25/10',
    'AIA Wealth Pro Excel',
    'AIA Lady CI',
    'AIA Senior Care Plus',
    'AIA Universal Life',
    'AIA 20 Pay Life',
  ],
  ALLIANZ: [
    'My Allianz Pension',
    'My Allianz Critical Care',
    'My Allianz Health',
    'My Allianz Wealth',
    'My Allianz iCare',
    'My Allianz Saving 10/5',
    'My Allianz Life Plus',
    'My Allianz Whole Life 99/20',
    'My Allianz Smart Saver',
  ],
  FWD: [
    'FWD Easy E-Pension',
    'FWD Easy Health',
    'FWD Easy Life Plus',
    'FWD Easy Cancer Care',
    'FWD Precious Care',
    'FWD Easy Pension 60',
    'FWD Smart Wealth',
    'FWD Easy Saver',
    'FWD Cancer EZ Saver',
    'FWD Easy Senior',
  ],
  KTAXA: [
    'iWealthy',
    'iWealthy Ultra',
    'iProtect',
    'iProtect S',
    'iHealthy',
    'iHealthy Ultra',
    'iHealthy Lady',
    'iRetire',
    'iLink Start',
    'iGen',
    'iLove Endowment 15/8',
    'iLink Premier',
  ],
  MTL: [
    'D Health Plus',
    'D Kids',
    'D Senior',
    'D Cancer',
    'D Heart',
    'Smart Saving 5/15',
    'บำนาญเมืองไทย รีเทิร์น 99/60',
    'เมืองไทย Smart Protection 99/20',
    'เมืองไทย Smart Annuity 60/85',
    'เมืองไทย Smart CI 60/85',
    'เมืองไทย Smart Kids Saving',
  ],
  TLI: [
    'ไทยประกัน Health Star',
    'ไทยประกัน Lady CI',
    'บำนาญสุขเกษียณ 60/85',
    'บำนาญสุขเกษียณ 55/85',
    'ไทยประกัน Smart Life 90/8',
    'ไทยประกัน Endowment 15/8',
    'ไทยประกัน CI Plus',
  ],
};

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

const SCHEMA_BLOCK = `รูปแบบ:
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
กฎร่วม:
- ห้ามใส่ตัวเลขเบี้ย/วงเงินที่อาจผิด
- categoryต้องอยู่ใน enum ด้านบนเท่านั้น
- ตอบ JSON เท่านั้น ไม่มีข้อความก่อน/หลัง`;

const EXTRACT_PROMPT = `คุณคือ AI ที่ช่วยสกัด (extract) รายชื่อผลิตภัณฑ์ประกันจากเนื้อหาเว็บไซต์
${SCHEMA_BLOCK}
กฎเพิ่มเติม:
- ห้ามแต่งผลิตภัณฑ์เอง — ต้องเป็นชื่อจริงจากเนื้อหาเว็บไซต์ที่ให้
- ถ้าเนื้อหาไม่เพียงพอ คืน {"products": []}`;

const RESEARCH_PROMPT = `คุณคือ AI ผู้เชี่ยวชาญผลิตภัณฑ์ประกันชีวิตในประเทศไทย — รู้ทั้ง brand name, sub-line, รุ่นยอดนิยม
ภารกิจ: เมื่อได้รับชื่อบริษัทประกัน ให้ลิสต์ผลิตภัณฑ์ที่บริษัทขายจริงให้ครบทุกหมวด (life · whole_life · health · ci · retirement · savings · accident · investment_linked)

ขอ 15-30 ผลิตภัณฑ์ — ให้กว้างที่สุดเท่าที่จำได้แม่นยำ ไม่ใช่แค่ 5
ใช้ชื่อจริงตามตลาดเท่านั้น (ตัวอย่างชื่อจริงที่ใช้:
- BLA: "บำนาญแฮปปี้เพนชั่น", "บีแอลเอ พรีเมียร์ลิงค์", "บีแอลเอ ตลอดชีพ 99/99", "กรุงเทพ แฮปปี้ คิดส์", "แฮปปี้เซฟวิ่ง 15/7", "เพรสทีจ เซฟวิ่ง 12/6", "บีแอลเอ มัลติ ซีไอ", "บีแอลเอ มัลติแคร์", ...
- AIA: "AIA Annuity Sure", "AIA Health Saver", "AIA Pay Life", "AIA CI Plus", "AIA Issara Plus"
- FWD: "FWD Easy E-Pension", "FWD Easy Health", "FWD Easy Life Plus"
- KTAXA: "iWealthy", "iProtect", "iHealthy"
- Allianz: "My Allianz Pension", "My Allianz Critical Care", "My Allianz Health"
- MTL: "D Health Plus", "Smart Saving"
- TLI: "บำนาญสุขเกษียณ", "ไทยประกัน Health Star"
)

${SCHEMA_BLOCK}
ห้ามใส่:
- ชื่อหมวดทั่วไป ("ประกันชีวิต", "ประกันสุขภาพ", "Life Insurance", "Property Insurance")
- ช่องทาง bancassurance หรือ broker ("ผ่านธนาคาร X", "ผลิตภัณฑ์ broker")
- ประกันที่ไม่ใช่ของบริษัทนี้
- ตัวเลขเบี้ย/วงเงิน (เพราะมีโอกาสผิด)
ขั้นต่ำ: 15 ผลิตภัณฑ์ ถ้ามั่นใจ`;

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

  // ── HYBRID MODE ──────────────────────────────────────────────────
  // Step A: try to fetch the company's product page. Many insurance sites
  // are behind Cloudflare/WAF and block server-side fetches with HTTP 403.
  // If that happens we don't fail — we switch to RESEARCH MODE where AI
  // recalls well-known products from its training knowledge instead.
  let mode: 'extract' | 'research' = 'extract';
  let text = '';
  let fetchError: string | null = null;
  try {
    const html = await fetchHtml(research_url);
    text = stripHtml(html);
    if (text.length < 200) {
      fetchError = 'page_empty (likely JS-rendered SPA)';
      mode = 'research';
      text = '';
    }
  } catch (e: any) {
    fetchError = e?.message ?? String(e);
    mode = 'research';
    text = '';
  }

  // Step B: call AI in the chosen mode
  let aiText: string;
  try {
    let systemPrompt: string;
    let userContent: string;
    if (mode === 'extract' && text) {
      systemPrompt = EXTRACT_PROMPT;
      userContent =
        `บริษัท: ${(company as any).name} (${(company as any).code})\n` +
        `URL: ${research_url}\n\n` +
        `เนื้อหาหน้าเว็บ:\n${text}`;
    } else {
      systemPrompt = RESEARCH_PROMPT;
      const seeds = KNOWN_PRODUCT_SEEDS[(company as any).code] ?? [];
      const seedBlock = seeds.length
        ? `\n\nผลิตภัณฑ์ที่ต้องมีในรายการ (anchor list — ต้องใส่ทุกตัว แล้วเพิ่มอื่นๆ ที่รู้):\n${seeds.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\nสำหรับแต่ละตัวด้านบน — เติม category/tagline/benefits/ideal/salesAngle ให้ครบ และเพิ่มผลิตภัณฑ์อื่นๆ ที่บริษัทขายจริงและคุณรู้`
        : '';
      userContent =
        `กรุณาระบุผลิตภัณฑ์ประกันชีวิตเด่นๆ ของบริษัทนี้:\n` +
        `- ชื่อ: ${(company as any).name}\n` +
        `- รหัส: ${(company as any).code}\n` +
        `- เว็บไซต์: ${research_url}\n` +
        (fetchError
          ? `\n(หมายเหตุ: ดึงเว็บไซต์ตรงๆ ไม่ได้ — ${fetchError}. ใช้ความรู้สาธารณะที่ทราบแทน)`
          : '') +
        seedBlock;
    }

    const r = await callAIViaGateway({
      feature: 'chat',
      systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });
    aiText = r.text;
  } catch (e: any) {
    await finishRun(
      'error',
      { added: 0, updated: 0, markedInactive: 0 },
      `ai (${mode}): ${e?.message ?? e}`,
      (text || `[research mode] ${fetchError ?? ''}`).slice(0, 2000),
    );
    return {
      companyId,
      companyCode: (company as any).code,
      status: 'error',
      added: 0,
      updated: 0,
      markedInactive: 0,
      error: `ai (${mode}): ${e?.message ?? e}`,
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

  // Reject generic-category names + bancassurance channels — these
  // are not actual products, they're distribution wrappers.
  const BAD_NAME_PATTERNS = [
    /^ประกันชีวิต$/i,
    /^ประกันสุขภาพ$/i,
    /^ประกันโรคร้าย/i,
    /^ประกันทรัพย์สิน/i,
    /^ประกันอุบัติเหตุ$/i,
    /^life insurance$/i,
    /^health insurance$/i,
    /^property insurance$/i,
    /^accident insurance$/i,
    /bancassurance/i,
    /ผ่านช่องทางธนาคาร/i,
    /ช่องทางbroker/i,
    /\bgeneric\b/i,
  ];

  for (const raw of products) {
    if (!raw?.name || typeof raw.name !== 'string') continue;
    if (!VALID_CATEGORIES.includes(raw.category as Category)) continue;
    const trimmed = raw.name.trim();
    if (trimmed.length < 3 || trimmed.length > 200) continue;
    if (BAD_NAME_PATTERNS.some((p) => p.test(trimmed))) continue;

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
    ((mode === 'research' ? `[RESEARCH MODE${fetchError ? ' · fetch=' + fetchError : ''}]\n` : '[EXTRACT MODE]\n') + text).slice(0, 2000),
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
