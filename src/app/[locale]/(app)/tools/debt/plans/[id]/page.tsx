import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect, notFound } from 'next/navigation';
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  Check,
  X,
  AlertTriangle,
  Star,
  ListChecks,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { renderMarkdown } from '@/lib/markdown';

export const dynamic = 'force-dynamic';

interface PlanOption {
  id: string;
  title: string;
  strategy: string;
  extra_per_month: number;
  expected_months: number;
  total_interest: number;
  summary?: string;
  steps?: string[];
  pros?: string[];
  cons?: string[];
  recommended?: boolean;
}

const STRATEGY_LABEL: Record<string, string> = {
  avalanche: 'Avalanche (โปะดอกสูงก่อน)',
  snowball: 'Snowball (โปะก้อนเล็กก่อน)',
  consolidate: 'รวมหนี้ (Consolidation)',
  refinance: 'Refinance (รีไฟแนนซ์)',
  debt_clinic: 'คลินิกแก้หนี้ ธปท.',
  min_only: 'จ่ายขั้นต่ำตามตาราง',
};

function splitAdviceAndPlans(raw: string | null) {
  if (!raw) return { advice: '', plans: [] as PlanOption[] };
  const m = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!m) return { advice: raw, plans: [] };
  const advice = raw.replace(/```json\s*[\s\S]*?\s*```/i, '').trim();
  try {
    const parsed = JSON.parse(m[1]);
    return { advice, plans: Array.isArray(parsed?.plans) ? (parsed.plans as PlanOption[]) : [] };
  } catch {
    return { advice, plans: [] };
  }
}

export default async function DebtPlanDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('DebtCalc');

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/' + locale + '/login');

  const { data: plan } = await supabase
    .from('debt_plans')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!plan) notFound();

  // Prefer the persisted plan_options if available; else parse from ai_advice_md
  let plans: PlanOption[] = [];
  let advice = '';
  if (Array.isArray((plan as any).plan_options) && (plan as any).plan_options.length > 0) {
    plans = (plan as any).plan_options as PlanOption[];
    // Still split advice (without trailing JSON block) for clean display
    const split = splitAdviceAndPlans((plan as any).ai_advice_md);
    advice = split.advice;
  } else {
    const split = splitAdviceAndPlans((plan as any).ai_advice_md);
    advice = split.advice;
    plans = split.plans;
  }

  const selectedId = (plan as any).selected_option_id as string | null;
  const selectedPlan = plans.find((p) => p.id === selectedId) ?? plans[0] ?? null;

  const createdAt = new Date((plan as any).created_at);
  const isActive = (plan as any).is_active === true;

  const periodWord = (plan as any)?.snapshot?.pay_cycle?.day ? 'งวด' : 'เดือน';

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/tools/debt">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <CreditCard className="h-5 w-5 text-primary" />
            {selectedPlan?.title ?? 'แผนชำระหนี้'}
          </h1>
          <p className="text-xs text-muted-foreground">
            บันทึกเมื่อ {createdAt.toLocaleDateString('th-TH')} ·{' '}
            {isActive ? (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                ใช้งานอยู่
              </span>
            ) : (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                ประวัติ
              </span>
            )}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/tools/debt/plans">
            <ListChecks className="mr-1 h-3.5 w-3.5" />
            ดูประวัติ
          </Link>
        </Button>
      </header>

      {/* Headline metrics */}
      {selectedPlan && (
        <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-amber-50/30">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                {selectedPlan.recommended && (
                  <Star className="h-5 w-5 text-amber-500 fill-amber-400" />
                )}
                <div>
                  <p className="text-base font-bold">{selectedPlan.title}</p>
                  {selectedPlan.summary && (
                    <p className="mt-1 text-sm text-muted-foreground">{selectedPlan.summary}</p>
                  )}
                  <span className="mt-2 inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {STRATEGY_LABEL[selectedPlan.strategy] ?? selectedPlan.strategy}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4 text-center text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">โปะเพิ่ม</p>
                <p className="mt-1 text-base font-bold">
                  ฿{selectedPlan.extra_per_month.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">/{periodWord}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ระยะเวลา</p>
                <p className="mt-1 text-base font-bold">
                  {selectedPlan.expected_months >= 12
                    ? `${Math.floor(selectedPlan.expected_months / 12)} ปี ${selectedPlan.expected_months % 12} เดือน`
                    : `${selectedPlan.expected_months} เดือน`}
                </p>
                <p className="text-[10px] text-muted-foreground">ปลดหนี้</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ดอกรวม</p>
                <p className="mt-1 text-base font-bold text-rose-600">
                  ฿{selectedPlan.total_interest.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">ตลอดสัญญา</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steps + Pros + Cons */}
      {selectedPlan && (
        <div className="grid gap-3 lg:grid-cols-2">
          {selectedPlan.steps && selectedPlan.steps.length > 0 && (
            <Card className="lg:col-span-2">
              <CardContent className="p-5">
                <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                  <ListChecks className="h-4 w-4 text-primary" />
                  ขั้นตอนปฏิบัติ
                </p>
                <ol className="ml-5 list-decimal space-y-2 text-sm text-foreground">
                  {selectedPlan.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {selectedPlan.pros && selectedPlan.pros.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardContent className="p-5">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-900">
                  <TrendingUp className="h-4 w-4" />
                  ข้อดี
                </p>
                <ul className="space-y-1.5 text-sm text-emerald-900/85">
                  {selectedPlan.pros.map((p, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-600" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {selectedPlan.cons && selectedPlan.cons.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/30">
              <CardContent className="p-5">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-900">
                  <TrendingDown className="h-4 w-4" />
                  ข้อระวัง
                </p>
                <ul className="space-y-1.5 text-sm text-amber-900/85">
                  {selectedPlan.cons.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-600" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Other plans presented (collapsed) */}
      {plans.length > 1 && (
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-sm font-semibold">แผนทางเลือกอื่น</p>
            <div className="space-y-2">
              {plans
                .filter((p) => p.id !== selectedId)
                .map((p) => (
                  <details key={p.id} className="rounded-md border bg-muted/30 p-3 text-xs">
                    <summary className="cursor-pointer font-medium">
                      {p.title}
                      <span className="ml-2 text-muted-foreground">
                        · ฿{p.extra_per_month.toLocaleString()}/{periodWord} · {p.expected_months} ด.
                      </span>
                    </summary>
                    <p className="mt-2 text-muted-foreground">{p.summary}</p>
                  </details>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full markdown analysis */}
      {advice && (
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-sm font-semibold">📑 บทวิเคราะห์ AI ฉบับเต็ม</p>
            <div className="prose prose-sm max-w-none">
              {renderMarkdown(advice)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Snapshot at save time */}
      {(plan as any).snapshot && (
        <Card className="border-muted">
          <CardContent className="p-5">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              ข้อมูล ณ วันที่บันทึก
            </p>
            <p className="text-[11px] text-muted-foreground">
              ข้อมูลเหล่านี้คือสถานะการเงินของคุณตอนสร้างแผนนี้ — เก็บไว้สำหรับเปรียบเทียบกับวันนี้
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-primary">ดูรายละเอียด snapshot</summary>
              <pre className="mt-2 overflow-x-auto rounded-md bg-muted/50 p-3 text-[10px] leading-relaxed">
                {JSON.stringify((plan as any).snapshot, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
