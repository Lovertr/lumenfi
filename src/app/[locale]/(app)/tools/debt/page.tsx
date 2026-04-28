import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DebtCalculator } from '@/components/tools/debt-calculator';
import { createClient } from '@/lib/supabase/server';

interface Debt {
  id: string;
  name: string;
  current_balance: number;
  interest_rate: number;
  monthly_payment: number | null;
}

interface ActivePlan {
  id: string;
  strategy: 'avalanche' | 'snowball';
  extra_per_month: number;
  total_months: number | null;
  total_interest: number | null;
  payoff_order: { debt_id?: string; name: string; month: number }[] | null;
  created_at: string;
}

async function getRealDebts(): Promise<Debt[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('debts')
    .select('id, name, current_balance, interest_rate, monthly_payment')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  return ((data ?? []) as any[]).map((d) => ({
    id: d.id,
    name: d.name,
    current_balance: Number(d.current_balance),
    interest_rate: Number(d.interest_rate),
    monthly_payment: d.monthly_payment ? Number(d.monthly_payment) : null,
  }));
}

async function getActivePlan(): Promise<ActivePlan | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('debt_plans')
    .select('id, strategy, extra_per_month, total_months, total_interest, payoff_order, created_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  return data as any;
}

export default async function DebtCalcPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('DebtCalc');

  const [realDebts, activePlan] = await Promise.all([getRealDebts(), getActivePlan()]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/more">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <CreditCard className="h-5 w-5 text-primary" />
            {t('title')}
          </h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
      </header>

      <DebtCalculator initialDebts={realDebts} activePlan={activePlan} />
    </div>
  );
}
