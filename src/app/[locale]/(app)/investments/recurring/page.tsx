import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Plus, Repeat, Trash2, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatTHB } from '@/lib/utils';
import { toggleRecurringInvestment, deleteRecurringInvestment } from './actions';

export const dynamic = 'force-dynamic';

interface RecRow {
  id: string;
  amount_per_run: number | null;
  quantity_per_run: number | null;
  day_of_month: number;
  is_active: boolean;
  next_run_on: string;
  last_run_on: string | null;
  total_runs: number;
  total_invested: number;
  note: string | null;
  investment: { id: string; symbol: string | null; name: string; type: string } | null;
}

export default async function RecurringInvestmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: rows } = await supabase
    .from('recurring_investments')
    .select(`
      id, amount_per_run, quantity_per_run, day_of_month, is_active,
      next_run_on, last_run_on, total_runs, total_invested, note,
      investment:investments(id, symbol, name, type)
    `)
    .order('is_active', { ascending: false })
    .order('next_run_on');

  const list = (rows ?? []) as unknown as RecRow[];
  const totalInvestedAll = list.reduce((s, r) => s + Number(r.total_invested ?? 0), 0);
  const totalRuns = list.reduce((s, r) => s + Number(r.total_runs ?? 0), 0);
  const activeCount = list.filter((r) => r.is_active).length;

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
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Repeat className="h-5 w-5 text-primary" />
              DCA อัตโนมัติ
            </h1>
            <p className="text-xs text-muted-foreground">บันทึกการลงทุนรายเดือนอัตโนมัติ</p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href="/investments/recurring/new">
            <Plus className="mr-1 h-4 w-4" />
            เพิ่ม
          </Link>
        </Button>
      </header>

      {list.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Active</p>
              <p className="text-lg font-bold">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">รอบทั้งหมด</p>
              <p className="text-lg font-bold">{totalRuns}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">ยอดสะสม</p>
              <p className="text-lg font-bold">{formatTHB(totalInvestedAll)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <Repeat className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">ยังไม่มี DCA อัตโนมัติ</p>
            <p className="mt-1 text-xs text-muted-foreground">
              ตั้งค่าให้ระบบบันทึกการซื้อรายเดือนแบบอัตโนมัติ — ไม่ต้องบันทึกเองทุกเดือน
            </p>
            <Button asChild className="mt-4">
              <Link href="/investments/recurring/new">
                <Plus className="mr-1 h-4 w-4" />
                เริ่มต้น DCA
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((r) => (
            <Card key={r.id} className={!r.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold">
                        {r.investment?.symbol ?? r.investment?.name ?? '—'}
                      </span>
                      {!r.is_active && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          หยุดชั่วคราว
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.amount_per_run
                        ? `${formatTHB(Number(r.amount_per_run))} / รอบ`
                        : `${Number(r.quantity_per_run).toLocaleString()} หน่วย / รอบ`}
                      {' · '} ทุกวันที่ {r.day_of_month}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      รอบถัดไป: <span className="font-medium text-foreground">{r.next_run_on}</span>
                      {r.last_run_on && ` · ล่าสุด: ${r.last_run_on}`}
                    </p>
                    {r.total_runs > 0 && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        ลงทุนแล้ว {r.total_runs} รอบ · รวม {formatTHB(Number(r.total_invested))}
                      </p>
                    )}
                    {r.note && (
                      <p className="mt-1 text-[11px] italic text-muted-foreground">"{r.note}"</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <form action={toggleRecurringInvestment}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="is_active" value={String(r.is_active)} />
                      <Button
                        type="submit"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title={r.is_active ? 'หยุดชั่วคราว' : 'เปิดใช้งาน'}
                      >
                        {r.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>
                    </form>
                    <form action={deleteRecurringInvestment}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button
                        type="submit"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            💡 DCA อัตโนมัตินี้ทำอะไรได้
          </p>
          <ul className="mt-1 ml-4 list-disc space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
            <li>ทุกวันที่กำหนด ระบบจะสร้าง buy transaction อัตโนมัติ</li>
            <li>คำนวณ avg cost ใหม่อัตโนมัติ — ไม่ต้องบันทึกเอง</li>
            <li>ถ้ามี Symbol ดึงราคาตลาดล่าสุดจาก Yahoo Finance</li>
            <li>ถ้าไม่มี Symbol ใช้ราคาทุนหรือราคาปัจจุบันที่ตั้งไว้</li>
            <li><b>ไม่ได้</b>สั่งซื้อจริงผ่าน broker — คุณต้องไปซื้อใน Streaming เอง</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
