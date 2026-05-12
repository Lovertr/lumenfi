import { redirect } from 'next/navigation';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import {
  ArrowRight,
  Check,
  Sparkles,
  Gift,
  Wallet,
  Brain,
  Shield,
  HeartHandshake,
  TrendingUp,
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
  // Anonymous visitors can't read other users' profiles, so we need a
  // service-role read here. Scope: a single SELECT of (full_name) only.
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

  // If it's not a user referral, try agent invite code → forward to /i/[code]
  if (!referrerName) {
    try {
      const { data: agent } = await svc
        .from('agents')
        .select('id')
        .eq('invite_code', normalizedCode)
        .eq('status', 'active')
        .maybeSingle();
      if (agent) {
        redirect(`/${locale}/i/${normalizedCode}`);
      }
    } catch (err) {
      if ((err as any)?.digest?.startsWith?.('NEXT_REDIRECT')) throw err;
    }
    // No match anywhere — go to public landing
    redirect(`/${locale}`);
  }

  // If user is already signed in, send them straight to settings/referral
  // where the claim form will auto-fill + lock with this code.
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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={28} />
            <Wordmark className="text-base" />
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Hero / invite welcome */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0F172A] via-[#10162B] to-[#0B0F1F] px-4 py-14 text-white">
        <div className="pointer-events-none absolute -left-24 -top-24 h-[360px] w-[360px] rounded-full bg-[#C9A45A]/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-1/3 h-[320px] w-[320px] rounded-full bg-[#C9A45A]/10 blur-3xl" />

        <div className="relative mx-auto max-w-2xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#C9A45A]/40 bg-[#C9A45A]/10 px-3 py-1 text-xs text-[#E4C789]">
            <HeartHandshake className="h-3 w-3" />
            มีคนชวนคุณมาใช้ Lumenfi
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            <span className="text-white/90">{referrerName}</span>
            <br />
            <span className="bg-gradient-to-r from-[#E4C789] via-[#C9A45A] to-[#8A6932] bg-clip-text text-transparent">
              ชวนคุณมาเริ่มต้น
            </span>
          </h1>
          <p className="mb-6 text-base text-white/75 md:text-lg">
            Lumenfi คือแอพบริหารการเงินส่วนตัวที่ครอบคลุมทั้ง รายรับ-รายจ่าย หนี้ ลงทุน ประกัน เกษียณ —
            พร้อม AI ที่ปรึกษาที่ตอบคุณเป็นภาษาไทย
          </p>

          {/* Reward callout */}
          <Card className="border-[#C9A45A]/40 bg-[#C9A45A]/10 text-white shadow-2xl">
            <CardContent className="flex items-center gap-4 p-5 text-left">
              <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-[#C9A45A] to-[#8A6932] text-2xl shadow-md">
                🎁
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[#E4C789]">รางวัลพิเศษเมื่อสมัครผ่านลิงก์นี้</p>
                <p className="mt-1 text-base font-semibold">
                  Pro <span className="text-2xl text-[#E4C789]">฿0</span> ทดลองฟรี{' '}
                  <span className="text-[#E4C789]">30 วัน</span>
                </p>
                <p className="mt-0.5 text-xs text-white/65">
                  ทั้งคุณและ {referrerName} ได้รับ Pro 30 วันฟรี — ไม่ต้องผูกบัตรเครดิต
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="bg-[#C9A45A] text-[#0F172A] hover:bg-[#E4C789]">
              <Link href={signupHref}>
                สมัครฟรี + รับ Pro 30 วัน
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              <Link href={loginHref}>ฉันมีบัญชีแล้ว</Link>
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-white/55">
            สมัคร 30 วินาที · email + password หรือ Google · ยกเลิกได้ทุกเมื่อ
          </p>
        </div>
      </section>

      {/* Value props — short version of main landing */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-2xl font-bold md:text-3xl">
            ทำไม {referrerName} ถึงชวนคุณมา?
          </h2>
          <p className="mb-8 text-center text-sm text-[#0F172A]/65">
            เพราะ Lumenfi เปลี่ยน "ไม่รู้เงินไปไหน" เป็น "เห็นทุกบาทไปอยู่ตรงไหน"
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Wallet,
                t: 'เห็นภาพรวมการเงินทั้งชีวิต',
                d: 'Net Worth · กระแสเงินสด · หนี้ · เป้าหมาย · ลงทุน รวมในจอเดียว',
              },
              {
                icon: Brain,
                t: 'AI ที่ปรึกษา 8 มิติ',
                d: 'ปลดหนี้ · ลดภาษี · เกษียณ · Gap ประกัน · เป้าหมาย · Emergency Fund',
              },
              {
                icon: TrendingUp,
                t: 'รู้ว่าเมื่อไรปลดหนี้ได้',
                d: 'Avalanche / Snowball / Refinance — คำนวณให้ดูเป็นเดือนเลย',
              },
              {
                icon: Shield,
                t: 'ข้อมูลของคุณ คุณคุมเอง',
                d: 'Supabase RLS — แม้แต่ทีม Lumenfi ก็อ่านข้อมูลของคุณไม่ได้',
              },
              {
                icon: Sparkles,
                t: 'รองรับรอบเงินเดือนไทย',
                d: 'เงินเดือนวันที่ 25? ระบบทำงานตามรอบของคุณ — ไม่ใช่แค่ 1-31',
              },
              {
                icon: Gift,
                t: 'ฟรีจริง · ไม่มีล่อหลอก',
                d: 'ฟีเจอร์หลักครบทั้งหมดในแพลน Free — Pro แค่ปลดล็อก AI ไม่อั้น',
              },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <Card
                  key={i}
                  className="border-black/10 bg-white transition-all hover:-translate-y-0.5 hover:border-[#C9A45A]/30 hover:shadow-md"
                >
                  <CardContent className="p-5">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-[#C9A45A]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-1 font-semibold text-[#0F172A]">{p.t}</h3>
                    <p className="text-sm text-[#0F172A]/65">{p.d}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How the reward works */}
      <section className="bg-white px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-center text-2xl font-bold md:text-3xl">
            รางวัล Pro 30 วันทำงานยังไง
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { n: '1', t: 'สมัครฟรี', d: 'กดปุ่ม "สมัครฟรี + รับ Pro 30 วัน" ด้านบน' },
              { n: '2', t: 'ระบบใส่โค้ดให้', d: 'โค้ดของ ' + referrerName + ' จะถูกใส่อัตโนมัติ' },
              { n: '3', t: 'รับ Pro 30 วัน', d: 'ทั้งคุณและเพื่อนได้ Pro ฟรี 30 วันทันที' },
            ].map((s) => (
              <div
                key={s.n}
                className="relative rounded-xl border border-black/10 bg-[#FAFAF7] p-5"
              >
                <div className="absolute -top-3 left-5 rounded-full bg-[#C9A45A] px-2 py-0.5 text-[10px] font-bold text-[#0F172A]">
                  {s.n}
                </div>
                <h3 className="mt-2 font-semibold">{s.t}</h3>
                <p className="mt-1 text-xs text-[#0F172A]/65">{s.d}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 rounded-md border border-black/10 bg-[#FAFAF7] p-3 text-center text-xs text-[#0F172A]/65">
            💡 ไม่ต้องผูกบัตรเครดิต · หลัง 30 วันถ้าไม่ subscribe ต่อจะกลับเป็น Free อัตโนมัติ
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-14">
        <div className="mx-auto max-w-2xl">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#0F172A] via-[#10162B] to-[#0B0F1F] text-white">
            <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#C9A45A]/15 blur-3xl" />
            <CardContent className="relative p-8 text-center md:p-12">
              <div className="mb-4 inline-flex">
                <LogoMark size={56} className="rounded-2xl shadow-xl" />
              </div>
              <h2 className="mb-2 text-2xl font-bold md:text-3xl">เริ่มได้เลย</h2>
              <p className="mb-6 text-sm text-white/75">
                บันทึกครั้งแรกใช้เวลา 30 วินาที AI Advisor รายงานแรก 60 วินาที — และ Pro 30 วันรอคุณอยู่
              </p>
              <Button asChild size="lg" className="bg-[#C9A45A] text-[#0F172A] hover:bg-[#E4C789]">
                <Link href={signupHref}>
                  สมัครฟรี + รับ Pro 30 วัน
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-3 text-[11px] text-white/55">
                รหัสที่จะใส่: <span className="font-mono text-[#E4C789]">{normalizedCode}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-black/5 bg-white py-8 text-center text-xs text-[#0F172A]/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4">
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
