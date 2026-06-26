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
  created_at: string;
  account_id: string;
  to_account_id: string | null;
}

interface RawAdjustment {
  account_id: string;
  new_balance: number;
  effective_date: string;
  created_at: string;
}

const LIABILITY_TYPES = new Set(['credit_card']);

/**
 * Compute current balance per account.
 *
 * Snapshot rule:
 * - If the account has any balance adjustments, the most recent one
 *   (by effective_date) is treated as the starting balance and only
 *   transactions with date > effective_date accumulate on top of it.
 * - If no adjustment exists, initial_balance is the starting point
 *   and every transaction counts.
 *
 * Sign rules:
 *   ASSET (cash/bank/wallet/savings/other):
 *     +income, -expense, -transfer-OUT, +transfer-IN
 *   LIABILITY (credit_card):
 *     +expense (charge), -income (refund),
 *     +transfer-OUT (cash advance), -transfer-IN (payment)
 */
export function computeAccountBalances(
  accounts: RawAccount[],
  transactions: RawTx[],
  adjustments: RawAdjustment[] = []
): Record<string, number> {
  const balances: Record<string, number> = {};
  // For each account, track the cutoff date — transactions on/before this
  // date are absorbed by the snapshot (adjustment) and skipped.
  const snapshotCutoff: Record<string, string> = {};

  // Build account type lookup
  const accountType: Record<string, string> = {};
  for (const a of accounts) accountType[a.id] = a.type;

  // Find latest adjustment per account (by created_at — the actual moment
  // user set the balance, not the date they typed). This way every tx that
  // existed at the time of the adjustment is absorbed into it, including
  // any future-dated tx.
  const latestByAccount: Record<string, RawAdjustment> = {};
  for (const adj of adjustments) {
    const prev = latestByAccount[adj.account_id];
    if (!prev || adj.created_at > prev.created_at) {
      latestByAccount[adj.account_id] = adj;
    }
  }

  for (const a of accounts) {
    const adj = latestByAccount[a.id];
    if (adj) {
      // Treat absolute value as the asserted balance — for liability
      // accounts the displayed value is positive ("คงค้าง ฿X"), users
      // sometimes type it with a minus because the UI shows it in red.
      balances[a.id] = Math.abs(Number(adj.new_balance));
      snapshotCutoff[a.id] = adj.created_at;
    } else {
      balances[a.id] = Number(a.initial_balance ?? 0);
    }
  }

  for (const tx of transactions) {
    const amt = Number(tx.amount);

    // FROM-side
    if (tx.account_id && balances[tx.account_id] !== undefined) {
      const cutoff = snapshotCutoff[tx.account_id];
      // Use the tx's created_at — every tx that existed before the
      // adjustment is absorbed regardless of its (possibly backdated
      // or future-dated) date field.
      if (!cutoff || tx.created_at > cutoff) {
        const isLiab = LIABILITY_TYPES.has(accountType[tx.account_id]);
        if (tx.type === 'income') {
          balances[tx.account_id] += isLiab ? -amt : amt;
        } else if (tx.type === 'expense') {
          balances[tx.account_id] += isLiab ? amt : -amt;
        } else if (tx.type === 'transfer') {
          balances[tx.account_id] += isLiab ? amt : -amt;
        }
      }
    }

    // TO-side (transfer in)
    if (tx.type === 'transfer' && tx.to_account_id && balances[tx.to_account_id] !== undefined) {
      const cutoff = snapshotCutoff[tx.to_account_id];
      if (!cutoff || tx.created_at > cutoff) {
        const isLiab = LIABILITY_TYPES.has(accountType[tx.to_account_id]);
        balances[tx.to_account_id] += isLiab ? -amt : amt;
      }
    }
  }

  return balances;
}

/**
 * Server helper: fetch accounts + transactions + adjustments and compute balances.
 */
export async function getAccountBalanceMap(): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const [accRes, txRes, adjRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, type, initial_balance, created_at, archived')
      .eq('archived', false),
    supabase
      .from('transactions')
      .select('type, amount, date, created_at, account_id, to_account_id')
      .eq('user_id', user.id),
    supabase
      .from('account_balance_adjustments')
      .select('account_id, new_balance, effective_date, created_at')
      .eq('user_id', user.id),
  ]);

  return computeAccountBalances(
    (accRes.data ?? []) as RawAccount[],
    (txRes.data ?? []) as RawTx[],
    (adjRes.data ?? []) as RawAdjustment[]
  );
}
