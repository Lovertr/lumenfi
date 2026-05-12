/**
 * DB-backed product catalog for Sales Coach AI.
 *
 * Replaces the static products-catalog.ts. Data lives in `insurance_companies`
 * + `insurance_products` and is refreshed by an AI scraper (see product-sync.ts).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CompanyRow {
  id: string;
  code: string;
  name: string;
  website_url: string | null;
  research_url: string | null;
  last_synced_at: string | null;
  last_sync_status: string | null;
}

export interface ProductRow {
  id: string;
  company_id: string;
  name: string;
  alt_name: string | null;
  category: string;
  tagline: string | null;
  benefits: string[] | null;
  ideal: string | null;
  sales_angle: string | null;
  source_url: string | null;
  last_seen_at: string;
}

const CATEGORY_TH: Record<string, string> = {
  life: 'ประกันชีวิตชั่วระยะเวลา',
  whole_life: 'ตลอดชีพ',
  health: 'สุขภาพ',
  ci: 'โรคร้ายแรง (CI)',
  retirement: 'บำนาญ / เกษียณ',
  savings: 'สะสมทรัพย์',
  accident: 'อุบัติเหตุ',
  investment_linked: 'ประกันควบการลงทุน (Unit-Linked)',
};

/**
 * Find company by acronym (code) or substring of name. Order matters —
 * we try exact code first, then fuzzy on display name + Thai partial.
 */
export async function findCompanyForAgent(
  supabase: SupabaseClient,
  agentCode?: string | null,
  agentDisplayName?: string | null,
): Promise<CompanyRow | null> {
  const hay = `${agentCode ?? ''} ${agentDisplayName ?? ''}`.toLowerCase();
  if (!hay.trim()) return null;

  const { data } = await supabase
    .from('insurance_companies')
    .select('id, code, name, website_url, research_url, last_synced_at, last_sync_status')
    .eq('active', true);
  if (!data) return null;

  // 1) Exact code match
  for (const c of data as any[]) {
    if (hay.includes(c.code.toLowerCase())) return c;
  }
  // 2) Name substring
  for (const c of data as any[]) {
    if (c.name && hay.includes(c.name.toLowerCase())) return c;
  }
  // 3) Common partials (Thai)
  const partials: Array<[string[], string]> = [
    [['กรุงเทพประกัน', 'bangkok life'], 'BLA'],
    [['เมืองไทย'], 'MTL'],
    [['ไทยประกัน'], 'TLI'],
    [['กรุงไทย', 'axa'], 'KTAXA'],
    [['อลิอันซ์'], 'ALLIANZ'],
  ];
  for (const [needles, code] of partials) {
    if (needles.some((n) => hay.includes(n))) {
      const found = (data as any[]).find((c) => c.code === code);
      if (found) return found;
    }
  }
  return null;
}

export async function getProductsForCompany(
  supabase: SupabaseClient,
  companyId: string,
  /** Optional category filter (license categories from agent.products[]) */
  agentCategories?: string[] | null,
): Promise<ProductRow[]> {
  let query = supabase
    .from('insurance_products')
    .select('id, company_id, name, alt_name, category, tagline, benefits, ideal, sales_angle, source_url, last_seen_at')
    .eq('company_id', companyId)
    .eq('active', true)
    .order('category')
    .order('name');
  const { data } = await query;
  let products = (data as ProductRow[]) ?? [];

  if (agentCategories && agentCategories.length > 0) {
    const allow = new Set<string>();
    for (const c of agentCategories) {
      const lc = c.toLowerCase();
      if (lc === 'life') {
        allow.add('life');
        allow.add('whole_life');
        allow.add('investment_linked');
      } else if (lc === 'health') allow.add('health');
      else if (lc === 'ci') allow.add('ci');
      else if (lc === 'retirement') allow.add('retirement');
      else if (lc === 'savings') allow.add('savings');
      else if (lc === 'accident') allow.add('accident');
    }
    products = products.filter((p) => allow.has(p.category));
  }
  return products;
}

/**
 * Render products as a Markdown block for system prompt injection.
 */
export function renderProductsForPrompt(
  company: CompanyRow,
  products: ProductRow[],
): string {
  if (!products.length) {
    return `# ผลิตภัณฑ์ของ ${company.name} (${company.code})\n*ยังไม่มีข้อมูลในระบบ — ระบบจะ sync จากเว็บไซต์อัตโนมัติ*`;
  }
  const lines: string[] = [];
  lines.push(`# ผลิตภัณฑ์ของ ${company.name} (${company.code}) ที่ตัวแทนคนนี้สามารถเสนอได้`);
  lines.push(`*ตอนแนะนำลูกค้า ใช้ชื่อจริงจากรายการนี้เท่านั้น ห้ามแต่งชื่อเอง*`);
  if (company.last_synced_at) {
    lines.push(`*ข้อมูล sync ล่าสุด: ${new Date(company.last_synced_at).toLocaleDateString('th-TH')}*`);
  }
  lines.push('');
  for (const p of products) {
    lines.push(
      `## ${p.name}${p.alt_name ? ` (${p.alt_name})` : ''} — ${CATEGORY_TH[p.category] ?? p.category}`,
    );
    if (p.tagline) lines.push(`- จุดขาย: ${p.tagline}`);
    if (p.benefits && Array.isArray(p.benefits) && p.benefits.length)
      lines.push(`- ประโยชน์: ${p.benefits.join(' · ')}`);
    if (p.ideal) lines.push(`- เหมาะกับ: ${p.ideal}`);
    if (p.sales_angle) lines.push(`- มุมขาย (sales angle): ${p.sales_angle}`);
    lines.push('');
  }
  return lines.join('\n');
}

export function formatFreshness(lastSyncedAt: string | null): string {
  if (!lastSyncedAt) return 'ยังไม่เคย sync';
  const ms = Date.now() - new Date(lastSyncedAt).getTime();
  const days = Math.floor(ms / 86400000);
  if (days < 1) {
    const h = Math.floor(ms / 3600000);
    return h < 1 ? 'อัพเดตล่าสุดเมื่อสักครู่' : `อัพเดตล่าสุด ${h} ชั่วโมงก่อน`;
  }
  if (days < 7) return `อัพเดตล่าสุด ${days} วันก่อน`;
  if (days < 30) return `อัพเดตล่าสุด ${Math.floor(days / 7)} สัปดาห์ก่อน`;
  return `อัพเดตล่าสุด ${Math.floor(days / 30)} เดือนก่อน`;
}
