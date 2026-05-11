import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrintButton } from '@/components/insurance/print-button';
import { getInsuranceContext } from '@/lib/insurance/queries';
import { analyzeInsuranceGap } from '@/lib/insurance/gap-analyzer';
import { getAgentForUser } from '@/lib/agents/queries';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  life: 'ประกันชีวิต',
  health: 'ประกันสุขภาพ',
  critical_illness: 'ประกันโรคร้ายแรง',
  accident: 'ประกันอุบัติเหตุ',
  emergency_fund: 'เงินสำรองฉุกเฉิน',
};

const TYPE_ICON: Record<string, string> = {
  life: '👨‍👩‍👧',
  health: '🏥',
  critical_illness: '⚕️',
  accident: '🚑',
  emergency_fund: '💰',
};

const SEVERITY_META: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'จำเป็นมาก', color: '#DC2626', bg: '#FEE2E2' },
  recommended: { label: 'ควรมี', color: '#D97706', bg: '#FEF3C7' },
  optional: { label: 'ทางเลือก', color: '#2563EB', bg: '#DBEAFE' },
  covered: { label: 'มีอยู่แล้ว', color: '#059669', bg: '#D1FAE5' },
};

function fmt(n: number): string {
  if (n >= 1_000_000) return '฿' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return '฿' + (n / 1_000).toFixed(0) + 'K';
  return '฿' + Math.round(n).toLocaleString('th-TH');
}

