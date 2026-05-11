import { setRequestLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogoMark, Wordmark } from '@/components/brand/logo-mark';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import {
  Wallet,
  TrendingUp,
  Target,
  Brain,
  Receipt,
  PiggyBank,
  ArrowRight,
  Check,
  Shield,
  Sparkles,
  Star,
  Quote,
  Eye,
  Lightbulb,
  KeyRound,
  CalendarClock,
  MessagesSquare,
  Briefcase,
  HeartPulse,
  Calculator,
  LineChart,
  Camera,
} from 'lucide-react';

// PAS narrative — 5 showcase rows (tightened from 8) tied to pains
const showcaseRows = [
  { tag: 'row1', img: '/marketing/dashboard.png',       alt: 'Lumenfi Dashboard',     icon: LineChart },
  { tag: 'row2', img: '/marketing/add-transaction.png', alt: 'Quick Log + Scan',      icon: Camera },
  { tag: 'row3', img: '/marketing/debt-plan.png',       alt: 'Debt Payoff Plan',      icon: Receipt },
  { tag: 'row4', img: '/marketing/budget.png',          alt: 'Smart Budgets',         icon: Calculator },
  { tag: 'row5', img: '/marketing/advisor-home.png',    alt: 'AI Advisor 8 Dimensions', icon: Brain },
] as const;

const featureKeys = [
  { key: 'income', icon: Wallet, color: 'text-blue-600' },
  { key: 'debt', icon: Receipt, color: 'text-red-600' },
  { key: 'investment', icon: TrendingUp, color: 'text-green-600' },
  { key: 'goals', icon: Target, color: 'text-purple-600' },
  { key: 'ai', icon: Brain, color: 'text-orange-600' },
  { key: 'netWorth', icon: PiggyBank, color: 'text-pink-600' },
] as const;

const painIds = ['pain1', 'pain2', 'pain3', 'pain4', 'pain5', 'pain6'] as const;

const solutionSteps = [
  { key: 'sol1', icon: Eye },
  { key: 'sol2', icon: Lightbulb },
  { key: 'sol3', icon: Target },
] as const;

