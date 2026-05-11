import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, Check, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AGENT_PLANS, annualSavings } from '@/lib/agents/plans';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AgentPricingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = searchParams ? await searchParams : {};
  const cycle: 'monthly' | 'annual' = sp.cycle === 'annual' ? 'annual' : 'monthly';

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/agents/pricing');

  // Current plan?
  const { data: agent } = await supabase
    .from('agents')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle();
  const isAgent = !!agent && (agent as any).status === 'active';

  let currentPlan: string | null = null;
  if (isAgent) {
    const { data: sub } = await supabase
      .from('agent_subscriptions')
      .select('plan, status')
      .eq('agent_id', (agent as any).id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sub && (sub as any).status === 'active') currentPlan = (sub as any).plan;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href={isAgent ? '/agents/billing' : '/settings'}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">เลือกแพ็คเกจตัวแทน</h1>
          <p className="text-xs text-muted-foreground">
            อัพเกรดเพื่อรับ leads ไม่จำกัด + features เต็มที่
          </p>
        </div>
      </header>

      {!isAgent && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-700">
            ⏳ คุณต้องสมัครเป็นตัวแทน + ได้รับการอนุมัติก่อน{' '}
            <Link href="/agents/signup" className="font-semibold underline">
              สมัครที่นี่ →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Cycle toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-0.5 rounded-full border bg-muted/40 p-0.5 text-sm">
          <Link
            href="?cycle=monthly"
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
              cycle === 'monthly' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
          >
            รายเดือน
          </Link>
          <Link
            href="?cycle=annual"
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
              cycle === 'annual' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
          >
            รายปี <span className="text-[10px] text-emerald-600">(ประหยัด 17%)</span>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {AGENT_PLANS.map((plan) => {
          const price = cycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
          const perMonth = cycle === 'annual' ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;
          const isCurrentPlan = currentPlan === plan.id;
          const savings = annualSavings(plan);

          return (
            <Card
              key={plan.id}
              className={
                plan.highlight
                  ? 'relative border-2 border-primary shadow-lg'
                  : isCurrentPlan
                  ? 'border-2 border-emerald-500'
                  : ''
              }
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-medium text-primary-foreground">
                  <Sparkles className="mr-1 inline h-3 w-3" />
                  แนะนำ
                </span>
              )}
              {isCurrentPlan && !plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-[11px] font-medium text-white">
                  แพ็คเกจปัจจุบัน
                </span>
              )}
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                  <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                </div>

                <div>
                  <p className="text-3xl font-bold">
                    ฿{perMonth.toLocaleString('th-TH')}
                    <span className="text-sm font-normal text-muted-foreground">/เดือน</span>
                  </p>
                  {cycle === 'annual' && (
                    <p className="mt-1 text-[11px] text-emerald-600">
                      ปีละ ฿{plan.annualPrice.toLocaleString('th-TH')} · ประหยัด ฿{savings.toLocaleString('th-TH')}
                    </p>
                  )}
                </div>

                <ul className="space-y-2 text-sm">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <Button disabled className="w-full" variant="outline">
                    <Star className="mr-2 h-4 w-4" /> ใช้อยู่
                  </Button>
                ) : isAgent ? (
                  <Button asChild className="w-full">
                    <Link
                      href={`/agents/billing/checkout?plan=${plan.id}&cycle=${cycle}`}
                    >
                      {currentPlan ? 'เปลี่ยนเป็นแพ็คเกจนี้' : `เลือก ${plan.name}`}
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/agents/signup">สมัครเป็นตัวแทนก่อน</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardContent className="p-5 text-center text-sm text-muted-foreground">
          🎁 <strong>ทดลองฟรี 14 วัน · 3 leads</strong> เมื่อสมัครและได้รับการอนุมัติ
          {' '}— เริ่มต้นโดยไม่ต้องผูกบัตร
        </CardContent>
      </Card>
    </div>
  );
}
