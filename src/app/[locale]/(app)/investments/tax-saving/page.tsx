import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Receipt, Lock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getTaxFundSummary, TAX_FUND_LABELS } from '@/lib/queries/tax-saving';
import { TaxFundProgress } from '@/components/investments/tax-fund-progress';
import { formatTHB } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TaxSavingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const summary = await getTaxFundSummary(yearStart);

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
            <h1 className="text-xl font-bold">กองทุนลดหย่อนภาษี</h1>
            <p className="text-xs text-muted-foreground">RMF · SSF · PVD · กบข.</p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs opacity-80">มูลค่ารวม (กองทุนลดหย่อน)</p>
            <p className="text-2xl font-bold">{formatTHB(summary.totalValueAll)}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="opacity-70">สมทบปีนี้</p>
            <p className="mt-0.5 font-semibold">{formatTHB(summary.totalContributedThisYear)}</p>
          </div>
          <div>
            <p className="opacity-70">จำนวนกอง</p>
            <p className="mt-0.5 font-semibold">{summary.holdings.length} กอง</p>
          </div>
        </div>
      </div>

      <TaxFundProgress
        byType={summary.byType}
        totalContributedThisYear={summary.totalContributedThisYear}
      />

      {/* Holdings list */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">รายการกองทุน ({summary.holdings.length})</h2>
            <Button asChild size="sm" variant="outline">
              <Link href="/investments/new?tax_saving=1">
                <Plus className="mr-1 h-3.5 w-3.5" />
                เพิ่ม
              </Link>
            </Button>
          </div>

          {summary.holdings.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
              ยังไม่มีกองทุนลดหย่อนภาษี — เพิ่มเพื่อ track เพดาน + lock-in period
            </p>
          ) : (
            <div className="space-y-2">
              {summary.holdings.map((h) => (
                <Link key={h.id} href={`/investments/${h.id}`}>
                  <div className="rounded-lg border bg-background p-3 transition-colors hover:bg-muted/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {TAX_FUND_LABELS[h.tax_fund_type]}
                          </span>
                          <span className="truncate text-sm font-semibold">
                            {h.symbol ?? h.name}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">
                          {h.quantity.toLocaleString()} หน่วย · {formatTHB(h.cost)} ทุน
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold">{formatTHB(h.value)}</p>
                        <p className={`text-[11px] ${h.pl >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {h.pl >= 0 ? '+' : ''}{formatTHB(h.pl)}
                        </p>
                      </div>
                    </div>
                    {h.daysUntilUnlock !== null && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                        <Lock className="h-3 w-3 text-amber-500" />
                        <span className="text-muted-foreground">
                          {h.daysUntilUnlock === 0
                            ? 'ปลดล็อกแล้ว — ขายได้'
                            : `อีก ${h.daysUntilUnlock} วัน (${h.lock_in_until})`}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            ⚠️ Lock-in สำคัญ
          </p>
          <ul className="mt-1 ml-4 list-disc space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
            <li>SSF: ถือครบ 10 ปี (นับเป็นปีปฏิทิน)</li>
            <li>RMF: ถือ 5 ปี + อายุ 55 ปีขึ้นไปจึงขายได้ ห้ามขาดส่งเกิน 1 ปี</li>
            <li>PVD/กบข.: ตามเงื่อนไขของกองทุน — มักได้ตอนเกษียณ</li>
            <li>ขายก่อนกำหนด → คืนภาษีที่ลดหย่อนทั้งหมด + ดอกเบี้ย</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
