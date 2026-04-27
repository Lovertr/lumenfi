import { setRequestLocale, getTranslations } from 'next-intl/server';
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
} from 'lucide-react';

const featureKeys = [
  { key: 'income', icon: Wallet, color: 'text-blue-600' },
  { key: 'debt', icon: Receipt, color: 'text-red-600' },
  { key: 'investment', icon: TrendingUp, color: 'text-green-600' },
  { key: 'goals', icon: Target, color: 'text-purple-600' },
  { key: 'ai', icon: Brain, color: 'text-orange-600' },
  { key: 'netWorth', icon: PiggyBank, color: 'text-pink-600' },
] as const;

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Landing');
  const tF = await getTranslations('Features');

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <LogoMark size={32} />
          <Wordmark className="text-lg" />
        </div>
        <LanguageSwitcher />
      </div>

      {/* Hero */}
      <section className="px-4 pb-12 pt-12 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex">
            <LogoMark size={88} className="rounded-3xl shadow-xl" />
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-6xl">
            {t('heroTitle1')}
            <br />
            <span className="bg-gradient-to-r from-[#F59E0B] to-[#FCD34D] bg-clip-text text-transparent">
              {t('heroTitle2')}
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-base text-muted-foreground md:text-lg">
            {t('heroSubtitle')}
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup">
                {t('ctaPrimary')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/login">{t('ctaSecondary')}</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t('ctaNote')}</p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold md:text-3xl">{t('featuresTitle')}</h2>
            <p className="mt-2 text-muted-foreground">{t('featuresSubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featureKeys.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.key} className="transition-shadow hover:shadow-md">
                  <CardContent className="pt-5">
                    <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${f.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-1 font-semibold">{tF(`${f.key}.title`)}</h3>
                    <p className="text-sm text-muted-foreground">{tF(`${f.key}.desc`)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16">
        <Card className="mx-auto max-w-2xl bg-[#0A0F1F] text-white">
          <CardContent className="p-8 text-center">
            <h2 className="mb-2 text-2xl font-bold">{t('ctaFinalTitle')}</h2>
            <p className="mb-6 opacity-90">{t('ctaFinalSubtitle')}</p>
            <Button asChild variant="secondary" size="lg">
              <Link href="/signup">
                {t('ctaFinalButton')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>{t('footer')}</p>
      </footer>
    </main>
  );
}