export default async function INAReportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const ctx = await getInsuranceContext();
  if (!ctx) redirect('/insurance');

  const results = analyzeInsuranceGap(ctx);
  const agent = await getAgentForUser(user.id);

  // Pull user's name from profile
  const { data: prof } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();
  const userName = (prof as any)?.full_name ?? user.email?.split('@')[0] ?? 'คุณ';

  const reportDate = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Group by severity for summary
  const critical = results.filter((r) => r.severity === 'critical');
  const recommended = results.filter((r) => r.severity === 'recommended');
  const covered = results.filter((r) => r.severity === 'covered');

  const totalGap = results
    .filter((r) => r.severity === 'critical' || r.severity === 'recommended')
    .reduce((s, r) => s + r.gap, 0);
  const totalRecommendedPremium = results
    .filter((r) => r.severity === 'critical' || r.severity === 'recommended')
    .reduce((s, r) => s + (r.suggestedPremium.min + r.suggestedPremium.max) / 2, 0);
  const totalTaxBenefit = results
    .filter((r) => r.severity !== 'covered')
    .reduce((s, r) => s + r.taxBenefit, 0);

  return (
    <>
      {/* Print styles — hide nav and adjust layout for A4 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              .no-print { display: none !important; }
              body { background: white !important; }
              .page-break { page-break-after: always; }
              .print-page { max-width: none !important; padding: 0 !important; }
              .print-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
              @page { margin: 1.5cm; size: A4; }
            }
            .print-page * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          `,
        }}
      />

      <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10 print-page">
        {/* Toolbar (hidden when printing) */}
        <div className="no-print flex items-center justify-between gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/insurance">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            💡 กด "พิมพ์ / บันทึก PDF" จากเบราว์เซอร์ → เลือก "Save as PDF"
          </p>
          <PrintButton />
        </div>

        {/* Report Header */}
        <div className="print-card rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background p-6">
          <div className="flex items-start gap-3">
            <Shield className="h-10 w-10 shrink-0 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Insurance Needs Analysis · IN
              </p>
              <h1 className="text-2xl font-bold">รายงานวิเคราะห์ความคุ้มครองประกัน</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                สำหรับ <strong className="text-foreground">{userName}</strong> · {reportDate}
              </p>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="print-card grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-rose-50 p-4 text-center">
            <p className="text-[10px] uppercase tracking-wide text-rose-700">ช่องว่างวิกฤต</p>
            <p className="mt-1 text-2xl font-bold text-rose-700">{critical.length}</p>
            <p className="text-xs text-rose-600">รายการ</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4 text-center">
            <p className="text-[10px] uppercase tracking-wide text-amber-700">ควรมี</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{recommended.length}</p>
            <p className="text-xs text-amber-600">รายการ</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-4 text-center">
            <p className="text-[10px] uppercase tracking-wide text-emerald-700">มีอยู่แล้ว</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{covered.length}</p>
            <p className="text-xs text-emerald-600">รายการ</p>
          </div>
        </div>

        {/* Big Numbers */}
        <div className="print-card rounded-xl border bg-card p-5">
          <p className="text-sm font-semibold">📊 สรุปภาพรวม</p>
          <div className="mt-3 grid grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground">ความคุ้มครองที่ขาด</p>
              <p className="mt-1 text-xl font-bold text-rose-700">{fmt(totalGap)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">เบี้ยที่แนะนำ/ปี</p>
              <p className="mt-1 text-xl font-bold">{fmt(totalRecommendedPremium)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">ลดหย่อนภาษีได้</p>
              <p className="mt-1 text-xl font-bold text-emerald-700">{fmt(totalTaxBenefit)}</p>
            </div>
          </div>
        </div>

        {/* Profile snapshot */}
        <div className="print-card rounded-xl border bg-card p-5">
          <p className="text-sm font-semibold">👤 ข้อมูลของคุณ</p>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">อายุ</span>
              <span className="font-medium">{ctx.age ?? '—'} ปี</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">คนในอุปการะ</span>
              <span className="font-medium">{ctx.numDependents} คน</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">รายได้/เดือน</span>
              <span className="font-medium">{fmt(ctx.monthlyIncome)}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">รายจ่าย/เดือน</span>
              <span className="font-medium">{fmt(ctx.monthlyExpense)}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">หนี้คงเหลือ</span>
              <span className="font-medium">{fmt(ctx.totalDebt)}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">เงินสำรอง</span>
              <span className="font-medium">{fmt(ctx.emergencyFund)}</span>
            </div>
          </div>
        </div>

        {/* Per-category cards */}
        <h2 className="px-1 pt-2 text-sm font-semibold text-muted-foreground">
          รายละเอียดแต่ละประเภท
        </h2>
        <div className="space-y-3">
          {results.map((r) => {
            const meta = SEVERITY_META[r.severity];
            return (
              <div key={r.type} className="print-card rounded-xl border bg-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{TYPE_ICON[r.type] ?? '🛡️'}</span>
                      <h3 className="text-base font-semibold">
                        {TYPE_LABEL[r.type] ?? r.type}
                      </h3>
                    </div>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                    style={{ color: meta.color, backgroundColor: meta.bg }}
                  >
                    {r.severity === 'critical' && <AlertTriangle className="mr-1 inline h-3 w-3" />}
                    {r.severity === 'covered' && <CheckCircle2 className="mr-1 inline h-3 w-3" />}
                    {r.severity === 'recommended' && <Info className="mr-1 inline h-3 w-3" />}
                    {meta.label}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 rounded-lg bg-muted/30 p-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">มีอยู่</p>
                    <p className="mt-0.5 font-bold">{fmt(r.current)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">แนะนำ</p>
                    <p className="mt-0.5 font-bold">{fmt(r.recommended)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ขาด</p>
                    <p className="mt-0.5 font-bold text-rose-700">
                      {r.gap > 0 ? fmt(r.gap) : '—'}
                    </p>
                  </div>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">{r.reasoning}</p>

                {r.severity !== 'covered' && r.gap > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3 border-t pt-3 text-xs">
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">
                      เบี้ยประมาณ: {fmt(r.suggestedPremium.min)}–{fmt(r.suggestedPremium.max)}/ปี
                    </span>
                    {r.taxBenefit > 0 && (
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                        ลดหย่อนภาษีได้ถึง {fmt(r.taxBenefit)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <div className="print-card rounded-xl border-l-4 border-amber-500 bg-amber-50 p-4 text-xs">
          <p className="font-semibold text-amber-900">⚠️ คำเตือน</p>
          <p className="mt-1 text-amber-800">
            ตัวเลขในรายงานนี้คือคำแนะนำเชิงประมาณการ คำนวณจากข้อมูลที่ผู้ใช้บันทึกใน Lumenfi
            (รายได้-รายจ่าย-หนี้-เงินสำรอง-อายุ-คนในอุปการะ) ไม่ใช่คำแนะนำผูกพันทางการเงิน
            กรุณาปรึกษาตัวแทนประกันที่มีใบอนุญาตเพื่อพิจารณาตามสถานการณ์จริง
          </p>
        </div>

        {/* Agent footer — branded card */}
        <div className="print-card rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-background p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            จัดทำโดยที่ปรึกษาประกัน
          </p>
          <div className="mt-2 flex items-start gap-3">
            {agent.photo_url ? (
              <img
                src={agent.photo_url}
                alt={agent.agent_name}
                className="h-14 w-14 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Shield className="h-7 w-7" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-bold">{agent.agent_name}</p>
              <p className="text-xs text-muted-foreground">{agent.display_name}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                ใบอนุญาต: <span className="font-medium text-foreground">{agent.license_number}</span>
                {agent.license_valid_until && <> · ถึง {agent.license_valid_until}</>}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                {agent.email && (
                  <a href={`mailto:${agent.email}`} className="text-primary hover:underline">
                    ✉ {agent.email}
                  </a>
                )}
                {agent.phone && (
                  <a href={`tel:${agent.phone}`} className="text-primary hover:underline">
                    ☎ {agent.phone}
                  </a>
                )}
                {agent.line_id && (
                  <span className="text-primary">LINE: {agent.line_id}</span>
                )}
              </div>
              {agent.bio && (
                <p className="mt-2 text-[11px] italic text-muted-foreground">"{agent.bio}"</p>
              )}
            </div>
          </div>
          <p className="mt-3 border-t pt-3 text-center text-[10px] text-muted-foreground">
            รายงานนี้สร้างโดย <strong>Lumenfi</strong> · จัดทำเมื่อ {reportDate}
          </p>
        </div>
      </div>
    </>
  );
}
