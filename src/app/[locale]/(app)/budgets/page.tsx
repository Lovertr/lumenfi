import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Wallet, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatTHB } from '@/lib/utils';
import { BudgetRow } from '@/components/budgets/budget-row';
import { getCurrentCycle, type CycleRange } from '@/lib/pay-cycle';

export const dynamic = 'force-dynamic';

interface Budget { id: string; category_id: string; amount: number; }
interface Category { id: string; name: string; icon: string; color: string; type: 'income' | 'expense' | 'both'; }

async function getBudgetsAndSpending() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { budgets: [] as Budget[], categories: [] as Category[], spendingByCat: {} as Record<string, number>, cycle: getCurrentCycle(null) };

  // Fetch pay_cycle_day to honor user's payday — fallback to calendar month
  const { data: prof } = await supabase
    .from('profiles')
    .select('pay_cycle_day')
    .eq('id', user.id)
    .maybeSingle();
  const cycle = getCurrentCycle((prof as any)?.pay_cycle_day ?? null);

  const [bdg, cats, txs] = await Promise.all([
    supabase.from('budgets').select('id, category_id, amount').eq('user_id', user.id),
    supabase.from('categories').select('id, name, icon, color, type').eq('archived', false).order('name'),
    supabase.from('transactions')
      .select('category_id, amount, type, date')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', cycle.startDate)
      .lte('date', cycle.endDate),
  ]);

  const spendingByCat: Record<string, number> = {};
  (txs.data ?? []).forEach((t: any) => {
    if (!t.category_id) return;
    spendingByCat[t.category_id] = (spendingByCat[t.category_id] ?? 0) + Number(t.amount);
  });

  return {
    budgets: (bdg.data ?? []) as Budget[],
    categories: (cats.data ?? []) as Category[],
    spendingByCat,
    cycle,
  };
}

export default async function BudgetsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Budgets');
  const tType = await getTranslations('Categories');

  const { budgets, categories, spendingByCat, cycle } = await getBudgetsAndSpending();
  const expenseCats = categories.filter((c) => c.type === 'expense' || c.type === 'both');

  const budgetMap = new Map(budgets.map((b) => [b.category_id, b]));
  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + (spendingByCat[b.category_id] ?? 0), 0);
  const overBudget = budgets.filter(
    (b) => (spendingByCat[b.category_id] ?? 0) > Number(b.amount)
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/more">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <Wallet className="h-5 w-5 text-primary" />
              {t('title')}
            </h1>
            <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium">
                📊 {cycle.label}
              </span>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {cycle.rangeLabel}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">{t('totalBudget')}</p>
            <p className="mt-0.5 text-base font-bold">{formatTHB(totalBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">{t('totalSpent')}</p>
            <p className={`mt-0.5 text-base font-bold ${totalSpent > totalBudget ? 'text-red-600' : 'text-foreground'}`}>
              {formatTHB(totalSpent)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">{t('remaining')}</p>
            <p className={`mt-0.5 text-base font-bold ${totalBudget - totalSpent < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatTHB(Math.max(0, totalBudget - totalSpent))}
            </p>
          </CardContent>
        </Card>
      </div>

      {overBudget.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="flex items-start gap-2 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div className="flex-1 text-xs text-red-800">
              <p className="font-semibold">{t('overBudgetWarning', { count: overBudget.length })}</p>
              <ul className="mt-1 list-disc pl-4">
                {overBudget.map((b) => {
                  const cat = categories.find((c) => c.id === b.category_id);
                  return (
                    <li key={b.id}>
                      {cat?.icon} {cat?.name}: {formatTHB(spendingByCat[b.category_id])} / {formatTHB(b.amount)}
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories list with inline budget setter */}
      <div className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('expenseCategories')}
        </p>
        {expenseCats.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {t('noCategories')}
            </CardContent>
          </Card>
        ) : (
          expenseCats.map((cat) => {
            const budget = budgetMap.get(cat.id);
            const spent = spendingByCat[cat.id] ?? 0;
            return (
              <BudgetRow
                key={cat.id}
                category={cat}
                budget={budget?.amount ?? 0}
                spent={spent}
              />
            );
          })
        )}
      </div>

      <p className="rounded-lg border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
        💡 {t('hint')}
      </p>
    </div>
  );
}
