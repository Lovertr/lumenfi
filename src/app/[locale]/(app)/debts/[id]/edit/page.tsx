import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DebtForm } from '@/components/debts/debt-form';
import { DebtPaymentHistory } from '@/components/debts/debt-payment-history';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function getDebt(id: string) {
  const supabase = createClient();
  const { data } = await supabase.from('debts').select('*').eq('id', id).maybeSingle();
  return data;
}

export default async function EditDebtPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Debts');

  const debt = await getDebt(id);
  if (!debt) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/debts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">{t('editTitle')}</h1>
          <p className="text-xs text-muted-foreground">{debt.name}</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <DebtForm
            mode="edit"
            defaults={{
              id: debt.id,
              name: debt.name,
              type: debt.type,
              lender: debt.lender,
              current_balance: Number(debt.current_balance),
              original_principal: Number(debt.original_principal),
              interest_rate: Number(debt.interest_rate),
              total_term: debt.total_term,
              remaining_term: debt.remaining_term,
              monthly_payment: debt.monthly_payment ? Number(debt.monthly_payment) : 0,
              start_date: debt.start_date,
              rate_type: debt.rate_type,
              lock_in_months: debt.lock_in_months,
              promo_end_date: debt.promo_end_date,
              post_promo_rate: debt.post_promo_rate,
              credit_limit: debt.credit_limit,
              statement_day: debt.statement_day,
              due_day: debt.due_day,
            }}
          />
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          ประวัติการชำระ
        </h2>
        <DebtPaymentHistory debtId={debt.id} />
      </section>
    </div>
  );
}
