import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, Star, Sparkles, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { getPlanInfo } from '@/lib/agents/plans';

export const dynamic = 'force-dynamic';

const PLAN_LABEL: Record<string, string> = {
  trial: 'Trial (ทดลอง 14 วัน)',
  starter: 'Starter',
  pro: 'Pro',
  team: 'Team',
  founder: 'Founder (ผู้สนับสนุนรุ่นแรก)',
};

export default async function AgentBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = searchParams ? await searchParams : {};

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents')
    .select('id, status, invite_code')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!agent) redirect('/agents/signup');

  const { data: sub } = await supabase
    .from('agent_subscriptions')
    .select('*')
    .eq('agent_id', (agent as any).id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Count leads received this period
  let leadsThisPeriod = 0;
  if (sub) {
    const { count } = await supabase
      .from('insurance_leads')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', (agent as any).id)
      .gte('created_at', (sub as any).current_period_start);
    leadsThisPeriod = count ?? 0;
  }

  const currentPlan = (sub as any)?.plan ?? 'trial';
  const isTrial = currentPlan === 'trial';
  const planInfo = currentPlan !== 'trial' && currentPlan !== 'founder'
    ? getPlanInfo(currentPlan)
    : null;
  const planLabel = PLAN_LABEL[currentPlan] ?? currentPlan;
  const periodEnd = (sub as any)?.current_period_end
    ? new Date((sub as any).current_period_end)
    : null;
  const daysLeft = periodEnd
    ? Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / 86400000))
    : 0;

  const trialUsed = (sub as any)?.trial_leads_used ?? 0;
  const trialCap = (sub as any)?.trial_leads_cap ?? 3;
  const trialOverLimit = isTrial && trialUsed >= trialCap;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/agents/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">การชำระเงิน</h1>
          <p className="text-xs text-muted-foreground">จัดการแพ็คเกจตัวแทน</p>
        </div>
      </header>

      {sp.charge === 'ok' && (
        <Card className="border-emerald-300 bg-emerald-50">
          <CardContent className="p-3 text-sm text-emerald-700">
            ✓ ชำระเงินสำเร็จ — แพ็คเกจอัพเดทแล้ว
          </CardContent>
        </Card>
      )}

      {/* Current plan card */}
      <Card className={isTrial ? 'border-amber-300' : 'border-primary/30'}>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">แพ็คเกจปัจจุบัน</p>
              <p className="mt-1 text-2xl font-bold">{planLabel}</p>
            </div>
            {!isTrial && (
              <Sparkles className="h-6 w-6 text-primary" />
            )}
          </div>

          {sub && (
            <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-sm">
              {periodEnd && (
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    {isTrial ? 'ทดลองสิ้นสุด' : 'งวดถัดไป'}
                  </p>
                  <p className="mt-0.5 font-medium">
                    <Calendar className="mr-1 inline h-3 w-3" />
                    {periodEnd.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-[11px] text-muted-foreground">เหลือ {daysLeft} วัน</p>
                </div>
              )}
              <div>
                <p className="text-[11px] text-muted-foreground">
                  {isTrial ? `Leads (cap ${trialCap})` : 'Leads งวดนี้'}
                </p>
                <p className="mt-0.5 font-medium">
                  {isTrial ? `${trialUsed}/${trialCap}` : leadsThisPeriod}
                </p>
                {!isTrial && planInfo?.leadsCap && (
                  <p className="text-[11px] text-muted-foreground">cap {planInfo.leadsCap}</p>
                )}
              </div>
            </div>
          )}

          {trialOverLimit && (
            <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
              <AlertTriangle className="mr-1 inline h-4 w-4" />
              ใช้ trial ครบแล้ว ({trialCap} leads) — กรุณาอัพเกรดเพื่อรับ leads ต่อ
            </div>
          )}

          <Button asChild className="w-full" size="lg">
            <Link href="/agents/pricing">
              {isTrial ? (
                <><Sparkles className="mr-2 h-4 w-4" /> อัพเกรดแพ็คเกจ</>
              ) : (
                <>เปลี่ยน/จัดการแพ็คเกจ</>
              )}
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Compare features link */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold">เปรียบเทียบแพ็คเกจ</p>
          <p className="mt-1 text-xs text-muted-foreground">
            ดูฟีเจอร์ทั้งหมดของ Starter / Pro / Team — และส่วนลดรายปี 17%
          </p>
          <Button asChild variant="outline" className="mt-3 w-full">
            <Link href="/agents/pricing">ดูราคาแพ็คเกจ →</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
