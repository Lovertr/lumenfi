import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Wallet } from 'lucide-react';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { LogoutButton } from '@/components/auth/logout-button';
import { formatTHB } from '@/lib/utils';
import { investmentTypeConfig } from '@/components/investments/investment-type-config';
import { getPortfolioMetrics } from '@/lib/queries/portfolio';
import { getTaxFundSummary } from '@/lib/queries/tax-saving';
import { PortfolioHero } from '@/components/investments/portfolio-hero';
import { AssetAllocation } from '@/components/investments/asset-allocation';
import { TopPerformers } from '@/components/investments/top-performers';
import { RefreshPricesButton } from '@/components/investments/refresh-prices-button';
import { AIAdvisor } from '@/components/investments/ai-advisor';
import { SETBenchmark } from '@/components/investments/set-benchmark';
import { TaxSavingCard } from '@/components/investments/tax-saving-card';

export const dynamic = 'force-dynamic';

export default async function InvestmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Investments');

  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const [metrics, taxSummary] = await Promise.all([
    getPortfolioMetrics(),
    getTaxFundSummary(yearStart),
  ]);
  const { holdings, totalValue, totalCost, totalPL, totalPLPercent, valueByType, valueByCurrency, valueByMarket, topGainers, topLosers } = metrics;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{t('title')}</h1>
            <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <RefreshPricesButton />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/investments/new">
              <Plus className="mr-1 h-4 w-4" />
              {t('addInvestment')}
            </Link>
          </Button>
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      {holdings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Wallet className="h-6 w-6" />
            </div>
            <p className="font-semibold">{t('noInvestments')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('noInvestmentsHint')}</p>
            <Button asChild className="mt-4">
              <Link href="/investments/new">
                <Plus className="h-4 w-4" />
                {t('addInvestment')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <PortfolioHero
            totalValue={totalValue}
            totalCost={totalCost}
            totalPL={totalPL}
            totalPLPercent={totalPLPercent}
            holdingsCount={holdings.length}
          />

          <TaxSavingCard
            totalValue={taxSummary.totalValueAll}
            totalContributed={taxSummary.totalContributedThisYear}
            count={taxSummary.holdings.length}
          />

          <AssetAllocation
            valueByType={valueByType}
            valueByCurrency={valueByCurrency}
            valueByMarket={valueByMarket}
            totalValue={totalValue}
          />

          <SETBenchmark portfolioPLPercent={totalPLPercent} />

          <AIAdvisor />

          <TopPerformers gainers={topGainers} losers={topLosers} />

          {/* Holdings list */}
          <div>
            <h2 className="mb-2 px-1 text-sm font-semibold">รายการทั้งหมด ({holdings.length})</h2>
            <div className="grid gap-2 lg:grid-cols-2 lg:gap-3">
              {holdings.map((h) => {
                const cfg = investmentTypeConfig[h.type as keyof typeof investmentTypeConfig] ?? investmentTypeConfig.other;
                return (
                  <Link key={h.id} href={`/investments/${h.id}`}>
                    <Card className="transition-all hover:border-primary/40 hover:shadow-sm">
                      <CardContent className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg sm:h-11 sm:w-11 sm:text-xl ${cfg.bg}`}>
                          {cfg.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">
                            {h.symbol ? <span className="font-mono">{h.symbol}</span> : <span className="text-sm">{h.name}</span>}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {h.quantity} × {formatTHB(h.avg_cost)}
                            {h.broker && ` · ${h.broker}`}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold sm:text-base">{formatTHB(h.valueTHB)}</p>
                          <p className={`text-[11px] ${h.pl >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {h.pl >= 0 ? '+' : ''}{h.plPercent.toFixed(1)}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          <Button asChild size="lg" className="fixed bottom-24 right-4 h-14 rounded-full shadow-lg sm:hidden">
            <Link href="/investments/new">
              <Plus className="h-5 w-5" />
              {t('addInvestment')}
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}
