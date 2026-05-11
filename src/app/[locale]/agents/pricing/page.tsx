import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Check, Sparkles, Star, ArrowRight, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogoMark, Wordmark } from '@/components/brand/logo-mark';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
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
  const isGuest = !user;

  // Resolve current plan only if logged in
  let isAgent = false;
  let currentPlan: string | null = null;

  if (user) {
    const { data: agent } = await supabase
      .from('agents')
      .select('id, status')
      .eq('user_id', user.id)
      .maybeSingle();
    isAgent = !!agent && (agent as any).status === 'active';

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
  }

  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#0F172A]">
      {/* Public header */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#FAFAF7]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={32} />
            <Wordmark className="text-lg" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {isGuest ? (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href="/login">เข้าสู่ระบบ</Link>
                </Button>
                <Button asChild size="sm" className="bg-[#0F172A] text-white hover:bg-[#0F172A]/90">
                  <Link href="/agents/signup">
                    สมัครเป็นตัวแทน
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : isAgent ? (
              <Button asChild size="sm" className="bg-[#0F172A] text-white hover:bg-[#0F172A]/90">
                <Link href="/agents/billing">ไปที่ Agent Billing</Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="bg-[#0F172A] text-white hover:bg-[#0F172A]/90">
                <Link href="/agents/signup">สมัครเป็นตัวแทน</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 p-4 pt-8 lg:pt-12">
        {/* Page header */}
        <div className="text-center">
          {!isGuest && (
            <Link
              href={isAgent ? '/agents/billing' : '/settings'}
              className="mb-3 inline-flex items-center gap-1 text-sm text-[#0F172A]/60 hover:text-[#0F172A]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> กลับ
            </Link>
          )}
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C9A45A]/40 bg-[#C9A45A]/10 px-3 py-1 text-xs text-[#8A6932]">
            <Briefcase className="h-3 w-3" />
            สำหรับตัวแทนประกัน (B2B)
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">เลือกแพ็คเกจตัวแทน</h1>
          <p className="mt-2 text-sm text-[#0F172A]/65">
            อัพเกรดเพื่อรับ leads ไม่จำกัด + features เต็มที่
          </p>
        </div>

        {/* Guest banner */}
        {isGuest && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex flex-col items-center gap-3 p-5 text-center sm:flex-row sm:text-left">
              <Sparkles className="h-6 w-6 flex-none text-amber-600" />
              <div className="flex-1 text-sm text-amber-900">
                <strong>ดูแพ็คเกจก่อนสมัครได้</strong> — เริ่มสมัครเป็นตัวแทน ฟรี 14 วัน · ไม่ต้องผูกบัตร · ทดลอง 3 leads
              </div>
              <Button asChild size="sm" className="bg-amber-600 text-white hover:bg-amber-700">
                <Link href="/agents/signup">
                  สมัครเป็นตัวแทน
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!isGuest && !isAgent && (
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
          <div className="inline-flex items-center gap-0.5 rounded-full border border-black/10 bg-white p-0.5 text-sm shadow-sm">
            <Link
              href="?cycle=monthly"
              className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
                cycle === 'monthly' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-[#0F172A]/60'
              }`}
            >
              รายเดือน
            </Link>
            <Link
              href="?cycle=annual"
              className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
                cycle === 'annual' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-[#0F172A]/60'
              }`}
            >
              รายปี <span className="ml-1 text-[10px] text-emerald-500">(ประหยัด 17%)</span>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {AGENT_PLANS.map((plan) => {
            const perMonth = cycle === 'annual' ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;
            const isCurrentPlan = currentPlan === plan.id;
            const savings = annualSavings(plan);

            return (
              <Card
                key={plan.id}
                className={
                  plan.highlight
                    ? 'relative border-2 border-[#C9A45A] bg-gradient-to-br from-white to-[#FFF8EA] shadow-lg'
                    : isCurrentPlan
                    ? 'border-2 border-emerald-500 bg-white'
                    : 'border-black/10 bg-white'
                }
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#C9A45A] px-3 py-0.5 text-[11px] font-semibold text-[#0F172A]">
                    <Sparkles className="mr-1 inline h-3 w-3" />
                    แนะนำ
                  </span>
                )}
                {isCurrentPlan && !plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-[11px] font-medium text-white">
                    แพ็คเกจปัจจุบัน
                  </span>
                )}
                <CardContent className="space-y-4 p-6">
                  <div>
                    <h2 className="text-lg font-bold">{plan.name}</h2>
                    <p className="text-xs text-[#0F172A]/60">{plan.tagline}</p>
                  </div>

                  <div>
                    <p className="text-3xl font-bold">
                      ฿{perMonth.toLocaleString('th-TH')}
                      <span className="text-sm font-normal text-[#0F172A]/60">/เดือน</span>
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

                  {isGuest ? (
                    <Button asChild className="w-full bg-[#0F172A] text-white hover:bg-[#0F172A]/90">
                      <Link href="/agents/signup">
                        สมัครเป็นตัวแทน
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : isCurrentPlan ? (
                    <Button disabled className="w-full" variant="outline">
                      <Star className="mr-2 h-4 w-4" /> ใช้อยู่
                    </Button>
                  ) : isAgent ? (
                    <Button asChild className="w-full bg-[#0F172A] text-white hover:bg-[#0F172A]/90">
                      <Link href={`/agents/billing/checkout?plan=${plan.id}&cycle=${cycle}`}>
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

        <Card className="border-dashed border-black/15 bg-white">
          <CardContent className="p-5 text-center text-sm text-[#0F172A]/65">
            🎁 <strong className="text-[#0F172A]">ทดลองฟรี 14 วัน · 3 leads</strong> เมื่อสมัครและได้รับการอนุมัติ — เริ่มต้นโดยไม่ต้องผูกบัตร
          </CardContent>
        </Card>

        {/* Pitch: why become an agent */}
        <Card className="border-black/10 bg-white">
          <CardContent className="space-y-4 p-6">
            <h3 className="text-lg font-semibold">ทำไมต้องเป็นตัวแทนบน Lumenfi?</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-md border border-black/10 bg-[#FAFAF7] p-4">
                <div className="mb-2 text-2xl">🎯</div>
                <p className="font-semibold">Qualified leads</p>
                <p className="mt-1 text-xs text-[#0F172A]/65">
                  Routing ตามพื้นที่ + ผลิตภัณฑ์ที่ขาด — ไม่ใช่ cold call สุ่ม
                </p>
              </div>
              <div className="rounded-md border border-black/10 bg-[#FAFAF7] p-4">
                <div className="mb-2 text-2xl">🤖</div>
                <p className="font-semibold">AI ช่วยขาย</p>
                <p className="mt-1 text-xs text-[#0F172A]/65">
                  วิเคราะห์ prospect + ร่าง pitch อัตโนมัติจาก INA Report
                </p>
              </div>
              <div className="rounded-md border border-black/10 bg-[#FAFAF7] p-4">
                <div className="mb-2 text-2xl">📊</div>
                <p className="font-semibold">Dashboard ผลงาน</p>
                <p className="mt-1 text-xs text-[#0F172A]/65">
                  Conversion · response time · revenue — ครบในที่เดียว
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="mt-12 border-t border-black/5 bg-white py-8 text-center text-sm text-[#0F172A]/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4">
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <Wordmark className="text-sm" />
          </div>
          <p>© 2026 Lumenfi · Agent Marketplace</p>
        </div>
      </footer>
    </main>
  );
}
