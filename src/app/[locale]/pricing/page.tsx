import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Check, X, Sparkles, Zap, Key, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogoMark, Wordmark } from '@/components/brand/logo-mark';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { createClient } from '@/lib/supabase/server';
import { CreditPackButtons } from '@/components/billing/credit-pack-buttons';
import { SubscribeButton } from '@/components/billing/subscribe-button';

export const dynamic = 'force-dynamic';

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: sub } = user
    ? await supabase
        .from('user_subscriptions')
        .select('plan_code, status, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null };

  const { data: credits } = user
    ? await supabase
        .from('ai_credits')
        .select('advisor_report_balance')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null };

  const isPro = sub?.plan_code === 'pro' && ['trial', 'active'].includes(sub.status);
  const creditBalance = credits?.advisor_report_balance ?? 0;
  const isGuest = !user;

  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#0F172A]">
      {/* Public marketing header */}
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
                  <Link href="/signup">
                    เริ่มใช้งานฟรี
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <Button asChild size="sm" className="bg-[#0F172A] text-white hover:bg-[#0F172A]/90">
                <Link href="/dashboard">ไปที่ Dashboard</Link>
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
              href="/dashboard"
              className="mb-3 inline-flex items-center gap-1 text-sm text-[#0F172A]/60 hover:text-[#0F172A]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> กลับ Dashboard
            </Link>
          )}
          <h1 className="text-3xl font-bold md:text-4xl">เลือกแพลนที่เหมาะกับคุณ</h1>
          <p className="mt-2 text-sm text-[#0F172A]/65">เลือกได้ทุกเมื่อ — ยกเลิกเมื่อไหร่ก็ได้</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* FREE */}
          <Card className={!isGuest && !isPro ? 'border-2 border-primary/30 bg-white' : 'border-black/10 bg-white'}>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-[#0F172A]/60" />
                <h2 className="text-lg font-bold">Free</h2>
              </div>
              <p className="mt-2 text-3xl font-bold">฿0</p>
              <p className="text-xs text-[#0F172A]/60">ฟรีตลอดไป</p>

              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ฟีเจอร์ Lumenfi ครบทุกอย่าง (บันทึก · งบ · หนี้ · ลงทุน)
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>AI Chat <b>5 ข้อความ/วัน</b> · BYO Key ไม่จำกัด</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>AI Advisor 8 มิติ <b>1 รายงาน/เดือน</b> (taste)</span>
                </li>
                <li className="flex items-start gap-2 text-[#0F172A]/55">
                  <X className="mt-0.5 h-4 w-4 shrink-0" />
                  AI Secretary push (Pro only)
                </li>
                <li className="flex items-start gap-2 text-[#0F172A]/55">
                  <X className="mt-0.5 h-4 w-4 shrink-0" />
                  AI Advisor ผ่าน BYO Key — ไม่อนุญาต
                </li>
              </ul>

              {isGuest ? (
                <Button asChild className="mt-6 w-full bg-[#0F172A] text-white hover:bg-[#0F172A]/90">
                  <Link href="/signup">สมัครฟรีตอนนี้</Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="mt-6 w-full" disabled={!isPro}>
                  <Link href="/dashboard">{!isPro ? '✓ แพลนปัจจุบัน' : 'เปลี่ยนกลับ'}</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* PAY-AS-YOU-GO */}
          <Card className="border-black/10 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-bold">จ่ายตามใช้</h2>
              </div>
              <p className="mt-2 text-3xl font-bold">
                ฿7-8 <span className="text-base font-normal text-[#0F172A]/60">/ รายงาน</span>
              </p>
              <p className="text-xs text-[#0F172A]/60">ซื้อ pack — ไม่หมดอายุ</p>

              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ใช้ AI ของ Lumenfi (ไม่ต้องสมัคร key เอง)
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  AI Advisor 8 มิติ
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  Credit ไม่หมดอายุ — ใช้เมื่อไหร่ก็ได้
                </li>
                <li className="flex items-start gap-2 text-[#0F172A]/60">
                  <span className="mt-0.5 text-xs">·</span>
                  เพิ่มจาก Free quota — Chat ใช้ Free / BYO เหมือนเดิม
                </li>
              </ul>

              {creditBalance > 0 && (
                <p className="mt-4 rounded-md bg-amber-50 p-2 text-center text-xs text-amber-700">
                  💰 มี credit คงเหลือ <b>{creditBalance}</b> reports
                </p>
              )}

              <div className="mt-6">
                {isGuest ? (
                  <Button asChild className="w-full bg-[#0F172A] text-white hover:bg-[#0F172A]/90">
                    <Link href="/signup">
                      สมัครเพื่อซื้อ credit
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <CreditPackButtons />
                )}
              </div>
            </CardContent>
          </Card>

          {/* PRO */}
          <Card
            className={`relative bg-white ${
              !isGuest && isPro ? 'border-2 border-[#C9A45A]' : 'border-[#C9A45A]/40 ring-2 ring-[#C9A45A]/20'
            }`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-gradient-to-r from-[#C9A45A] to-[#E4C789] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0F172A]">
                ⭐ คุ้มสุด
              </span>
            </div>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#C9A45A]" />
                <h2 className="text-lg font-bold">Pro</h2>
              </div>
              <p className="mt-2 text-3xl font-bold">
                ฿149 <span className="text-base font-normal text-[#0F172A]/60">/ เดือน</span>
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                <span>💰</span>
                <span>รายปี ฿1,490 — ประหยัด ฿298/ปี</span>
              </div>
              <p className="mt-1 text-[11px] text-[#0F172A]/55">
                เริ่มทดลอง 14 วัน — ไม่ต้องใส่บัตรเครดิต
              </p>

              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A45A]" />
                  <span>⭐ <b>AI Advisor 8 มิติ ไม่จำกัด</b> — รายงานเชิงลึก</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>AI Chat <b>ไม่จำกัด</b> · BYO Key ก็ใช้ได้</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span><b>AI Secretary</b> push เตือนทุกวัน</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ทดลองฟรี 14 วัน · ไม่ต้องผูกบัตร
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  Priority support
                </li>
              </ul>

              <div className="mt-6">
                {isGuest ? (
                  <Button asChild className="w-full bg-[#C9A45A] text-[#0F172A] hover:bg-[#E4C789]">
                    <Link href="/signup">
                      สมัครเพื่อทดลอง Pro 14 วัน
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                ) : isPro ? (
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/settings/billing">จัดการ subscription</Link>
                  </Button>
                ) : (
                  <SubscribeButton />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Guest banner — gentle reminder why signup is needed */}
        {isGuest && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex flex-col items-center gap-3 p-5 text-center sm:flex-row sm:text-left">
              <Sparkles className="h-6 w-6 flex-none text-amber-600" />
              <div className="flex-1 text-sm text-amber-900">
                <strong>ดูราคาก่อนสมัครได้</strong> — สมัครฟรี ไม่ต้องผูกบัตร เลือก upgrade เมื่อพร้อม
              </div>
              <Button asChild size="sm" className="bg-amber-600 text-white hover:bg-amber-700">
                <Link href="/signup">
                  เริ่มฟรีตอนนี้
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Comparison */}
        <Card className="border-black/10 bg-white">
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">เลือกอย่างไรดี?</h3>
            <div className="grid gap-3 text-xs sm:grid-cols-3">
              <div className="rounded-md border border-black/10 bg-[#FAFAF7] p-3">
                <p className="font-semibold">🆓 ลองก่อน</p>
                <p className="mt-1 text-[#0F172A]/65">
                  เริ่ม <b>Free</b> ดูก่อน — ลอง AI Lumenfi 1 ครั้ง/เดือน หรือใช้ key ตัวเอง unlimited
                </p>
              </div>
              <div className="rounded-md border border-black/10 bg-[#FAFAF7] p-3">
                <p className="font-semibold">📊 ใช้นานๆ ครั้ง</p>
                <p className="mt-1 text-[#0F172A]/65">
                  ซื้อ <b>credit pack</b> — ใช้เมื่อต้องการ ไม่ commit รายเดือน
                </p>
              </div>
              <div className="rounded-md border border-[#C9A45A]/40 bg-[#FFF8EA] p-3">
                <p className="font-semibold">🌟 ใช้ทุกวัน</p>
                <p className="mt-1 text-[#0F172A]/65">
                  <b>Pro</b> — AI ไม่จำกัด + Secretary คอยเตือน · trial 14 วัน
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="border-black/10 bg-white">
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">คำถามที่พบบ่อย</h3>
            <div className="space-y-3 text-sm">
              <details className="rounded-md border border-black/10 bg-white p-3">
                <summary className="cursor-pointer font-medium">Free ใช้ AI Lumenfi ได้กี่ครั้ง?</summary>
                <p className="mt-2 text-xs text-[#0F172A]/65">
                  AI Chat 5 ข้อความ/วัน + AI Advisor 1 รายงาน/เดือน — ใช้ Lumenfi key (ไม่ต้องสมัคร API)
                  ถ้าหมด quota ใช้ key ตัวเอง (BYO) ได้ไม่จำกัด หรืออัพเกรด Pro
                </p>
              </details>
              <details className="rounded-md border border-black/10 bg-white p-3">
                <summary className="cursor-pointer font-medium">Credit pack กับ Pro ต่างกันอย่างไร?</summary>
                <p className="mt-2 text-xs text-[#0F172A]/65">
                  Credit pack = จ่ายครั้งเดียว ใช้ตามจำนวน report (ไม่หมดอายุ) — เหมาะคนใช้นานๆ ครั้ง<br />
                  Pro = จ่ายรายเดือน/ปี ใช้ไม่จำกัด + AI Secretary — เหมาะคนใช้ทุกวัน
                </p>
              </details>
              <details className="rounded-md border border-black/10 bg-white p-3">
                <summary className="cursor-pointer font-medium">ยกเลิก Pro ได้ไหม?</summary>
                <p className="mt-2 text-xs text-[#0F172A]/65">
                  ได้ทุกเมื่อที่ /settings/billing — ใช้งานได้จนถึงสิ้นรอบ billing แล้ว downgrade เป็น Free อัตโนมัติ
                </p>
              </details>
              <details className="rounded-md border border-black/10 bg-white p-3">
                <summary className="cursor-pointer font-medium">Trial 14 วันต้องใส่บัตรไหม?</summary>
                <p className="mt-2 text-xs text-[#0F172A]/65">
                  ใส่ — Omise charge ครั้งแรกอัตโนมัติเมื่อครบ trial หากไม่ยกเลิกก่อน คุณจะได้รับการแจ้งเตือน 3 วันก่อนหมด trial
                </p>
              </details>
              <details className="rounded-md border border-black/10 bg-white p-3">
                <summary className="cursor-pointer font-medium">ข้อมูลของฉันปลอดภัยไหม?</summary>
                <p className="mt-2 text-xs text-[#0F172A]/65">
                  ข้อมูลการเงินถูกส่งให้ AI provider เท่าที่จำเป็น (Anthropic/OpenAI) ตาม privacy policy —
                  Lumenfi ไม่เก็บประวัติแชทที่ AI provider ปลายทาง · ใน privacy mode ชื่อบัญชี/หุ้นจะถูก anonymize
                </p>
              </details>
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
          <p>© 2026 Lumenfi · Aurum Quietus</p>
        </div>
      </footer>
    </main>
  );
}
