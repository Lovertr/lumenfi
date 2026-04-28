import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, TrendingUp, Trash2, TrendingDown } from 'lucide-react';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { LogoutButton } from '@/components/auth/logout-button';
import { formatTHB } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { investmentTypeConfig, type InvestmentType } from '@/components/investments/investment-type-config';
import { deleteInvestment } from './actions';

export const dynamic = "force-dynamic";

interface Investment {
  id: string;
  name: string;
  symbol: string | null;
  type: InvestmentType;
  broker_account: string | null;
  quantity: number;
  avg_cost: number;
  current_price: number | null;
  currency: string;
}

async function getInvestments(): Promise<Investment[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('investments')
      .select('id, name, symbol, type, broker_account, quantity, avg_cost, current_price, currency')
      .eq('archived', false)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data as Investment[]) ?? [];
  } catch {
    return [];
  }
}

export default async function InvestmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Investments');
  const tType = await getTranslations('Investments.types');

  const investments = await getInvestments();

  // Calculate totals
  let totalCost = 0;
  let totalValue = 0;
  const allocByType: Record<string, number> = {};

  for (const inv of investments) {
    const qty = Number(inv.quantity);
    const cost = Number(inv.avg_cost) * qty;
    const value = inv.current_price ? Number(inv.current_price) * qty : cost;
    totalCost += cost;
    totalValue += value;
    allocByType[inv.type] = (allocByType[inv.type] ?? 0) + value;
  }
  const pl = totalValue - totalCost;
  const plPercent = totalCost > 0 ? (pl / totalCost) * 100 : 0;

  // Sort allocation by value
  const allocations = Object.entries(allocByType)
    .map(([type, value]) => ({ type: type as InvestmentType, value, pct: totalValue > 0 ? (value / totalValue) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between">
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
          <Button asChild size="sm">
            <Link href="/investments/new">
              <Plus className="mr-1 h-4 w-4" />
              {t('addInvestment')}
            </Link>
          </Button>
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      {investments.length > 0 && (
        <>
          {/* Portfolio summary */}
          <Card className="bg-gradient-to-br from-[#0A0F1F] to-[#1E293B] text-white">
            <CardContent className="p-5">
              <p className="text-sm opacity-80">{t('totalValue')}</p>
              <p className="mt-1 text-3xl font-bold">{formatTHB(totalValue)}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="opacity-70">{t('totalCost')}</p>
                  <p className="mt-0.5 font-semibold">{formatTHB(totalCost)}</p>
                </div>
                <div>
                  <p className="opacity-70">{t('totalPL')}</p>
                  <p
                    className={`mt-0.5 flex items-center gap-1 font-semibold ${pl >= 0 ? 'text-[#10B981]' : 'text-[#FCA5A5]'}`}
                  >
                    {pl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {pl >= 0 ? '+' : ''}
                    {formatTHB(pl)} ({plPercent.toFixed(1)}%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Asset allocation */}
          {allocations.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h2 className="mb-3 text-sm font-semibold">{t('allocation')}</h2>
                <div className="space-y-2">
                  {allocations.map((a) => {
                    const cfg = investmentTypeConfig[a.type];
                    return (
                      <div key={a.type} className="flex items-center gap-3">
                        <span className="text-xl">{cfg.icon}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm">
                            <span>{tType(a.type)}</span>
                            <span className="font-medium">
                              {formatTHB(a.value)} ({a.pct.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${a.pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* List */}
      {investments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <TrendingUp className="h-6 w-6" />
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
        <div className="grid gap-2 lg:grid-cols-2 lg:gap-3">
          {investments.map((inv) => {
            const qty = Number(inv.quantity);
            const cost = Number(inv.avg_cost) * qty;
            const value = inv.current_price ? Number(inv.current_price) * qty : cost;
            const invPL = value - cost;
            const invPLPercent = cost > 0 ? (invPL / cost) * 100 : 0;
            const cfg = investmentTypeConfig[inv.type];
            return (
              <Card key={inv.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${cfg.bg}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold">
                      {inv.symbol && <span className="font-mono">{inv.symbol} · </span>}
                      {inv.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {qty} × {formatTHB(Number(inv.avg_cost))}
                      {inv.broker_account && ` · ${inv.broker_account}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatTHB(value)}</p>
                    <p className={`text-xs ${invPL >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {invPL >= 0 ? '+' : ''}
                      {invPLPercent.toFixed(1)}%
                    </p>
                  </div>
                  <form action={deleteInvestment}>
                    <input type="hidden" name="id" value={inv.id} />
                    <button type="submit" className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </CardContent>
              </Card>
            );
          })}
          <Button asChild size="lg" className="fixed bottom-24 right-4 h-14 rounded-full shadow-lg sm:right-[calc(50%-208px)] lg:bottom-8 lg:right-8">
            <Link href="/investments/new">
              <Plus className="h-5 w-5" />
              {t('addInvestment')}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
