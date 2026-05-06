import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Shield, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getInsuranceContext } from '@/lib/insurance/queries';
import { analyzeInsuranceGap, type GapResult } from '@/lib/insurance/gap-analyzer';
import { GapResultCard } from '@/components/insurance/gap-result-card';
import { AgentInfoCard } from '@/components/insurance/agent-info-card';

export const dynamic = 'force-dynamic';

export default async function InsurancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await getInsuranceContext();
  const results: GapResult[] = ctx ? analyzeInsuranceGap(ctx) : [];

  // Group by severity
  const critical = results.filter((r) => r.severity === 'critical');
  const recommended = results.filter((r) => r.severity === 'recommended');
  const optional = results.filter((r) => r.severity === 'optional');
  const covered = results.filter((r) => r.severity === 'covered');

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <Shield className="h-5 w-5 text-primary" />
              วิเคราะห์ประกันของคุณ
            </h1>
            <p className="text-xs text-muted-foreground">วิเคราะห์ช่องว่างความคุ้มครองจากข้อมูลในแอพ</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/insurance/policies">
            <FileText className="mr-1 h-4 w-4" />
            กรมธรรม์ของฉัน
          </Link>
        </Button>
      </header>

      {!ctx && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>
          </CardContent>
        </Card>
      )}

      {ctx && (
        <>
          {/* Hero summary */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat label="วิกฤต" count={critical.length} color="text-destructive" />
                <Stat label="ควรพิจารณา" count={recommended.length} color="text-amber-600" />
                <Stat label="ขั้นต่อไป" count={optional.length} color="text-blue-600" />
                <Stat label="คุ้มครองแล้ว" count={covered.length} color="text-emerald-600" />
              </div>
              {(ctx.monthlyIncome === 0 || ctx.age === null) && (
                <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  💡 ข้อมูลยังไม่ครบ:{' '}
                  {ctx.monthlyIncome === 0 && 'ยังไม่มีรายรับ-รายจ่ายในระบบ '}
                  {ctx.age === null && 'ยังไม่ได้ระบุวันเกิด'}
                  <Link href="/settings/profile" className="ml-1 underline">
                    ไปกรอกข้อมูล
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gaps */}
          {[...critical, ...recommended, ...optional].length === 0 && covered.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="p-5 text-center">
                <p className="text-2xl">✅</p>
                <p className="mt-2 font-semibold text-emerald-800">คุ้มครองครบแล้ว</p>
                <p className="mt-1 text-sm text-emerald-700">
                  สถานะประกันของคุณเหมาะสมแล้ว ทบทวนทุก 1-2 ปี
                </p>
              </CardContent>
            </Card>
          )}

          {[...critical, ...recommended, ...optional].length > 0 && (
            <div className="space-y-3">
              {[...critical, ...recommended, ...optional, ...covered].map((r) => (
                <GapResultCard key={r.type} result={r} />
              ))}
            </div>
          )}

          {/* Agent info */}
          <AgentInfoCard />

          <p className="text-center text-[11px] text-muted-foreground">
            ข้อมูลเบื้องต้น ไม่ใช่คำแนะนำทางการเงินส่วนบุคคล —
            ตัวแทนจะอธิบายเงื่อนไขกรมธรรม์ครบถ้วนเมื่อติดต่อ
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${color}`}>{count}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
