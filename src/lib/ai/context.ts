import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/queries/dashboard';

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

    return lines.join('\n');
  } catch (e) {
    console.warn('buildFinancialContext:', e);
    return '';
  }
}