const whyPoints = [
  { key: 'why1', icon: CalendarClock },
  { key: 'why2', icon: MessagesSquare },
  { key: 'why3', icon: Shield },
  { key: 'why4', icon: KeyRound },
] as const;

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Landing');
  const tF = await getTranslations('Features');

  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#0F172A]">
      {/* ─────────────── Top bar ─────────────── */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#FAFAF7]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={32} />
            <Wordmark className="text-lg" />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link href="/features">Features</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link href="/pricing">Pricing</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link href="/agents">Agents</Link>
            </Button>
            <LanguageSwitcher />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">{t('ctaSecondary')}</Link>
            </Button>
            <Button asChild size="sm" className="bg-[#0F172A] text-white hover:bg-[#0F172A]/90">
              <Link href="/signup">
                {t('ctaPrimary')}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ─────────────── HERO — Pain headline ─────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0F172A] via-[#10162B] to-[#0B0F1F] text-white">
        <div className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#C9A45A]/15 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-1/3 h-[360px] w-[360px] rounded-full bg-[#C9A45A]/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2 lg:gap-12 lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#C9A45A]/40 bg-[#C9A45A]/10 px-3 py-1 text-xs text-[#E4C789]">
              <Sparkles className="h-3 w-3" />
              {t('eyebrow')}
            </div>
            <h1 className="mb-5 text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
              {t('heroTitle1')}
              <br />
              <span className="bg-gradient-to-r from-[#E4C789] via-[#C9A45A] to-[#8A6932] bg-clip-text text-transparent">
                {t('heroTitle2')}
              </span>
            </h1>
            <p className="mb-6 max-w-xl text-base text-white/75 md:text-lg">{t('heroSubtitle')}</p>

            <ul className="mb-8 space-y-2 text-sm text-white/85">
              {['heroBullet1', 'heroBullet2', 'heroBullet3'].map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-none text-[#C9A45A]" />
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-[#C9A45A] text-[#0F172A] hover:bg-[#E4C789]">
                <Link href="/signup">
                  {t('ctaPrimary')}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/login">{t('ctaSecondary')}</Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-white/55">{t('ctaNote')}</p>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-x-0 top-12 mx-auto h-72 w-72 rounded-full bg-[#C9A45A]/20 blur-3xl" />
            <div className="relative w-full max-w-[560px]">
              <div className="absolute -inset-3 -z-10 rounded-3xl bg-gradient-to-br from-[#C9A45A]/30 via-transparent to-[#C9A45A]/10 blur-xl" />
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl ring-1 ring-white/10">
                <Image
                  src="/marketing/dashboard.png"
                  alt={t('previewLabel')}
                  width={1120}
                  height={1024}
                  priority
                  className="h-auto w-full"
                />
              </div>
              <div className="mt-3 text-center text-xs text-white/55">{t('previewLabel')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── PAIN section ─────────────── */}
      <section className="px-4 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">{t('painTitle')}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-[#0F172A]/65">{t('painSubtitle')}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {painIds.map((id) => (
              <Card
                key={id}
                className="border-black/10 bg-white transition-all hover:-translate-y-0.5 hover:border-[#C9A45A]/30 hover:shadow-md"
              >
                <CardContent className="p-5">
                  <h3 className="mb-2 text-base font-semibold text-[#0F172A]">{t(`${id}Title`)}</h3>
                  <p className="text-sm text-[#0F172A]/70">{t(`${id}Desc`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── FOUNDER ORIGIN ─────────────── */}
      <section className="bg-gradient-to-br from-[#0F172A] via-[#101830] to-[#0B0F1F] px-4 py-20 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C9A45A]/40 bg-[#C9A45A]/10 px-3 py-1 text-xs text-[#E4C789]">
              <Quote className="h-3 w-3" />
              {t('founderTag')}
            </div>
          </div>
          <h2 className="mb-8 text-center text-3xl font-bold md:text-4xl">{t('founderTitle')}</h2>
          <div className="relative">
            <Quote className="absolute -left-2 -top-3 h-10 w-10 text-[#C9A45A]/30" />
            <div className="space-y-5 pl-8 text-base leading-relaxed text-white/85 md:text-lg">
              <p>{t('founderQuote')}</p>
              <p>{t('founderQuote2')}</p>
              <p className="font-medium text-white">{t('founderQuote3')}</p>
            </div>
            <p className="mt-6 pl-8 text-sm text-[#C9A45A]">{t('founderSign')}</p>
          </div>
        </div>
      </section>

      {/* ─────────────── BRAND ESSENCE — Lumen / one light, one path ─────────────── */}
      <section className="relative overflow-hidden px-4 py-20">
        {/* gold radial glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C9A45A]/8 blur-3xl" />
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-full bg-[#C9A45A]/30 blur-2xl" />
              <LogoMark size={72} className="rounded-2xl shadow-2xl" />
            </div>
          </div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C9A45A]/30 bg-[#C9A45A]/10 px-3 py-1 text-xs uppercase tracking-wider text-[#8A6932]">
            <Sparkles className="h-3 w-3" />
            {t('essenceTag')}
          </div>
          <h2 className="mb-4 text-3xl font-bold leading-tight md:text-5xl">
            <span className="bg-gradient-to-r from-[#C9A45A] via-[#E4C789] to-[#C9A45A] bg-clip-text text-transparent">
              {t('essenceTitle')}
            </span>
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-base text-[#0F172A]/70 md:text-lg">{t('essenceDesc')}</p>

          <div className="grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-black/10 bg-white p-4 shadow-sm transition-all hover:border-[#C9A45A]/40 hover:shadow-md"
              >
                <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gradient-to-br from-[#C9A45A] to-[#8A6932] text-xs font-bold text-white">
                  {i}
                </div>
                <p className="text-sm text-[#0F172A]/85">{t(`essenceB${i}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── SOLUTION (3 steps) ─────────────── */}
      <section className="px-4 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">{t('solutionTitle')}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-[#0F172A]/65">{t('solutionSubtitle')}</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {solutionSteps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.key}
                  className="relative rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition-all hover:border-[#C9A45A]/40 hover:shadow-lg"
                >
                  <div className="absolute -top-3 left-6 inline-flex items-center gap-2 rounded-full bg-[#0F172A] px-3 py-1 text-xs font-semibold text-[#C9A45A]">
                    <Icon className="h-3 w-3" />
                    {t(`${s.key}Tag`)}
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-[#0F172A]">{t(`${s.key}Title`)}</h3>
                  <p className="mt-2 text-sm text-[#0F172A]/70">{t(`${s.key}Desc`)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────── Stats strip ─────────────── */}
      <section className="border-y border-black/5 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="mb-6 text-center text-xs uppercase tracking-wider text-[#0F172A]/55">{t('statsTitle')}</p>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-[#0F172A] md:text-4xl">{t(`stat${i}Num`)}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-[#0F172A]/55 md:text-sm">
                  {t(`stat${i}Label`)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── SHOWCASE — pain → outcome reframe ─────────────── */}
      <section className="bg-gradient-to-b from-[#FAFAF7] via-white to-[#FAFAF7] px-4 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">{t('showcaseTitle')}</h2>
            <p className="mt-2 text-base text-[#0F172A]/65">{t('showcaseSubtitle')}</p>
          </div>

          <div className="space-y-20 lg:space-y-28">
            {showcaseRows.map((row, idx) => {
              const Icon = row.icon;
              const reverse = idx % 2 === 1;
              return (
                <div
                  key={row.tag}
                  className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-12 ${
                    reverse ? 'lg:[&>div:first-child]:order-2' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-[#C9A45A]/12 via-transparent to-[#0F172A]/8 blur-xl" />
                    <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl">
                      <Image
                        src={row.img}
                        alt={row.alt}
                        width={1200}
                        height={900}
                        className="h-auto w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                      <Icon className="h-3.5 w-3.5" />
                      {t(`${row.tag}Tag`)}
                    </div>
                    <h3 className="mb-3 text-2xl font-bold md:text-3xl">{t(`${row.tag}Title`)}</h3>
                    <p className="mb-5 text-base text-[#0F172A]/70">{t(`${row.tag}Desc`)}</p>
                    <ul className="space-y-2 text-sm text-[#0F172A]/85">
                      {['B1', 'B2', 'B3'].map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 flex-none text-[#C9A45A]" />
                          <span>{t(`${row.tag}${b}`)}</span>
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

      {/* ─────────────── WHY LUMENFI — Differentiators ─────────────── */}
      <section className="bg-[#0F172A] px-4 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">{t('whyTitle')}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-white/65">{t('whySubtitle')}</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {whyPoints.map((w) => {
              const Icon = w.icon;
              return (
                <div
                  key={w.key}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-[#C9A45A]/40 hover:bg-white/10"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#C9A45A]/15 text-[#C9A45A]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{t(`${w.key}Title`)}</h3>
                  <p className="text-sm text-white/70">{t(`${w.key}Desc`)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────── Feature pills (scannable summary) ─────────────── */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">{t('featuresTitle')}</h2>
            <p className="mt-2 text-base text-[#0F172A]/65">{t('featuresSubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureKeys.map((f) => {
              const Icon = f.icon;
              return (
                <Card
                  key={f.key}
                  className="border-black/5 bg-white transition-all hover:-translate-y-0.5 hover:border-[#C9A45A]/30 hover:shadow-lg"
                >
                  <CardContent className="pt-5">
                    <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-[#C9A45A]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-1 font-semibold text-[#0F172A]">{tF(`${f.key}.title`)}</h3>
                    <p className="text-sm text-[#0F172A]/65">{tF(`${f.key}.desc`)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Button asChild variant="outline" className="border-[#0F172A]/15">
              <Link href="/features">
                ดูทั้งหมด 10 โมดูล
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─────────────── Pricing teaser ─────────────── */}
      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">{t('pricingTitle')}</h2>
            <p className="mt-2 text-base text-[#0F172A]/65">{t('pricingSubtitle')}</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="border-black/10 bg-white">
              <CardContent className="p-6">
                <div className="mb-1 text-sm font-semibold uppercase tracking-wider text-[#0F172A]/60">
                  {t('pricingFreeTitle')}
                </div>
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{t('pricingFreePrice')}</span>
                </div>
                <div className="mb-5 text-sm text-[#0F172A]/65">{t('pricingFreeNote')}</div>
                <ul className="space-y-2 text-sm text-[#0F172A]/80">
                  {['B1', 'B2', 'B3'].map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                      <span>{t(`pricingFree${b}`)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="relative border-[#C9A45A] bg-gradient-to-br from-white to-[#FFF8EA] shadow-lg">
              <div className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full bg-[#C9A45A] px-3 py-1 text-xs font-semibold text-[#0F172A]">
                <Star className="h-3 w-3" />
                Pro
              </div>
              <CardContent className="p-6">
                <div className="mb-1 text-sm font-semibold uppercase tracking-wider text-[#C9A45A]">
                  {t('pricingProTitle')}
                </div>
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{t('pricingProPrice')}</span>
                  <span className="text-sm text-[#0F172A]/60">{t('pricingProPer')}</span>
                </div>
                <div className="mb-5 text-sm text-[#0F172A]/65">{t('pricingProNote')}</div>
                <ul className="space-y-2 text-sm text-[#0F172A]/85">
                  {['B1', 'B2', 'B3'].map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-none text-[#C9A45A]" />
                      <span>{t(`pricingPro${b}`)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 text-center">
            <Button asChild variant="outline" className="border-[#0F172A]/15">
              <Link href="/pricing">
                {t('pricingCta')}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─────────────── B2B agent CTA ─────────────── */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#0F172A] via-[#1A2342] to-[#0F172A] text-white">
            <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#C9A45A]/15 blur-3xl" />
            <CardContent className="relative grid gap-8 p-8 md:grid-cols-[1.2fr_1fr] md:p-12">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C9A45A]/40 bg-[#C9A45A]/10 px-3 py-1 text-xs text-[#E4C789]">
                  <Briefcase className="h-3 w-3" />
                  {t('agentTag')}
                </div>
                <h2 className="mb-3 text-2xl font-bold md:text-3xl">{t('agentTitle')}</h2>
                <p className="mb-6 text-white/75">{t('agentDesc')}</p>
                <ul className="mb-6 space-y-2 text-sm text-white/85">
                  {['B1', 'B2', 'B3'].map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-none text-[#C9A45A]" />
                      <span>{t(`agent${b}`)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="bg-[#C9A45A] text-[#0F172A] hover:bg-[#E4C789]">
                    <Link href="/agents">
                      {t('agentCta')}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                  >
                    <Link href="/agents/pricing">{t('agentSecondaryCta')}</Link>
                  </Button>
                </div>
              </div>
              <div className="hidden items-center justify-center md:flex">
                <div className="grid w-full max-w-xs grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                    <div className="text-2xl font-bold text-[#C9A45A]">฿299</div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-white/55">Starter</div>
                  </div>
                  <div className="rounded-xl border border-[#C9A45A]/40 bg-[#C9A45A]/10 p-4 text-center">
                    <div className="text-2xl font-bold text-[#E4C789]">฿699</div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-white/65">Pro</div>
                  </div>
                  <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                    <div className="text-2xl font-bold text-white">฿1,990</div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-white/55">Team</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─────────────── Trust ─────────────── */}
      <section className="border-y border-black/5 bg-white px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-center gap-2 text-center">
            <Shield className="h-5 w-5 text-[#C9A45A]" />
            <h2 className="text-xl font-semibold">{t('trustTitle')}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {['B1', 'B2', 'B3'].map((b) => (
              <div
                key={b}
                className="flex items-start gap-3 rounded-lg border border-black/5 bg-[#FAFAF7] p-4 text-sm"
              >
                <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                <span className="text-[#0F172A]/80">{t(`trust${b}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── FAQ ─────────────── */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-3xl font-bold md:text-4xl">{t('faqTitle')}</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <details
                key={i}
                className="group rounded-xl border border-black/10 bg-white p-5 transition-all open:border-[#C9A45A]/40 open:shadow-md"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-[#0F172A]">
                  <span>{t(`faqQ${i}`)}</span>
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#0F172A]/5 text-sm transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-[#0F172A]/70">{t(`faqA${i}`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── Final CTA — risk reversal ─────────────── */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#0F172A] via-[#10162B] to-[#0B0F1F] text-white">
            <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#C9A45A]/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[#C9A45A]/10 blur-3xl" />
            <CardContent className="relative p-10 text-center md:p-14">
              <div className="mb-5 inline-flex">
                <LogoMark size={64} className="rounded-2xl shadow-xl" />
              </div>
              <h2 className="mb-3 text-3xl font-bold md:text-4xl">{t('ctaFinalTitle')}</h2>
              <p className="mb-7 text-white/75">{t('ctaFinalSubtitle')}</p>
              <Button asChild size="lg" className="bg-[#C9A45A] text-[#0F172A] hover:bg-[#E4C789]">
                <Link href="/signup">
                  {t('ctaFinalButton')}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-4 text-xs text-white/55">{t('ctaFinalNote')}</p>
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
          <p>{t('footer')}</p>
        </div>
      </footer>
    </main>
  );
}
