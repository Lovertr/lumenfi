import { createClient } from '@/lib/supabase/server';

interface RawAccount {
  id: string;
  type: string;
  initial_balance: number;
  created_at: string;
  archived?: boolean | null;
}

interface RawTx {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  account_id: string;
  to_account_id: string | null;
}

const LIABILITY_TYPES = new Set(['credit_card']);

/**
 * Compute current balance per account.
 *
 * Rules:
 * - initial_balance is treated as the snapshot ON account.created_at (typically the day the user added the account).
 * - Only transactions whose date >= account.created_at (date-only compare) are applied — earlier transactions are ignored
 *   to avoid double-counting.
 * - Sign rules:
 *   ASSET account (cash, bank, e_wallet, savings, other):
 *     +income, −expense, −transfer-OUT, +transfer-IN
 *   LIABILITY account (credit_card):
 *     +expense (charge), −income (refund/cashback),
 *     +transfer-OUT (cash advance), −transfer-IN (payment to card)
 */
export function computeAccountBalances(
  accounts: RawAccount[],
  transactions: RawTx[]
): Record<string, number> {
  const balances: Record<string, number> = {};

  for (const a of accounts) {
    balances[a.id] = Number(a.initial_balance ?? 0);
  }

  // Build account type lookup
  const accountType: Record<string, string> = {};
  for (const a of accounts) accountType[a.id] = a.type;

  // Cutoff removed — backdated tx (e.g. user enters last month's spend
  // after creating the card today) now count toward balance.
  for (const tx of transactions) {
    const amt = Number(tx.amount);

    // FROM-side
    if (tx.account_id && balances[tx.account_id] !== undefined) {
      const isLiab = LIABILITY_TYPES.has(accountType[tx.account_id]);
      if (tx.type === 'income') {
        balances[tx.account_id] += isLiab ? -amt : amt;
      } else if (tx.type === 'expense') {
        balances[tx.account_id] += isLiab ? amt : -amt;
      } else if (tx.type === 'transfer') {
        balances[tx.account_id] += isLiab ? amt : -amt;
      }
    }

    // TO-side (transfer in)
    if (tx.type === 'transfer' && tx.to_account_id && balances[tx.to_account_id] !== undefined) {
      const isLiab = LIABILITY_TYPES.has(accountType[tx.to_account_id]);
      balances[tx.to_account_id] += isLiab ? -amt : amt;
    }
  }

  return balances;
}

/**
 * Server helper: fetch accounts + relevant transactions then compute balances.
 */
export async function getAccountBalanceMap(): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const [accRes, txRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, type, initial_balance, created_at, archived')
      .eq('archived', false),
    supabase
      .from('transactions')
      .select('type, amount, date, account_id, to_account_id')
      .eq('user_id', user.id),
  ]);

  return computeAccountBalances(
    (accRes.data ?? []) as RawAccount[],
    (txRes.data ?? []) as RawTx[]
  );
}
