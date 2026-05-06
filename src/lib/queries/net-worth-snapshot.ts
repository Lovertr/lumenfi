// ─────────────────────────────────────────────────────────
// Net worth daily snapshot
// Records (or upserts) today's total assets and liabilities
// ─────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';
import { getAccountBalanceMap } from './balances';
import { accountTypeConfig, type AccountType } from '@/components/accounts/account-type-config';

export async function snapshotTodayForUser(userId: string) {
  const supabase = createClient();

  const [accountsR, debtsR, investmentsR] = await Promise.all([
    supabase.from('accounts').select('id, type, include_in_net_worth').eq('user_id', userId).eq('archived', false),
    supabase.from('debts').select('current_balance').eq('user_id', userId),
    supabase.from('investments').select('quantity, current_price').eq('user_id', userId),
  ]);

  const accounts = accountsR.data ?? [];
  const debts = debtsR.data ?? [];
  const investments = investmentsR.data ?? [];

  const balances = await getAccountBalanceMap();
  const balOf = (id: string) => balances[id] ?? 0;

  const accountAssets = accounts
    .filter((a) => !accountTypeConfig[a.type as AccountType]?.isLiability && a.include_in_net_worth)
    .reduce((s, a) => s + balOf(a.id), 0);

  const accountLiabilities = accounts
    .filter((a) => accountTypeConfig[a.type as AccountType]?.isLiability && a.include_in_net_worth)
    .reduce((s, a) => s + balOf(a.id), 0);

  const investmentValue = investments.reduce((s, i) => s + Number(i.quantity ?? 0) * Number(i.current_price ?? 0), 0);
  const externalDebt = debts.reduce((s, d) => s + Number(d.current_balance ?? 0), 0);

  const totalAssets = accountAssets + investmentValue;
  const totalLiabilities = accountLiabilities + externalDebt;
  const netWorth = totalAssets - totalLiabilities;

  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from('net_worth_snapshots').upsert(
    {
      user_id: userId,
      date: today,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      net_worth: netWorth,
    },
    { onConflict: 'user_id,date' }
  );

  if (error) {
    console.error('snapshotTodayForUser:', error);
  }

  return { totalAssets, totalLiabilities, netWorth };
}

export async function getNetWorthHistory(userId: string, daysBack = 90) {
  const supabase = createClient();
  const since = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from('net_worth_snapshots')
    .select('date, total_assets, total_liabilities, net_worth')
    .eq('user_id', userId)
    .gte('date', since)
    .order('date');
  return data ?? [];
}
