import { setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import {
  ArrowRight,
  Check,
  ArrowLeft,
  Wallet,
  TrendingUp,
  Target,
  Brain,
  Receipt,
  PiggyBank,
  Camera,
  Calculator,
  HeartPulse,
  LineChart,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogoMark, Wordmark } from '@/components/brand/logo-mark';
import { LanguageSwitcher } from '@/components/layout/language-switcher';

export const dynamic = 'force-dynamic';

const SECTIONS = [
  {
    id: 'logging',
    icon: Receipt,
    title: 'บันทึก & สแกน',
    sub: 'Income · Expense · Transfer · Receipts',
    img: '/marketing/add-transaction.png',
    points: [
      'บันทึกรายรับ-รายจ่ายใน 5 วิ — เลือกหมวดด้วย icon grid',
      'ถ่ายรูปใบเสร็จ — AI ดึงยอด + วันที่ + หมวด',
      'รองรับหลายบัญชี (ธนาคาร · เงินสด · บัตรเครดิต)',
      'ผูกรายการเข้าเป้าหมายการออมตอนบันทึก',
      'นำเข้าใบเสร็จย้อนหลัง · export CSV ไป Excel',
    ],
  },
  {
    id: 'dashboard',
    icon: LineChart,
    title: 'Dashboard',
    sub: 'Net Worth · Health Score · Cash Flow',
    img: '/marketing/dashboard.png',
    points: [
      'Net Worth สด — ทรัพย์สินลบหนี้',
      'คะแนนสุขภาพการเงิน 0-100 พร้อมจุดอ่อน',
      'Cash Flow status — สบาย · ตึง · เสี่ยง',
      'รายรับ-รายจ่ายเดือนนี้พร้อม % budget',
      'AI Advisor entry point เห็นได้จาก Dashboard',
    ],
  },
  {
    id: 'networth',
    icon: TrendingUp,
    title: 'Net Worth Chart',
    sub: 'Time-series · Snapshot · Trend',
    img: '/marketing/networth-chart.png',
    points: [
      'Snapshot อัตโนมัติทุกวัน — ไม่ต้องบันทึกมือ',
      'เลือกช่วง 1 เดือน / 3 เดือน / 6 เดือน / 1 ปี / ทั้งหมด',
      'แสดง % เปลี่ยนแปลงจากจุดเริ่ม',
      'เจาะดูทรัพย์สิน vs หนี้สินแยกได้',
      'เปรียบเทียบกับเป้าหมาย net worth ที่ตั้งไว้',
    ],
  },
  {
    id: 'cashflow',
    icon: Wallet,
    title: 'Cash Flow',
    sub: 'Runway · 30/60/90 trend · Warning',
    img: '/marketing/cashflow.png',
    points: [
      'Runway เป็นเดือน — "อยู่ได้กี่เดือนถ้ารายได้หยุด"',
      'การ์ดสรุป 30/60/90 วัน แสดง P/L',
      'ทำงานตามรอบเงินเดือน (ไม่ใช่แค่ 1-31)',
      'แจ้งเตือนเมื่อกระแสเงินสดเข้าสู่สถานะ "ตึง"',
      'Daily timeline เห็นจุด spike ที่ใช้เยอะ',
    ],
  },
  {
    id: 'debt',
    icon: Calculator,
    title: 'หนี้สิน & ผ่อน',
    sub: 'Amortization · DTI · Refinance',
    img: '/marketing/debt-plan.png',
    points: [
      'รองรับ flat rate · effective rate · revolving daily',
      'ตารางผ่อน 60 เดือน — เห็นทุกงวดทันที',
      'DTI calculator + เตือนเมื่อ DTI > 40%',
      'แผน Avalanche / Snowball / Refinance',
      'AI ที่ปรึกษา: "ควรกู้ก้อนนี้ไหม"',
      'บัตรเครดิต statement + วันครบกำหนด',
    ],
  },
  {
    id: 'budget',
    icon: PiggyBank,
    title: 'งบประมาณ',
    sub: '13 หมวด · pay cycle aware · overrun alerts',
    img: '/marketing/budget.png',
    points: [
      '13 หมวดเริ่มต้น + custom ได้',
      'Progress bar + callout เกินงบ',
      'เลือกใช้รอบปฏิทินหรือรอบเงินเดือน',
      'แอปแนะนำงบจาก 3 เดือนที่ผ่านมา',
      'เตือนแบบ push เมื่อใกล้เกินงบ',
    ],
  },
  {
    id: 'ai',
    icon: Brain,
    title: 'AI Advisor',
    sub: '8 มิติ · ตอบไทย · BYO key',
    img: '/marketing/advisor-home.png',
    points: [
      'สุขภาพการเงินรวม — รายงานแบบครบทุกมิติ',
      'กลยุทธ์ปลดหนี้ (Avalanche / Snowball / Refinance)',
      'ลดภาษี — RMF / SSF / PVD calculator',
      'วางแผนเกษียณ — 25-30× รายจ่ายต่อปี',
      'ตรวจ Gap ประกัน (life / health / CI)',
      'เร่งบรรลุเป้าหมาย — SMART goals + auto-pilot',
      'Rebalance การลงทุน · Asset allocation',
      'Emergency Fund readiness',
      '⭐ Pro ใช้ไม่จำกัด · Free ฟรี 1 รายงาน/เดือน · BYO Key ไม่อนุญาต',
    ],
  },
  {
    id: 'health',
    icon: HeartPulse,
    title: 'รายงานสุขภาพการเงิน',
    sub: 'Score 0-100 · Top 5 actions · Sub-scores',
    img: '/marketing/health-report.png',
    points: [
      'คะแนนรวม 0-100 พร้อมป้ายระดับ',
      'Sub-scores: Cash Flow · Emergency Fund · Investment',
      'Top 5 ที่ควรแก้ก่อน — เรียงตามผลกระทบ',
      'เทียบกับเดือนที่แล้ว — ดีขึ้น/แย่ลง',
      'ใช้เป็น snapshot ส่งให้ที่ปรึกษาได้',
    ],
  },
  {
    id: 'goals',
    icon: Target,
    title: 'เป้าหมายการเงิน',
    sub: 'Emergency Fund · บ้าน · เกษียณ · ลูก',
    img: '/marketing/dashboard-notify.png',
    points: [
      'ตั้งเป้าหมายได้หลายตัว · prioritize ได้',
      'ผูกบัญชี + การลงทุนเข้าเป้าหมาย',
      'AI แนะนำเงินสมทบรายเดือนที่ต้องเก็บ',
      'Progress bar + ETA วันที่จะถึงเป้า',
      'เตือนเมื่อเหลือเวลาน้อยแต่ progress ช้า',
    ],
  },
  {
    id: 'invest',
    icon: TrendingUp,
    title: 'การลงทุน',
    sub: 'Portfolio · DCA · Watchlist · ลดหย่อน',
    img: '/marketing/investment.png',
    points: [
      'พอร์ตหุ้น · กองทุน · ทอง · คริปโต ที่เดียว',
      'P/L · % return · asset allocation donut',
      'DCA Auto + DCA Calc + Risk Metrics',
      'Watchlist พร้อม push เตือนราคา',
      'Tax-saving tracker (RMF/SSF/PVD)',
      'Capital gains report ประจำปี',
    ],
  },
];

export default async function FeaturesPage({ params }: { params: Promise<{ locale: string }> }) {
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
              <Link href="/pricing">ราคา</Link>
            </Button>
            <Button asChild size="sm" className="bg-[#0F172A] text-white hover:bg-[#0F172A]/90">
              <Link href="/signup">
                เริ่มใช้งานฟรี
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#0F172A] via-[#10162B] to-[#0B0F1F] px-4 py-16 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-1 text-sm text-white/65 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> กลับหน้าหลัก
          </Link>
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            ฟีเจอร์ทั้งหมด
            <br />
            <span className="bg-gradient-to-r from-[#E4C789] via-[#C9A45A] to-[#8A6932] bg-clip-text text-transparent">
              ในที่เดียว
            </span>
          </h1>
          <p className="mt-4 text-base text-white/75 md:text-lg">
            10 โมดูลที่ทำงานร่วมกันเพื่อให้คุณเห็นภาพการเงินครบทุกด้าน
          </p>
        </div>
      </section>

      {/* Quick nav */}
      <section className="border-b border-black/5 bg-white px-4 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-2 text-sm">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-[#FAFAF7] px-3 py-1.5 text-xs hover:border-[#C9A45A]/40 hover:bg-[#FFF8EA]"
              >
                <Icon className="h-3.5 w-3.5 text-[#C9A45A]" />
                {s.title}
              </a>
            );
          })}
        </div>
      </section>

      {/* Sections */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl space-y-20 lg:space-y-28">
          {SECTIONS.map((s, idx) => {
            const Icon = s.icon;
            const reverse = idx % 2 === 1;
            return (
              <div
                key={s.id}
                id={s.id}
                className={`scroll-mt-24 grid items-center gap-8 lg:grid-cols-2 lg:gap-12 ${
                  reverse ? 'lg:[&>div:first-child]:order-2' : ''
                }`}
              >
                {/* Image */}
                <div className="relative">
                  <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-[#C9A45A]/12 via-transparent to-[#0F172A]/8 blur-xl" />
                  <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl">
                    <Image
                      src={s.img}
                      alt={s.title}
                      width={1200}
                      height={900}
                      className="h-auto w-full"
                    />
                  </div>
                </div>
                {/* Text */}
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#0F172A]/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-[#0F172A]/70">
                    <Icon className="h-3.5 w-3.5 text-[#C9A45A]" />
                    {s.sub}
                  </div>
                  <h2 className="mb-4 text-2xl font-bold md:text-3xl">{s.title}</h2>
                  <ul className="space-y-2 text-sm text-[#0F172A]/80">
                    {s.points.map((p, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 flex-none text-[#C9A45A]" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Extra: trust + automation */}
      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">ฟีเจอร์เบื้องหลังที่คอยช่วยคุณ</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Bell,
                t: 'การแจ้งเตือน',
                d: 'Push reminder รายวัน · ตั้งเวลา 0-23 น. · มี "ข้ามถ้าวันนี้บันทึกแล้ว"',
              },
              {
                icon: ShieldCheck,
                t: 'ความปลอดภัย',
                d: 'Supabase RLS · End-to-end · BYO Key สำหรับ Chat · PDPA compliant',
              },
              {
                icon: Camera,
                t: 'PWA · ทำงาน offline',
                d: 'ติดตั้งบนมือถือเป็น native app · บันทึกได้ offline · sync อัตโนมัติ',
              },
            ].map((b, i) => {
              const Icon = b.icon;
              return (
                <div key={i} className="rounded-xl border border-black/10 bg-[#FAFAF7] p-5">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-[#C9A45A]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h4 className="font-semibold">{b.t}</h4>
                  <p className="mt-1 text-sm text-[#0F172A]/65">{b.d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#0F172A] via-[#10162B] to-[#0B0F1F] text-white">
            <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#C9A45A]/15 blur-3xl" />
            <CardContent className="relative p-10 text-center md:p-14">
              <div className="mb-5 inline-flex">
                <LogoMark size={56} className="rounded-2xl shadow-xl" />
              </div>
              <h2 className="mb-3 text-3xl font-bold md:text-4xl">พร้อมเริ่มแล้วใช่ไหม?</h2>
              <p className="mb-7 text-white/75">ฟีเจอร์ทั้งหมดข้างบนใช้ได้บนแพลน Free</p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-[#C9A45A] text-[#0F172A] hover:bg-[#E4C789]">
                  <Link href="/signup">
                    สมัครฟรีตอนนี้
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  <Link href="/pricing">ดูราคา</Link>
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
          <p>© 2026 Lumenfi · Aurum Quietus</p>
        </div>
      </footer>
    </main>
  );
}
