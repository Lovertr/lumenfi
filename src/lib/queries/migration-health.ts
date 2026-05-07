// ─────────────────────────────────────────────────────────
// Migration health check — detect missing tables/columns
// from migrations 12-16. Used to alert user when DB is stale.
// ─────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';

export interface MigrationCheck {
  migration: string;
  description: string;
  required: { table: string; column?: string }[];
  applied: boolean;
  missing: string[];
}

const MIGRATIONS: Omit<MigrationCheck, 'applied' | 'missing'>[] = [
  {
    migration: '12_investment_overhaul',
    description: 'Investment transactions, dividends, watchlist, snapshots',
    required: [
      { table: 'investment_transactions' },
      { table: 'investment_dividends' },
      { table: 'investment_watchlist' },
      { table: 'portfolio_snapshots' },
      { table: 'investments', column: 'is_tax_saving' },
      { table: 'investments', column: 'goal_id' },
    ],
  },
  {
    migration: '13_recurring_investments',
    description: 'DCA Auto scheduler',
    required: [{ table: 'recurring_investments' }],
  },
  {
    migration: '14_advisor_reports',
    description: 'AI Advisor reports + Secretary tracker',
    required: [
      { table: 'advisor_reports' },
      { table: 'profiles', column: 'secretary_last_notified_on' },
    ],
  },
  {
    migration: '15_versions',
    description: 'App version system + spotlight',
    required: [
      { table: 'app_versions' },
      { table: 'profiles', column: 'last_seen_version' },
      { table: 'profiles', column: 'dismissed_spotlights' },
    ],
  },
  {
    migration: '16_help_articles_new_features',
    description: 'New help articles',
    required: [],
  },
];

/**
 * Probe the schema by attempting harmless SELECT 1 against the required
 * tables/columns. Anything that errors is considered missing.
 */
export async function checkMigrations(): Promise<MigrationCheck[]> {
  const supabase = createClient();
  const result: MigrationCheck[] = [];

  for (const mig of MIGRATIONS) {
    const missing: string[] = [];

    for (const req of mig.required) {
      try {
        if (req.column) {
          const { error } = await supabase.from(req.table).select(req.column).limit(1);
          if (error) missing.push(`${req.table}.${req.column}`);
        } else {
          const { error } = await supabase.from(req.table).select('*').limit(1);
          if (error) missing.push(req.table);
        }
      } catch {
        missing.push(req.column ? `${req.table}.${req.column}` : req.table);
      }
    }

    // Special check for 16: count help_articles tagged with new sort_order range
    if (mig.migration === '16_help_articles_new_features') {
      try {
        const { count } = await supabase
          .from('help_articles')
          .select('id', { count: 'exact', head: true })
          .gte('sort_order', 100);
        if ((count ?? 0) < 5) {
          missing.push('new help articles');
        }
      } catch {
        missing.push('help_articles table');
      }
    }

    result.push({
      ...mig,
      applied: missing.length === 0,
      missing,
    });
  }

  return result;
}
