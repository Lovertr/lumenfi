import { setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import {
  ArrowRight,
  Check,
  Briefcase,
  Target,
  Brain,
  LineChart,
  Bell,
  FileText,
  Users,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogoMark, Wordmark } from '@/components/brand/logo-mark';
import { LanguageSwitcher } from '@/components/layout/language-switcher';

export const dynamic = 'force-dynamic';

export default async function AgentLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#0F172A]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#FAFAF7]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={32} />
            <Wordmark className="text-lg" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/agents/pricing">ดูราคา</Link>
            </Button>
            <Button asChild size="sm" className="bg-[#0F172A] text-white hover:bg-[#0F172A]/90">
              <Link href="/agents/signup">
                สมัครเป็นตัวแทน
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0F172A] via-[#10162B] to-[#0B0F1F] text-white">
        <div className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#C9A45A]/15 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-1/3 h-[360px] w-[360px] rounded-full bg-[#C9A45A]/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-1 text-sm text-white/65 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> กลับหน้าหลัก
          </Link>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col justify-center">
              <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#C9A45A]/40 bg-[#C9A45A]/10 px-3 py-1 text-xs text-[#E4C789]">
                <Briefcase className="h-3 w-3" />
                Lumenfi Agent Marketplace · B2B
              </div>
              <h1 className="mb-5 text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
                Insurance gap ของผู้ใช้
                <br />
                <span className="bg-gradient-to-r from-[#E4C789] via-[#C9A45A] to-[#8A6932] bg-clip-text text-transparent">
                  = qualified leads ของคุณ
                </span>
              </h1>
              <p className="mb-6 max-w-xl text-base text-white/75 md:text-lg">
                Lumenfi วิเคราะห์ Gap ประกันชีวิต/สุขภาพ/CI ให้ผู้ใช้ — เมื่อเขาขอที่ปรึกษา
                ระบบ route ไปยังตัวแทนที่ตรง area + product มากที่สุด ทำงานเหมือนทีม Inside Sales ที่ทำงานให้คุณ 24/7
              </p>

              <ul className="mb-8 space-y-2 text-sm text-white/85">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-none text-[#C9A45A]" />
                  <span>ทดลอง <b>14 วันฟรี · 3 leads</b> — ไม่ต้องผูกบัตร</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-none text-[#C9A45A]" />
                  <span>เริ่ม Starter <b>฿299/เดือน</b> · 25 leads</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-none text-[#C9A45A]" />
                  <span>Pro <b>฿699/เดือน</b> · leads ไม่จำกัด + AI ช่วยขาย</span>
                </li>
              </ul>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-[#C9A45A] text-[#0F172A] hover:bg-[#E4C789]">
                  <Link href="/agents/signup">
                    เริ่มทดลองฟรี
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  <Link href="/agents/pricing">ดูแพ็คเกจทั้งหมด</Link>
                </Button>
              </div>
              <p className="mt-3 text-xs text-white/55">
                ต้องมีใบอนุญาตตัวแทนประกันที่ active · admin จะตรวจสอบก่อนอนุมัติ
              </p>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-x-0 top-12 mx-auto h-72 w-72 rounded-full bg-[#C9A45A]/20 blur-3xl" />
              <div className="relative w-full max-w-[520px]">
                <div className="absolute -inset-3 -z-10 rounded-3xl bg-gradient-to-br from-[#C9A45A]/30 via-transparent to-[#C9A45A]/10 blur-xl" />
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl ring-1 ring-white/10">
                  <Image
                    src="/marketing/insurance-gap.png"
                    alt="Insurance gap analysis with request-quote buttons"
                    width={1120}
                    height={1024}
                    className="h-auto w-full"
                  />
                </div>
                <div className="mt-3 text-center text-xs text-white/55">
                  หน้าวิเคราะห์ Gap ประกันที่ผู้ใช้เห็น — มีปุ่ม "ขอใบเสนอประกัน" ที่ส่ง lead เข้าระบบคุณตรงๆ
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value pillars */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">ทำงานเป็นทีมเดียวกับคุณ</h2>
            <p className="mt-2 text-base text-[#0F172A]/65">3 เสาหลักที่ช่วยตัวแทนปิดดีลเร็วขึ้น</p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Target,
                title: 'Lead Routing 3 ชั้น',
                desc: 'ผู้ใช้ที่มาผ่านลิงก์เชิญของคุณ → เข้าหาคุณตรงๆ · ถ้าไม่มีลิงก์เชิญ → match จากพื้นที่+ผลิตภัณฑ์ · ถ้ายังไม่ลงตัว → admin จัดสรรให้ ไม่ใช่ cold call สุ่ม',
              },
              {
                icon: Brain,
                title: 'AI Sales Assistant',
                desc: 'AI วิเคราะห์ prospect (income, dependents, gap amount) แล้วร่าง sales pitch ให้คุณ ก่อนจะนัดเจอครั้งแรก',
              },
              {
                icon: FileText,
                title: 'INA Report PDF',
                desc: 'เอกสาร Needs Analysis แบบ branded ที่คุณสามารถส่งให้ลูกค้าได้ทันที — ดูเป็น professional ไม่ใช่ขายตรง',
              },
              {
                icon: Bell,
                title: 'LINE Notify',
                desc: 'มี lead ใหม่ → แจ้งเตือนใน LINE ทันที ตอบกลับใน 5 นาทีแรกคือชนะแล้วครึ่งดีล',
              },
              {
                icon: LineChart,
                title: 'Performance Dashboard',
                desc: 'Conversion rate · response time · revenue · pipeline value — ดู KPI ของตัวเองแบบ real-time',
              },
              {
                icon: Shield,
                title: 'Compliance Built-in',
                desc: 'ผู้ใช้ consent ก่อน lead ถึงมือคุณ · เก็บ audit trail · ตรงตาม PDPA ตั้งแต่วันแรก',
              },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <Card key={i} className="border-black/10 bg-white transition-all hover:border-[#C9A45A]/40 hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-[#C9A45A]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 font-semibold text-[#0F172A]">{p.title}</h3>
                    <p className="text-sm text-[#0F172A]/65">{p.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">ขั้นตอน 4 ข้อ</h2>
            <p className="mt-2 text-base text-[#0F172A]/65">จากสมัคร — รับ lead ครั้งแรกใน 48 ชม.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { n: '01', t: 'สมัคร', d: 'กรอกใบอนุญาต + พื้นที่ + ผลิตภัณฑ์ที่ขาย' },
              { n: '02', t: 'รออนุมัติ', d: 'Admin ตรวจสอบใบอนุญาต — โดยปกติ 24 ชม.' },
              { n: '03', t: 'เริ่ม trial', d: '3 leads ฟรี · 14 วัน · ไม่ต้องผูกบัตร' },
              { n: '04', t: 'อัพเกรด', d: 'Starter ฿299 · Pro ฿699 · Team ฿1,990' },
            ].map((s) => (
              <div key={s.n} className="relative rounded-xl border border-black/10 bg-[#FAFAF7] p-5">
                <div className="absolute -top-3 left-5 rounded-full bg-[#C9A45A] px-2 py-0.5 text-[10px] font-bold text-[#0F172A]">
                  {s.n}
                </div>
                <h4 className="mt-2 font-semibold">{s.t}</h4>
                <p className="mt-1 text-xs text-[#0F172A]/65">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">ราคาแพ็คเกจ</h2>
            <p className="mt-2 text-base text-[#0F172A]/65">เริ่มเล็ก · scale ได้</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { name: 'Starter', price: 299, leads: '25 leads', highlight: false },
              { name: 'Pro', price: 699, leads: 'ไม่จำกัด + AI', highlight: true },
              { name: 'Team', price: 1990, leads: '5 ตัวแทน', highlight: false },
            ].map((p) => (
              <Card
                key={p.name}
                className={
                  p.highlight
                    ? 'relative border-2 border-[#C9A45A] bg-gradient-to-br from-white to-[#FFF8EA] shadow-lg'
                    : 'border-black/10 bg-white'
                }
              >
                {p.highlight && (
                  <div className="absolute -top-3 right-4 rounded-full bg-[#C9A45A] px-3 py-1 text-xs font-semibold text-[#0F172A]">
                    แนะนำ
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  <p className="mt-2 text-3xl font-bold">
                    ฿{p.price.toLocaleString('th-TH')}
                    <span className="text-sm font-normal text-[#0F172A]/60">/เดือน</span>
                  </p>
                  <p className="mt-2 text-sm text-[#0F172A]/65">{p.leads}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Button asChild className="bg-[#0F172A] text-white hover:bg-[#0F172A]/90">
              <Link href="/agents/pricing">
                ดูเปรียบเทียบทุกแพ็คเกจ
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-3xl font-bold md:text-4xl">คำถามที่พบบ่อย</h2>
          <div className="space-y-4">
            {[
              {
                q: 'ต้องมีใบอนุญาตอะไรบ้าง?',
                a: 'ใบอนุญาตตัวแทนประกันชีวิต/สุขภาพ/CI ที่ active กับ คปภ. · จะต้องอัพโหลดเอกสารตอนสมัครเพื่อให้ admin ตรวจสอบ',
              },
              {
                q: 'Leads ที่ได้เป็นแบบไหน?',
                a: 'ผู้ใช้ที่กดขอที่ปรึกษาเอง หลังจากเห็น Insurance Gap ของตัวเอง — เป็น qualified intent ไม่ใช่ list สุ่ม · มี consent ครบตาม PDPA',
              },
              {
                q: 'ราคาตามจำนวน lead จริงหรือเปล่า?',
                a: 'Starter จำกัด 25 leads/เดือน — เกินจะหยุดส่งจน reset เดือนถัดไป · Pro ไม่จำกัด · Team แชร์ leads pool ใน 5 ตัวแทน',
              },
              {
                q: 'ยกเลิกได้ไหม?',
                a: 'ได้ทุกเมื่อ — ใช้ได้จนสิ้น billing period · ระหว่าง trial ไม่มีค่าใช้จ่ายใดๆ',
              },
            ].map((f, i) => (
              <details
                key={i}
                className="group rounded-xl border border-black/10 bg-[#FAFAF7] p-5 open:border-[#C9A45A]/40 open:shadow-md"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold">
                  <span>{f.q}</span>
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#0F172A]/5 text-sm transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-[#0F172A]/70">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#0F172A] via-[#10162B] to-[#0B0F1F] text-white">
            <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#C9A45A]/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[#C9A45A]/10 blur-3xl" />
            <CardContent className="relative p-10 text-center md:p-14">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C9A45A]/40 bg-[#C9A45A]/10 px-3 py-1 text-xs text-[#E4C789]">
                <Users className="h-3 w-3" />
                เริ่ม trial วันนี้
              </div>
              <h2 className="mb-3 text-3xl font-bold md:text-4xl">ทดลอง 3 leads ฟรี 14 วัน</h2>
              <p className="mb-7 text-white/75">ไม่ต้องใส่บัตร · ยกเลิกได้ตลอด · approve ภายใน 24 ชม.</p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-[#C9A45A] text-[#0F172A] hover:bg-[#E4C789]">
                  <Link href="/agents/signup">
                    สมัครเป็นตัวแทน
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                  <Link href="/agents/pricing">ดูแพ็คเกจ</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-black/5 bg-white py-10 text-center text-sm text-[#0F172A]/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4">
          <div className="flex items-center gap-2">
            <LogoMark size={24} />
            <Wordmark className="text-sm" />
          </div>
          <p>© 2026 Lumenfi · Agent Marketplace · Built with Next.js + Supabase</p>
        </div>
      </footer>
    </main>
  );
}
