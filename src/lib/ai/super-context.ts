// ─────────────────────────────────────────────────────────
// Super Context — wraps the advisor's comprehensive snapshot
// for use in the chat AI (with privacy mode support).
// Falls back gracefully if the snapshot can't be built.
// ─────────────────────────────────────────────────────────

import { buildAdvisorSnapshot, snapshotToMarkdown } from '@/lib/advisor/context';

export async function buildSuperContext(privacyMode: boolean): Promise<string> {
  try {
    const snapshot = await buildAdvisorSnapshot();
    if (!snapshot) return '';

    let md = snapshotToMarkdown(snapshot);

    if (privacyMode) {
      // Anonymize personal identifiers
      md = md
        .replace(/^- ([^:(]+) \((life|health|critical_illness|accident|car|home|travel|other|term_life|whole_life)\):/gm, '- [policy] ($2):')
        .replace(/^- ([^(]+) \(thai_stock,/gm, '- [thai_stock] (thai_stock,')
        .replace(/^- ([^(]+) \(foreign_stock,/gm, '- [foreign_stock] (foreign_stock,')
        .replace(/^- ([^(]+) \(crypto,/gm, '- [crypto] (crypto,')
        .replace(/^- ([^(]+) \(mutual_fund,/gm, '- [fund] (mutual_fund,')
        .replace(/^- ([^(]+) \(etf,/gm, '- [etf] (etf,');
      // Replace goal names but keep [Emergency Fund] tag
      md = md.replace(/^- ([^[:]+):(.*\[Emergency Fund\])/gm, '- [emergency_goal]:$2');
      md = md.replace(/^- ([^[:]+) \[Emergency Fund\]:/gm, '- [emergency_goal] [Emergency Fund]:');
    }

    return md;
  } catch (e) {
    console.warn('buildSuperContext failed:', e);
    return '';
  }
}
