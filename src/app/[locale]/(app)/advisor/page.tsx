import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Sparkles, FileText, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { ADVISOR_LABELS, type AdvisorDomain } from '@/lib/advisor/prompts';
import { DomainCard } from '@/components/advisor/domain-card';
import { QuotaBanner } from '@/components/advisor/quota-banner';
import { checkAIAccess } from '@/lib/billing/access';

export const dynamic = 'force-dynamic';

export default async function AdvisorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check AI key
  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('ai_provider, ai_api_key_encrypted')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };
  const hasAIKey = !!(profile?.ai_provider && profile?.ai_api_key_encrypted);

  const access = await checkAIAccess('advisor');

  // Recent reports
  const { data: reports } = await supabase
    .from('advisor_reports')
    .select('id, domain, title, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  const others: AdvisorDomain[] = ['debt', 'investment', 'tax', 'retirement', 'goals', 'insurance', 'emergency'];

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-primary" />
            ที่ปรึกษาการเงิน AI
          </h1>
          <p className="text-xs text-muted-foreground">เลขาทางการเงินส่วนตัวของคุณ</p>
        </div>
      </header>

      {!hasAIKey && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                ยังไม่ได้ตั้งค่า AI key
              </p>
              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                ใช้ AI key ของคุณเอง (Anthropic, OpenAI, Gemini หรือ OpenRouter) — ไม่มีค่าใช้จ่ายจาก Lumenfi
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/ai/settings">ไปตั้งค่า AI key</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <QuotaBanner via={access.via} quota={access.quota} feature="advisor" />

      {/* Hero — comprehensive */}
      <DomainCard
        domain="comprehensive"
        title={ADVISOR_LABELS.comprehensive.title}
        description={ADVISOR_LABELS.comprehensive.description}
        icon={ADVISOR_LABELS.comprehensive.icon}
        color={ADVISOR_LABELS.comprehensive.color}
        hero
      />

      {/* Specialist advisors */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">วิเคราะห์เฉพาะด้าน</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {others.map((d) => {
            const cfg = ADVISOR_LABELS[d];
            return (
              <DomainCard
                key={d}
                domain={d}
                title={cfg.title}
                description={cfg.description}
                icon={cfg.icon}
                color={cfg.color}
              />
            );
          })}
        </div>
      </div>

      {/* Recent reports */}
      {reports && reports.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold">รายงานล่าสุด</h2>
          <div className="space-y-2">
            {reports.map((r: any) => {
              const cfg = ADVISOR_LABELS[r.domain as AdvisorDomain];
              return (
                <Link key={r.id} href={`/advisor/r/${r.id}`}>
                  <Card className="transition-all hover:border-primary/40 hover:shadow-sm">
                    <CardContent className="flex items-start gap-3 p-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${cfg?.color ?? 'from-gray-500 to-gray-700'} text-base`}>
                        {cfg?.icon ?? '📄'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{r.title}</p>
                        {r.summary && (
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                            {r.summary}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs font-semibold">ทำงานยังไง?</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                ระบบจะดึงข้อมูลทุกมิติของคุณ (รายรับ-รายจ่าย, หนี้, ลงทุน, ประกัน, เป้าหมาย) แล้วส่งให้ AI วิเคราะห์
                ผลที่ได้จะเป็นแผนปฏิบัติได้จริง พร้อมลิงก์ไปฟีเจอร์ Lumenfi ที่จะช่วยให้คุณเดินหน้าต่อได้ทันที
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                💡 รายงานทั้งหมดเก็บไว้ใน Lumenfi เท่านั้น — ใช้ AI key ของคุณเอง ข้อมูลไม่ถูกส่งให้ใครยกเว้น AI provider ที่คุณเลือก
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
