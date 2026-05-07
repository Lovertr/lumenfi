import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/queries/dashboard';
import { getPortfolioMetrics } from '@/lib/queries/portfolio';
import { getTaxFundSummary } from '@/lib/queries/tax-saving';

/**
 * Build a financial context string to inject into the AI system prompt.
 * If `privacyMode` is true, anonymize merchant/people names.
 */
export async function buildFinancialContext(privacyMode: boolean): Promise<string> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return '';

    const dashboard = await getDashboardData();

    const [accountsRes, debtsRes, goalsRes] = await Promise.all([
      supabase
        .from('accounts')
        .select('name, type, initial_balance')
        .eq('archived', false),
      supabase
        .from('debts')
        .select('name, type, current_balance, interest_rate, monthly_payment, remaining_term')
        .eq('status', 'active'),
      supabase
        .from('goals')
        .select('name, target_amount, current_amount, deadline, is_emergency_fund')
        .eq('status', 'active'),
    ]);

    const lines: string[] = [];
    lines.push(`# User's Financial Snapshot (${new Date().toISOString().slice(0, 10)})`);

    lines.push('\n## Net Worth');
    lines.push(`- Total Assets: ฿${dashboard.totalAssets.toLocaleString()}`);
    lines.push(`- Total Liabilities: ฿${dashboard.totalLiabilities.toLocaleString()}`);
    lines.push(`- Net Worth: ฿${dashboard.netWorth.toLocaleString()}`);
    lines.push(`- Health Score: ${dashboard.healthScore}/100`);

    lines.push('\n## This Month');
    lines.push(`- Income: ฿${dashboard.monthIncome.toLocaleString()}`);
    lines.push(`- Expense: ฿${dashboard.monthExpense.toLocaleString()}`);
    lines.push(`- Savings Rate: ${(dashboard.savingsRate * 100).toFixed(1)}%`);
    lines.push(`- DTI Ratio: ${(dashboard.dti * 100).toFixed(1)}%`);
    lines.push(`- Emergency Fund: ${dashboard.emergencyFundMonths.toFixed(1)} months coverage`);

    if (dashboard.topCategories.length > 0) {
      lines.push('\n## Top Spending Categories (this month)');
      for (const cat of dashboard.topCategories) {
        lines.push(`- ${cat.name}: ฿${cat.amount.toLocaleString()}`);
      }
    }

    const accounts = (accountsRes.data ?? []) as any[];
    if (accounts.length > 0) {
      lines.push('\n## Accounts');
      for (const a of accounts) {
        const name = privacyMode ? `[${a.type}]` : a.name;
        lines.push(`- ${name} (${a.type}): ฿${Number(a.initial_balance).toLocaleString()}`);
      }
    }

    const debts = (debtsRes.data ?? []) as any[];
    if (debts.length > 0) {
      lines.push('\n## Active Debts');
      for (const d of debts) {
        const name = privacyMode ? `[${d.type}]` : d.name;
        lines.push(
          `- ${name} (${d.type}): ฿${Number(d.current_balance).toLocaleString()} balance, ${Number(d.interest_rate).toFixed(2)}% APR, ฿${Number(d.monthly_payment ?? 0).toLocaleString()}/mo`
        );
      }
    }

    const goals = (goalsRes.data ?? []) as any[];
    if (goals.length > 0) {
      lines.push('\n## Active Goals');
      for (const g of goals) {
        const pct = (Number(g.current_amount) / Number(g.target_amount)) * 100;
        const tag = g.is_emergency_fund ? ' [Emergency Fund]' : '';
        lines.push(
          `- ${g.name}${tag}: ฿${Number(g.current_amount).toLocaleString()}/฿${Number(g.target_amount).toLocaleString()} (${pct.toFixed(0)}%)${g.deadline ? `, deadline ${g.deadline}` : ''}`
        );
      }
    }

    // ── Investments
    try {
      const portfolio = await getPortfolioMetrics();
      if (portfolio.holdings.length > 0) {
        lines.push('\n## Investment Portfolio');
        lines.push(`- Total Value (THB): ฿${Math.round(portfolio.totalValue).toLocaleString()}`);
        lines.push(`- Total Cost (THB): ฿${Math.round(portfolio.totalCost).toLocaleString()}`);
        lines.push(`- Unrealized P/L: ${portfolio.totalPL >= 0 ? '+' : ''}฿${Math.round(portfolio.totalPL).toLocaleString()} (${portfolio.totalPLPercent.toFixed(2)}%)`);
        lines.push(`- Holdings: ${portfolio.holdings.length} items`);

        // Allocation by type
        const typeEntries = Object.entries(portfolio.valueByType)
          .sort(([, a], [, b]) => Number(b) - Number(a))
          .slice(0, 6);
        if (typeEntries.length > 0 && portfolio.totalValue > 0) {
          lines.push('### Allocation by Type');
          for (const [t, v] of typeEntries) {
            const pct = (Number(v) / portfolio.totalValue) * 100;
            lines.push(`- ${t}: ${pct.toFixed(1)}% (฿${Math.round(Number(v)).toLocaleString()})`);
          }
        }

        // Allocation by currency (FX exposure signal)
        const curEntries = Object.entries(portfolio.valueByCurrency).sort(([, a], [, b]) => Number(b) - Number(a));
        if (curEntries.length > 0 && portfolio.totalValue > 0) {
          lines.push('### FX Exposure');
          for (const [c, v] of curEntries) {
            const pct = (Number(v) / portfolio.totalValue) * 100;
            if (pct >= 1) lines.push(`- ${c}: ${pct.toFixed(1)}%`);
          }
        }

        // Top holdings (helps the AI reason about concentration)
        const top = portfolio.holdings.slice(0, 5);
        lines.push('### Top Holdings');
        for (const h of top) {
          const sym = privacyMode ? `[${h.type}]` : (h.symbol ?? h.name);
          const pct = portfolio.totalValue > 0 ? (h.valueTHB / portfolio.totalValue) * 100 : 0;
          lines.push(
            `- ${sym} (${h.type}, ${h.currency}): ฿${Math.round(h.valueTHB).toLocaleString()} = ${pct.toFixed(1)}% of portfolio, P/L ${h.plPercent >= 0 ? '+' : ''}${h.plPercent.toFixed(1)}%`
          );
        }

        // Tax-saving funds summary
        const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
        const tax = await getTaxFundSummary(yearStart);
        if (tax.holdings.length > 0) {
          lines.push('### Tax-Saving Funds');
          lines.push(`- Total contributed this year: ฿${Math.round(tax.totalContributedThisYear).toLocaleString()}`);
          lines.push(`- Total value: ฿${Math.round(tax.totalValueAll).toLocaleString()}`);
          for (const [type, agg] of Object.entries(tax.byType)) {
            const a = agg as { count: number; cost: number; value: number };
            if (a.count > 0) lines.push(`- ${type.toUpperCase()}: ${a.count} fund(s), cost ฿${Math.round(a.cost).toLocaleString()}, value ฿${Math.round(a.value).toLocaleString()}`);
          }
        }
      }
    } catch (e) {
      console.warn('investment context:', e);
    }

    return lines.join('\n');
  } catch (e) {
    console.warn('buildFinancialContext:', e);
    return '';
  }
}
