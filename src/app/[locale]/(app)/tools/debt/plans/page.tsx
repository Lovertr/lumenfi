import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, ListChecks, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const STRATEGY_LABEL: Record<string, string> = {
  avalanche: 'Avalanche',
  snowball: 'Snowball',
};

export default async function DebtPlanHistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/' + locale + '/login');

  const { data: plans } = await supabase
    .from('debt_plans')
    .select('id, strategy, extra_per_month, total_months, total_interest, is_active, created_at, selected_option_id, plan_options')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  function planTitle(p: any): string {
    const opts = Array.isArray(p.plan_options) ? p.plan_options : [];
    const sel = opts.find((o: any) => o.id === p.selected_option_id);
    if (sel?.title) return sel.title;
    return `แผน ${STRATEGY_LABEL[p.strategy] ?? p.strategy}`;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/tools/debt">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <ListChecks className="h-5 w-5 text-primary" />
            ประวัติแผนชำระหนี้
          </h1>
          <p className="text-xs text-muted-foreground">
            แผนทั้งหมดที่คุณเคยบันทึก (ล่าสุดอยู่บน)
          </p>
        </div>
      </header>

      {!plans || plans.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm text-muted-foreground">
              ยังไม่มีแผนที่บันทึกไว้
            </p>
            <Button asChild className="mt-4">
              <Link href="/tools/debt">เริ่มวิเคราะห์แผนแรก</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {plans.map((p: any) => {
            const d = new Date(p.created_at);
            return (
              <Link
                key={p.id}
                href={`/tools/debt/plans/${p.id}` as any}
                className="block"
              >
                <Card className="transition-all hover:border-primary/40 hover:shadow-sm">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {p.is_active ? <Star className="h-4 w-4 fill-current" /> : <ListChecks className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        {planTitle(p)}
                        {p.is_active && (
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            ใช้งานอยู่
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {d.toLocaleDateString('th-TH')} ·{' '}
                        โปะเพิ่ม ฿{Number(p.extra_per_month).toLocaleString()} ·{' '}
                        {p.total_months ? `${p.total_months} เดือน` : '—'} ·{' '}
                        ดอกรวม ฿{Number(p.total_interest ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-none text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
