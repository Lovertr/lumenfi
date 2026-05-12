import { redirect } from 'next/navigation';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import {
  ArrowRight,
  Check,
  Sparkles,
  Gift,
  HeartHandshake,
  Frown,
  AlertTriangle,
  TrendingDown,
  Eye,
  CalendarClock,
  Brain,
  Quote,
  Clock,
  Wallet,
  Shield,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogoMark, Wordmark } from '@/components/brand/logo-mark';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function ReferralLandingPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  const normalizedCode = code.trim().toUpperCase();

  // ── Look up the referrer (user) using service client to bypass RLS ──
  const svc = createServiceClient();
  let referrerName: string | null = null;
  try {
    const { data: profile } = await svc
      .from('profiles')
      .select('id, full_name')
      .eq('referral_code', normalizedCode)
      .maybeSingle();
    if (profile) {
      referrerName = ((profile as any).full_name as string | null) || 'เพื่อนของคุณ';
    }
  } catch (err) {
    console.warn('[/r/' + normalizedCode + '] lookup failed:', (err as any)?.message);
  }

  if (!referrerName) {
    try {
      const { data: agent } = await svc
        .from('agents')
        .select('id')
        .eq('invite_code', normalizedCode)
        .eq('status', 'active')
        .maybeSingle();
      if (agent) redirect(`/${locale}/i/${normalizedCode}`);
    } catch (err) {
      if ((err as any)?.digest?.startsWith?.('NEXT_REDIRECT')) throw err;
    }
    redirect(`/${locale}`);
  }

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      redirect(`/${locale}/settings/referral?invite=${encodeURIComponent(normalizedCode)}`);
    }
  } catch (err) {
    if ((err as any)?.digest?.startsWith?.('NEXT_REDIRECT')) throw err;
  }

  const signupHref = `/${locale}/signup?invite=${encodeURIComponent(normalizedCode)}`;
  const loginHref = `/${locale}/login?invite=${encodeURIComponent(normalizedCode)}`;

  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#0F172A]">
      {/* Top bar */}
      <header className="border-b border-black/5 bg-[#FAFAF7]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={28} />
            <Wordmark className="text-base" />
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      {/* ─────────────── HERO ─────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0F172A] via-[#10162B] to-[#0B0F1F] text-white">
        <div className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-[#C9A45A]/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-1/3 h-[360px] w-[360px] rounded-full bg-[#C9A45A]/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-20">
          {/* Left: emotional pitch */}
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#C9A45A]/40 bg-[#C9A45A]/10 px-3 py-1 text-xs text-[#E4C789]">
              <HeartHandshake className="h-3 w-3" />
              {referrerName} ส่งคำเชิญถึงคุณ
            </div>
            <h1 className="mb-4 text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
              <span className="text-white/95">{referrerName}</span>
              <br />
              <span className="bg-gradient-to-r from-[#E4C789] via-[#C9A45A] to-[#8A6932] bg-clip-text text-transparent">
                อยากให้คุณคุมเงินตัวเองได้
              </span>
            </h1>
            <p className="mb-6 max-w-xl text-base text-white/75 md:text-lg">
              เพื่อนของคุณใช้ Lumenfi อยู่ — และเขาอยากให้คุณได้สิ่งเดียวกับที่เขาได้: 
              <span className="text-white"> ความรู้สึกว่า "คุมเงินได้ ไม่ใช่ถูกเงินคุม" </span>
              แอพเดียวที่รวมหนี้ ออม ลงทุน ประกัน เกษียณ พร้อม AI ที่ปรึกษาภาษาไทย
            </p>

            {/* Gold reward callout */}
            <Card className="mb-6 border-[#C9A45A]/40 bg-gradient-to-br from-[#C9A45A]/15 via-[#C9A45A]/8 to-transparent text-white shadow-2xl">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-[#C9A45A] to-[#8A6932] text-2xl shadow-md">
                  🎁
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#E4C789]">
                    ของขวัญจาก {referrerName}
                  </p>
                  <p className="mt-0.5 flex items-baseline gap-2 text-lg font-bold">
                    <span>Pro ทดลอง</span>
                    <span className="text-3xl text-[#E4C789]">฿0</span>
                    <span>·</span>
                    <span className="text-2xl text-[#E4C789]">30 วัน</span>
                  </p>
                  <p className="mt-1 text-xs text-white/70">
                    ทั้งคุณและ {referrerName} ได้รับฟรี · ไม่ต้องผูกบัตร
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-[#C9A45A] text-[#0F172A] hover:bg-[#E4C789]">
                <Link href={signupHref}>
                  รับของขวัญ — เริ่มเลย
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href={loginHref}>ฉันมีบัญชีอยู่แล้ว</Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-white/55">
              สมัคร 30 วินาที · ยกเลิกได้ทุกเมื่อ · ใช้ฟรีตลอดได้แม้หลัง trial หมด
            </p>
          </div>

          {/* Right: dashboard mockup */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-x-0 top-12 mx-auto h-72 w-72 rounded-full bg-[#C9A45A]/20 blur-3xl" />
            <div className="relative w-full max-w-[540px]">
              <div className="absolute -inset-3 -z-10 rounded-3xl bg-gradient-to-br from-[#C9A45A]/30 via-transparent to-[#C9A45A]/10 blur-xl" />
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl ring-1 ring-white/10">
                <Image
                  src="/marketing/dashboard.png"
                  alt="Lumenfi Dashboard"
                  width={1120}
                  height={1024}
                  priority
                  className="h-auto w-full"
                />
              </div>
              <div className="mt-3 text-center text-xs text-white/55">
                สิ่งที่ {referrerName} ใช้อยู่ทุกวัน
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── PAIN — emotional empathy ─────────────── */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
              <Frown className="h-3 w-3" />
              {referrerName} เคยรู้สึกแบบนี้ · และคุณอาจกำลังรู้สึก
            </p>
            <h2 className="text-3xl font-bold md:text-4xl">
              "เงินเดือนเข้า แล้วก็หาย…"
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-[#0F172A]/65">
              ถ้าประโยคใดประโยคหนึ่งข้างล่างทำให้คุณ "อืม จริง" — แอพนี้ถูกสร้างมาเพื่อคุณโดยเฉพาะ
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: AlertTriangle,
                title: 'เปิดแอพธนาคารแล้วใจหาย',
                body: 'ตอบไม่ได้ว่าเดือนนี้ใช้อะไรไปบ้าง 5 อย่างยังไม่ครบ · เห็นยอดแล้วก็แค่ถอนหายใจ',
              },
              {
                icon: TrendingDown,
                title: 'บัตรเครดิตไม่ลดสักเดือน',
                body: 'จ่ายขั้นต่ำตลอด ยอดแทบเท่าเดิม ดอกกินทุกวัน — แต่ตัวเลขเต็มๆ ก็น่ากลัวเกินกว่าจะนั่งดู',
              },
              {
                icon: Clock,
                title: 'อยากเริ่ม แต่ไม่รู้เริ่มตรงไหน',
                body: 'ลงทุน? ออม? ประกัน? เกษียณ? — หลายจุดจนไม่รู้ทิศ สุดท้ายเลื่อนๆ ไป "เดี๋ยวก่อน"',
              },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <Card
                  key={i}
                  className="border-rose-200/60 bg-gradient-to-br from-white to-rose-50/30 transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md"
                >
                  <CardContent className="p-5">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-base font-semibold">{p.title}</h3>
                    <p className="text-sm text-[#0F172A]/65">{p.body}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="mt-8 text-center text-base text-[#0F172A]/70">
            ความรู้สึกนี้ <span className="font-semibold text-[#0F172A]">{referrerName} เคยมี</span>{' '}
            — และเขาเจอทางออกแล้ว
          </p>
        </div>
      </section>

      {/* ─────────────── BRIDGE — emotional reveal ─────────────── */}
      <section className="bg-gradient-to-br from-[#0F172A] via-[#101830] to-[#0B0F1F] px-4 py-16 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <Quote className="mx-auto h-10 w-10 text-[#C9A45A]/40" />
          <p className="mt-4 text-xl font-medium leading-relaxed md:text-2xl">
            "ผมเปลี่ยนจากคนที่ตอบไม่ได้ว่าเงินไปไหน — เป็นคนที่{' '}
            <span className="bg-gradient-to-r from-[#E4C789] to-[#C9A45A] bg-clip-text text-transparent">
              เห็นทุกบาทไปอยู่ตรงไหน
            </span>{' '}
            ทุกเดือนผมรู้ว่าอีกกี่เดือนจะปลดหนี้ และเริ่มออมได้จริงครั้งแรก"
          </p>
          <p className="mt-6 text-sm text-white/55">— สิ่งที่เพื่อนของคุณจะบอกถ้าคุณถามเขา</p>
        </div>
      </section>

      {/* ─────────────── TRANSFORMATION — Pain → Outcome with screenshots ─────────────── */}
      <section className="bg-gradient-to-b from-[#FAFAF7] via-white to-[#FAFAF7] px-4 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">3 สิ่งที่เปลี่ยนทันทีในเดือนแรก</h2>
            <p className="mt-2 text-base text-[#0F172A]/65">
              ภาพจริงจากแอพ ไม่ใช่ Mockup
            </p>
          </div>

          <div className="space-y-16 lg:space-y-24">
            {[
              {
                tag: 'ก่อน: "ไม่รู้เงินไปไหน"',
                title: 'เห็นทุกอย่างในจอเดียว — Net Worth · กระแสเงินสด · สุขภาพการเงิน',
                desc:
                  'เปิดแอพ 1 ครั้ง รู้ทันทีว่าตอนนี้คุณ "อยู่ตรงไหน" — มีเงินเท่าไร เป็นหนี้เท่าไร เดือนนี้ใช้เกินรายได้ไหม Runway อีกกี่เดือน คะแนนสุขภาพการเงินกี่คะแนน',
                points: [
                  'Net Worth อัพเดทอัตโนมัติทุกครั้งที่บันทึก',
                  'คะแนน 0-100 บอกจุดอ่อนที่ต้องแก้ก่อน',
                  '"Runway" — ถ้ารายได้หยุดวันนี้ อยู่ได้กี่เดือน',
                ],
                img: '/marketing/dashboard.png',
                accent: 'emerald',
              },
              {
                tag: 'ก่อน: "หนี้ไม่ลดสักที"',
                title: 'รู้ชัดว่าเมื่อไรปลดหนี้ — เป็นเดือน เป็นวัน',
                desc:
                  'ใส่ทุกหนี้ เห็นตารางผ่อน 60 เดือน · เปรียบเทียบ Avalanche/Snowball/Refinance ในจอเดียว · AI บอกว่ากู้ใหม่ดีไหม จ่ายเพิ่ม ฿500/เดือน ลดได้กี่เดือน',
                points: [
                  'ปลดหนี้ก้อนนี้ภายใน X เดือน — ดูเป็นวันที่ชัดเจน',
                  'AI: "ถ้าใส่เพิ่มเดือนละ ฿1,000 จบเร็วขึ้น 14 เดือน"',
                  'ดอกเบี้ยรวมที่ประหยัดได้ — ดูเป็นเลขจริง',
                ],
                img: '/marketing/debt-plan.png',
                accent: 'amber',
              },
              {
                tag: 'ก่อน: "ไม่รู้จะถามใคร"',
                title: 'AI ที่ปรึกษา 8 มิติ — ตอบเป็นภาษาไทย อ้างอิงตัวเลขจริงของคุณ',
                desc:
                  'ปลดหนี้ ลดภาษี เกษียณ ตรวจ Gap ประกัน Emergency Fund เป้าหมาย ลงทุน — เลือกหัวข้อ แล้วได้รายงานที่อ่านเข้าใจ ทำตามได้จริง · ใช้ข้อมูลของคุณเอง ไม่ใช่ template',
                points: [
                  'ตอบเป็นไทยทันที · อ้างอิงตัวเลขจริงของคุณ',
                  'Top 5 ที่ควรแก้ก่อน — เรียงตามผลกระทบจริง',
                  'ใช้ AI key ตัวเองได้ → ไม่จำกัด · ฟรี',
                ],
                img: '/marketing/advisor-home.png',
                accent: 'violet',
              },
            ].map((row, idx) => {
              const reverse = idx % 2 === 1;
              const accentBg = {
                emerald: 'bg-emerald-50 text-emerald-700',
                amber: 'bg-amber-50 text-amber-700',
                violet: 'bg-violet-50 text-violet-700',
              }[row.accent];
              return (
                <div
                  key={idx}
                  className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-12 ${
                    reverse ? 'lg:[&>div:first-child]:order-2' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-[#C9A45A]/12 via-transparent to-[#0F172A]/8 blur-xl" />
                    <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl">
                      <Image
                        src={row.img}
                        alt={row.title}
                        width={1200}
                        height={900}
                        className="h-auto w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${accentBg}`}>
                      {row.tag}
                    </div>
                    <h3 className="mb-3 text-2xl font-bold leading-snug md:text-3xl">
                      {row.title}
                    </h3>
                    <p className="mb-5 text-base text-[#0F172A]/70">{row.desc}</p>
                    <ul className="space-y-2 text-sm text-[#0F172A]/85">
                      {row.points.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 flex-none text-[#C9A45A]" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────── REWARD VALUE-STACK ─────────────── */}
      <section className="bg-[#0F172A] px-4 py-16 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C9A45A]/40 bg-[#C9A45A]/10 px-3 py-1 text-xs text-[#E4C789]">
            <Gift className="h-3 w-3" />
            สิ่งที่คุณได้เมื่อสมัครผ่านลิงก์นี้
          </div>
          <h2 className="mb-3 text-3xl font-bold md:text-4xl">
            ของขวัญที่{' '}
            <span className="bg-gradient-to-r from-[#E4C789] via-[#C9A45A] to-[#8A6932] bg-clip-text text-transparent">
              {referrerName}
            </span>{' '}
            มอบให้
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-white/65">
            ของจริง · ไม่มีล่อหลอก · ไม่ต้องผูกบัตร
          </p>

          <div className="mx-auto mt-8 max-w-lg">
            <Card className="relative overflow-hidden border-2 border-[#C9A45A]/40 bg-white/5">
              <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-[#C9A45A]/20 blur-2xl" />
              <CardContent className="relative space-y-4 p-8 text-left">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-[#E4C789]" />
                  <h3 className="text-xl font-bold">Pro · 30 วันฟรี</h3>
                  <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                    ของแถม
                  </span>
                </div>
                <ul className="space-y-2.5 text-sm text-white/85">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-[#C9A45A]" />
                    <span><b>AI Chat ไม่จำกัด</b> · ถามเรื่องเงินได้ตลอดเวลา</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-[#C9A45A]" />
                    <span><b>AI Advisor 8 มิติ ไม่จำกัด</b> · รายงานเชิงลึก</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-[#C9A45A]" />
                    <span><b>AI Secretary</b> · push เตือนทุกวัน อย่าให้ลืม</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-[#C9A45A]" />
                    <span>ทั้งคุณ <b>และ {referrerName}</b> ได้ Pro 30 วันเหมือนกัน</span>
                  </li>
                </ul>
                <div className="border-t border-white/10 pt-4">
                  <p className="text-[11px] text-white/55">
                    มูลค่าปกติ ฿149/เดือน · หลัง 30 วันถ้าไม่ subscribe ต่อจะกลับเป็น Free อัตโนมัติ
                    (ฟีเจอร์หลักของ Lumenfi ยังใช้ฟรีได้ตลอด)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 flex flex-col items-center gap-2">
            <Button asChild size="lg" className="bg-[#C9A45A] text-[#0F172A] hover:bg-[#E4C789]">
              <Link href={signupHref}>
                รับของขวัญ — ใช้เวลา 30 วินาที
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-[11px] text-white/55">
              ไม่ต้องผูกบัตร · ยกเลิกได้ทุกเมื่อ
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────── URGENCY + TRUST ─────────────── */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-5 text-center">
                <Shield className="mx-auto h-6 w-6 text-emerald-600" />
                <p className="mt-2 text-sm font-semibold">ข้อมูลของคุณ คุณคุมเอง</p>
                <p className="mt-1 text-xs text-[#0F172A]/65">
                  Supabase RLS — ไม่มีใครอ่านข้อมูลคุณได้นอกจากคุณ
                </p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-5 text-center">
                <Clock className="mx-auto h-6 w-6 text-amber-600" />
                <p className="mt-2 text-sm font-semibold">สมัคร 30 วินาที</p>
                <p className="mt-1 text-xs text-[#0F172A]/65">
                  Email + password หรือ Google · ไม่ต้องกรอกบัตร
                </p>
              </CardContent>
            </Card>
            <Card className="border-violet-200 bg-violet-50/50">
              <CardContent className="p-5 text-center">
                <Star className="mx-auto h-6 w-6 text-violet-600" />
                <p className="mt-2 text-sm font-semibold">{referrerName} ใช้แล้ว</p>
                <p className="mt-1 text-xs text-[#0F172A]/65">
                  เพื่อนของคุณเชื่อใจถึงชวน
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─────────────── FINAL EMOTIONAL CTA ─────────────── */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#0F172A] via-[#10162B] to-[#0B0F1F] text-white">
            <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[#C9A45A]/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-[#C9A45A]/10 blur-3xl" />
            <CardContent className="relative p-8 text-center md:p-14">
              <div className="mb-5 inline-flex">
                <LogoMark size={64} className="rounded-2xl shadow-xl" />
              </div>
              <h2 className="mb-3 text-3xl font-bold leading-tight md:text-4xl">
                อย่าให้เดือนถัดไป
                <br />
                <span className="bg-gradient-to-r from-[#E4C789] to-[#C9A45A] bg-clip-text text-transparent">
                  เป็นแบบเดิม
                </span>
              </h2>
              <p className="mx-auto mb-7 max-w-xl text-base text-white/75">
                ทุกเดือนที่ผ่านไปโดยไม่รู้เงินไปไหน คือเดือนที่คุณห่างจากเป้าหมายไป 1 เดือน{' '}
                — {referrerName} ใช้แอพนี้แล้วชีวิตเปลี่ยน · ตอนนี้ถึงตาคุณ
              </p>
              <Button asChild size="lg" className="bg-[#C9A45A] text-[#0F172A] hover:bg-[#E4C789]">
                <Link href={signupHref}>
                  รับของขวัญจาก {referrerName}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-3 text-[11px] text-white/55">
                สมัคร 30 วินาที · Pro 30 วันรอคุณอยู่ · ยกเลิกได้ทุกเมื่อ
              </p>
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/65">
                <Gift className="h-3 w-3 text-[#E4C789]" />
                รหัสที่จะใส่: <span className="ml-1 font-mono font-semibold text-[#E4C789]">{normalizedCode}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-black/5 bg-white py-8 text-center text-xs text-[#0F172A]/60">
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
