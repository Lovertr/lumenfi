import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { ArrowLeft, Edit, TrendingUp, TrendingDown, Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatTHB } from '@/lib/utils';
import { investmentTypeConfig, type InvestmentType } from '@/components/investments/investment-type-config';
import { PriceChart } from '@/components/investments/price-chart';

export const dynamic = 'force-dynamic';

export default async function InvestmentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: inv } = await supabase
    .from('investments')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!inv) notFound();

  // Transactions for this holding
  const { data: txs } = await supabase
    .from('investment_transactions')
    .select('id, type, quantity, price_per_unit, fee, total_value, date, note, realized_pl')
    .eq('investment_id', id)
    .order('date', { ascending: false });

  // Dividends for this holding
  const { data: divs } = await supabase
    .from('investment_dividends')
    .select('id, amount, withholding_tax, net_amount, pay_date, note')
    .eq('investment_id', id)
    .order('pay_date', { ascending: false });

  const qty = Number(inv.quantity);
  const avgCost = Number(inv.avg_cost);
  const currentPrice = inv.current_price !== null ? Number(inv.current_price) : avgCost;
  const cost = qty * avgCost;
  const value = qty * currentPrice;
  const pl = value - cost;
  const plPercent = cost > 0 ? (pl / cost) * 100 : 0;
  const totalDivs = (divs ?? []).reduce((s: number, d: any) => s + Number(d.net_amount ?? 0), 0);
  const totalRealized = (txs ?? []).reduce((s: number, t: any) => s + Number(t.realized_pl ?? 0), 0);
  const totalReturn = pl + totalRealized + totalDivs;
  const totalReturnPercent = cost > 0 ? (totalReturn / cost) * 100 : 0;

  const cfg = investmentTypeConfig[inv.type as InvestmentType] ?? investmentTypeConfig.other;
  const isProfit = pl >= 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/investments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{inv.symbol ?? inv.name}</h1>
            <p className="text-xs text-muted-foreground">{inv.name}</p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/investments/${id}/edit`}>
            <Edit className="mr-1 h-4 w-4" />
            แก้ไข
          </Link>
        </Button>
      </header>

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0F1F] to-[#1E293B] p-5 text-white lg:p-7">
        <div className="flex items-center gap-2">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${cfg.bg}`}>
            {cfg.icon}
          </div>
          <div>
            <p className="text-xs opacity-80">มูลค่าปัจจุบัน</p>
            <p className="text-2xl font-bold lg:text-3xl">{formatTHB(value)}</p>
          </div>
        </div>

        <div className={`mt-2 flex items-center gap-1 text-sm font-semibold ${isProfit ? 'text-[#10B981]' : 'text-[#FCA5A5]'}`}>
          {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {isProfit ? '+' : ''}{formatTHB(pl)} ({plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%)
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
          <div>
            <p className="opacity-70">จำนวน</p>
            <p className="mt-0.5 font-semibold">{qty.toLocaleString()}</p>
          </div>
          <div>
            <p className="opacity-70">ทุนเฉลี่ย</p>
            <p className="mt-0.5 font-semibold">{formatTHB(avgCost)}</p>
          </div>
          <div>
            <p className="opacity-70">ราคาปัจจุบัน</p>
            <p className="mt-0.5 font-semibold">{formatTHB(currentPrice)}</p>
          </div>
        </div>
      </div>

      {/* Total Return (incl. realized + dividends) */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">ผลตอบแทนรวม (Unrealized + Realized + Dividends)</p>
          <p className={`mt-1 text-xl font-bold ${totalReturn >= 0 ? 'text-success' : 'text-destructive'}`}>
            {totalReturn >= 0 ? '+' : ''}{formatTHB(totalReturn)} ({totalReturnPercent.toFixed(2)}%)
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-muted-foreground">Unrealized</p>
              <p className={`mt-0.5 font-semibold ${pl >= 0 ? 'text-success' : 'text-destructive'}`}>{formatTHB(pl)}</p>
            </div>
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-muted-foreground">Realized</p>
              <p className={`mt-0.5 font-semibold ${totalRealized >= 0 ? 'text-success' : 'text-destructive'}`}>{formatTHB(totalRealized)}</p>
            </div>
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-muted-foreground">Dividends</p>
              <p className="mt-0.5 font-semibold text-success">+{formatTHB(totalDivs)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price chart (Yahoo Finance) */}
      {inv.symbol && (
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-2 text-sm font-semibold">ราคาย้อนหลัง</h2>
            <PriceChart symbol={inv.symbol} type={inv.type} avgCost={avgCost} currency={inv.currency} />
          </CardContent>
        </Card>
      )}

      {/* Transactions log */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">ประวัติซื้อขาย ({(txs ?? []).length})</h2>
            <Button asChild size="sm" variant="outline">
              <Link href={`/investments/${id}/transactions/new`}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                เพิ่มรายการ
              </Link>
            </Button>
          </div>
          {(txs ?? []).length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              ยังไม่มีประวัติ — บันทึกการซื้อ/ขายเพื่อ track P/L แม่นยำขึ้น
            </p>
          ) : (
            <div className="space-y-1">
              {(txs ?? []).map((t: any) => {
                const isBuy = t.type === 'buy' || t.type === 'transfer_in';
                return (
                  <div key={t.id} className="flex items-center justify-between gap-2 rounded-md border bg-background p-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          isBuy ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {t.type === 'buy' ? 'ซื้อ' : t.type === 'sell' ? 'ขาย' : t.type === 'transfer_in' ? 'โอนเข้า' : 'โอนออก'}
                        </span>
                        <span className="text-xs text-muted-foreground">{t.date}</span>
                      </div>
                      <p className="mt-0.5 text-xs">
                        {Number(t.quantity).toLocaleString()} × {formatTHB(Number(t.price_per_unit))}
                        {Number(t.fee) > 0 && ` (ค่าธรรมเนียม ${formatTHB(Number(t.fee))})`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatTHB(Number(t.total_value))}</p>
                      {t.realized_pl !== null && (
                        <p className={`text-[11px] ${Number(t.realized_pl) >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {Number(t.realized_pl) >= 0 ? '+' : ''}{formatTHB(Number(t.realized_pl))}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dividends log */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">เงินปันผล ({(divs ?? []).length})</h2>
            <Button asChild size="sm" variant="outline">
              <Link href={`/investments/${id}/dividends/new`}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                บันทึก
              </Link>
            </Button>
          </div>
          {(divs ?? []).length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              ยังไม่มีเงินปันผล — บันทึกเมื่อรับเงินปันผลเพื่อคำนวณ yield
            </p>
          ) : (
            <div className="space-y-1">
              {(divs ?? []).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between gap-2 rounded-md border bg-background p-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{d.pay_date}</p>
                    <p className="text-[11px] text-muted-foreground">
                      หัก ณ ที่จ่าย {formatTHB(Number(d.withholding_tax))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success">+{formatTHB(Number(d.net_amount))}</p>
                    <p className="text-[11px] text-muted-foreground">หักก่อน: {formatTHB(Number(d.amount))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
