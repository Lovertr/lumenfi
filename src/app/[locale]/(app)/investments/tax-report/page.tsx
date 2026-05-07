import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, FileText, TrendingUp, TrendingDown, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getCapitalGainsReport, getYearsWithData } from '@/lib/queries/capital-gains';
import { YearPicker } from '@/components/investments/year-picker';
import { CSVDownloadButton } from '@/components/investments/csv-download-button';
import { formatTHB } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TaxReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const allYears = await getYearsWithData();
  const currentYear = new Date().getFullYear();
  const yearsList = allYears.length > 0 ? allYears : [currentYear];
  const selectedYear = sp.year ? parseInt(sp.year) : (yearsList[0] ?? currentYear);
  const summary = await getCapitalGainsReport(selectedYear);

  // Prepare CSV rows
  const salesCsv = summary.sales.map((s) => ({
    date: s.date,
    symbol: s.symbol ?? s.name,
    name: s.name,
    type: s.type,
    quantity: s.quantity,
    price_per_unit: s.price_per_unit,
    total_value: s.total_value,
    fee: s.fee,
    realized_pl: s.realized_pl,
  }));

  const divsCsv = summary.dividends.map((d) => ({
    pay_date: d.pay_date,
    symbol: d.symbol ?? d.name,
    name: d.name,
    amount: d.amount,
    withholding_tax: d.withholding_tax,
    net_amount: d.net_amount,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/investments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              รายงานกำไร/ขาดทุน
            </h1>
            <p className="text-xs text-muted-foreground">สำหรับใช้ยื่นภาษี ภ.ง.ด.</p>
          </div>
        </div>
      </header>

      {/* Year picker */}
      <div className="rounded-lg border bg-background p-3">
        <p className="mb-2 text-[11px] text-muted-foreground">เลือกปีภาษี</p>
        <YearPicker years={yearsList} current={selectedYear} />
      </div>

      {/* Summary hero */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {summary.totalRealizedPL >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <p className="text-sm font-semibold">กำไร/ขาดทุนจากการขาย</p>
            </div>
            <p className={`mt-2 text-2xl font-bold ${summary.totalRealizedPL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {summary.totalRealizedPL >= 0 ? '+' : ''}{formatTHB(summary.totalRealizedPL)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              จาก {summary.salesCount} รายการขาย · ยอดขายรวม {formatTHB(summary.totalSales)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-semibold">เงินปันผลรับ</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-success">
              +{formatTHB(summary.totalDividendsNet)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {summary.dividendCount} รายการ · หัก ณ ที่จ่าย {formatTHB(summary.totalWithholdingTax)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales section */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">รายการขาย ({summary.salesCount})</h2>
              <p className="text-[11px] text-muted-foreground">Realized capital gains/losses</p>
            </div>
            <CSVDownloadButton
              filename={`lumenfi-sales-${selectedYear}.csv`}
              rows={salesCsv}
              headers={[
                { key: 'date', label: 'วันที่' },
                { key: 'symbol', label: 'Symbol' },
                { key: 'name', label: 'ชื่อ' },
                { key: 'type', label: 'ประเภท' },
                { key: 'quantity', label: 'จำนวน' },
                { key: 'price_per_unit', label: 'ราคา/หน่วย' },
                { key: 'total_value', label: 'มูลค่ารวม' },
                { key: 'fee', label: 'ค่าธรรมเนียม' },
                { key: 'realized_pl', label: 'กำไร/ขาดทุน' },
              ]}
            />
          </div>

          {summary.sales.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
              ไม่มีรายการขายในปีนี้
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">วันที่</th>
                    <th className="px-2 py-2 font-medium">Symbol</th>
                    <th className="px-2 py-2 text-right font-medium">จำนวน</th>
                    <th className="px-2 py-2 text-right font-medium">ราคา</th>
                    <th className="px-2 py-2 text-right font-medium">มูลค่า</th>
                    <th className="px-2 py-2 text-right font-medium">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.sales.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-2 py-2">{s.date}</td>
                      <td className="px-2 py-2 font-mono">{s.symbol ?? s.name}</td>
                      <td className="px-2 py-2 text-right">{s.quantity.toLocaleString()}</td>
                      <td className="px-2 py-2 text-right">{formatTHB(s.price_per_unit)}</td>
                      <td className="px-2 py-2 text-right">{formatTHB(s.total_value)}</td>
                      <td className={`px-2 py-2 text-right font-semibold ${s.realized_pl >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {s.realized_pl >= 0 ? '+' : ''}{formatTHB(s.realized_pl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dividends section */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">เงินปันผล ({summary.dividendCount})</h2>
              <p className="text-[11px] text-muted-foreground">Dividend income (ใช้ยื่นภาษี เลือกหัก ณ ที่จ่ายขาด)</p>
            </div>
            <CSVDownloadButton
              filename={`lumenfi-dividends-${selectedYear}.csv`}
              rows={divsCsv}
              headers={[
                { key: 'pay_date', label: 'วันจ่าย' },
                { key: 'symbol', label: 'Symbol' },
                { key: 'name', label: 'ชื่อ' },
                { key: 'amount', label: 'ปันผลก่อนหัก' },
                { key: 'withholding_tax', label: 'ภาษีหัก ณ ที่จ่าย' },
                { key: 'net_amount', label: 'รับสุทธิ' },
              ]}
            />
          </div>

          {summary.dividends.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
              ไม่มีเงินปันผลในปีนี้
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">วันจ่าย</th>
                    <th className="px-2 py-2 font-medium">Symbol</th>
                    <th className="px-2 py-2 text-right font-medium">ปันผล</th>
                    <th className="px-2 py-2 text-right font-medium">หัก ณ ที่จ่าย</th>
                    <th className="px-2 py-2 text-right font-medium">รับสุทธิ</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.dividends.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="px-2 py-2">{d.pay_date}</td>
                      <td className="px-2 py-2 font-mono">{d.symbol ?? d.name}</td>
                      <td className="px-2 py-2 text-right">{formatTHB(d.amount)}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{formatTHB(d.withholding_tax)}</td>
                      <td className="px-2 py-2 text-right font-semibold text-success">+{formatTHB(d.net_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            ⚠️ ข้อสังเกตในการยื่นภาษี
          </p>
          <ul className="mt-1 ml-4 list-disc space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
            <li>กำไรขายหุ้นในตลาดหลักทรัพย์ฯ ไทยปกติได้รับยกเว้นภาษี (Capital gains tax exempt)</li>
            <li>เงินปันผลหุ้นไทยถ้ายอม "ไม่ขอเครดิตภาษี" ก็จบ — หัก ณ ที่จ่าย 10% ถือว่าจบ</li>
            <li>ถ้านำมารวมคำนวณภาษี: ได้สิทธิ "เครดิตภาษีเงินปันผล" แต่ต้องคำนวณตามฐานภาษี</li>
            <li>ลงทุนต่างประเทศ: กำไรและปันผลต้องเสียภาษี (Section 41)</li>
            <li>Crypto: นับเป็นเงินได้ตามมาตรา 40(4)(ฌ)/(ญ) — หัก ณ ที่จ่าย 15%</li>
            <li>* รายงานนี้เป็นเครื่องมือช่วย ไม่ใช่คำแนะนำภาษี ปรึกษาผู้เชี่ยวชาญสำหรับกรณีของคุณ</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
