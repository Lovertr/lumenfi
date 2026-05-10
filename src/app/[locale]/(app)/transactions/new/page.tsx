import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { createClient } from '@/lib/supabase/server';
import { getCategories } from '@/lib/categories';

export const dynamic = 'force-dynamic';

async function getAccounts() {
  const supabase = createClient();
  const { data } = await supabase
    .from('accounts')
    .select('id, name, type, color, account_number')
    .eq('archived', false)
    .order('name');
  return data ?? [];
}

async function getGoals() {
  const supabase = createClient();
  const { data } = await supabase
    .from('goals')
    .select('id, name, icon')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  return data ?? [];
}

async function getDebts() {
  const supabase = createClient();
  const { data } = await supabase
    .from('debts')
    .select('id, name, current_balance, interest_rate, monthly_payment, type')
    .eq('status', 'active')
    .gt('current_balance', 0)
    .order('current_balance', { ascending: false });
  return data ?? [];
}

export default async function NewTransactionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Transactions');

  const [accounts, categories, goals, debts] = await Promise.all([
    getAccounts(),
    getCategories(),
    getGoals(),
    getDebts(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/transactions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">{t('addTitle')}</h1>
          <p className="text-xs text-muted-foreground">{t('addSubtitle')}</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <TransactionForm
            accounts={accounts as any}
            categories={categories as any}
            goals={goals as any}
            debts={debts as any}
          />
        </CardContent>
      </Card>
    </div>
  );
}
