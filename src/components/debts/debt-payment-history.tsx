import { ArrowDown, Pencil, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatTHB } from '@/lib/utils';

interface Tx {
  id: string;
  amount: number;
  date: string;
  note: string | null;
  debt_principal_amount: number | null;
  debt_interest_amount: number | null;
  account: { name: string; color: string } | null;
}

interface Adj {
  id: string;
  new_balance: number;
  previous_balance: number;
  delta: number;
  reason: string | null;
  created_at: string;
}

type Event =
  | ({ kind: 'payment' } & Tx)
  | ({ kind: 'adjustment' } & Adj);

async function loadHistory(debtId: string): Promise<Event[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const [txRes, adjRes] = await Promise.all([
    supabase
      .from('transactions')
      .select(
        'id, amount, date, note, debt_principal_amount, debt_interest_amount, account:accounts ( name, color )'
      )
      .eq('debt_id', debtId)
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(50),
    supabase
      .from('debt_balance_adjustments')
      .select('id, new_balance, previous_balance, delta, reason, created_at')
      .eq('debt_id', debtId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const txs = (txRes.data ?? []).map((t: any) => ({
    kind: 'payment' as const,
    ...t,
    account: Array.isArray(t.account) ? t.account[0] ?? null : t.account,
  }));
  const adjs = (adjRes.data ?? []).map((a: any) => ({
    kind: 'adjustment' as const,
    ...a,
  }));

  const events: Event[] = [...txs, ...adjs];
  events.sort((a, b) => {
    const ad = a.kind === 'payment' ? a.date : a.created_at.slice(0, 10);
    const bd = b.kind === 'payment' ? b.date : b.created_at.slice(0, 10);
    return ad < bd ? 1 : ad > bd ? -1 : 0;
  });

  return events;
}

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

export async function DebtPaymentHistory({ debtId }: { debtId: string }) {
  const events = await loadHistory(debtId);

  if (events.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-5 text-center">
          <p className="text-sm font-semibold">ยังไม่มีประวัติการชำระ</p>
          <p className="mt-1 text-xs text-muted-foreground">
            เมื่อบันทึกรายการ "ชำระหนี้" และเลือกหนี้นี้ ประวัติจะปรากฏที่นี่
          </p>
        </CardContent>
      </Card>
    );
  }

  // Aggregate totals
  const paymentEvents = events.filter((e) => e.kind === 'payment') as (Tx & { kind: 'payment' })[];
  const totalPaid = paymentEvents.reduce((s, e) => s + Number(e.amount), 0);
  const totalPrincipal = paymentEvents.reduce(
    (s, e) => s + Number(e.debt_principal_amount ?? 0),
    0
  );
  const totalInterest = paymentEvents.reduce(
    (s, e) => s + Number(e.debt_interest_amount ?? 0),
    0
  );

  return (
    <div className="space-y-3">
      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-[10px] uppercase text-muted-foreground">จ่ายไปแล้ว</p>
          <p className="mt-1 text-sm font-bold">{formatTHB(totalPaid)}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
          <p className="text-[10px] uppercase text-emerald-700 dark:text-emerald-300">
            ลดต้นรวม
          </p>
          <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
            {formatTHB(totalPrincipal)}
          </p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
          <p className="text-[10px] uppercase text-amber-700 dark:text-amber-300">ดอกรวม</p>
          <p className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-300">
            {formatTHB(totalInterest)}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {events.map((e) => {
              if (e.kind === 'payment') {
                return (
                  <div key={`tx-${e.id}`} className="flex items-start gap-3 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                      <ArrowDown className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold">ชำระหนี้</p>
                        <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                          −{formatTHB(Number(e.amount))}
                        </p>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {fmtDate(e.date)}
                        {e.account && (
                          <>
                            {' · '}
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: e.account.color }}
                              />
                              {e.account.name}
                            </span>
                          </>
                        )}
                      </p>
                      {(e.debt_principal_amount != null || e.debt_interest_amount != null) && (
                        <div className="mt-1.5 flex gap-3 text-[10px]">
                          <span className="text-emerald-700 dark:text-emerald-300">
                            ลดต้น {formatTHB(Number(e.debt_principal_amount ?? 0))}
                          </span>
                          <span className="text-amber-700 dark:text-amber-300">
                            ดอก {formatTHB(Number(e.debt_interest_amount ?? 0))}
                          </span>
                        </div>
                      )}
                      {e.note && (
                        <p className="mt-1 text-[11px] italic text-muted-foreground">
                          "{e.note}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              const a = e;
              const isUp = a.delta > 0;
              return (
                <div key={`adj-${a.id}`} className="flex items-start gap-3 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    <Pencil className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold">ปรับยอดด้วยตนเอง</p>
                      <p
                        className={
                          'flex items-center gap-1 text-sm font-bold ' +
                          (isUp
                            ? 'text-rose-700 dark:text-rose-300'
                            : 'text-emerald-700 dark:text-emerald-300')
                        }
                      >
                        {isUp ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {isUp ? '+' : ''}
                        {formatTHB(Number(a.delta))}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {fmtDate(a.created_at)} · จาก {formatTHB(Number(a.previous_balance))} →{' '}
                      {formatTHB(Number(a.new_balance))}
                    </p>
                    {a.reason && (
                      <p className="mt-1 text-[11px] italic text-muted-foreground">
                        "{a.reason}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
