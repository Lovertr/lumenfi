import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { createClient } from '@/lib/supabase/server';
import { getCategories } from '@/lib/categories';
import { deleteTransaction } from '../../actions';

export const dynamic = 'force-dynamic';

async function getTransaction(id: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('transactions')
    .select('id, type, amount, account_id, to_account_id, category_id, goal_id, date, note')
    .eq('id', id)
    .maybeSingle();
  return data;
}

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

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Transactions');

  const [tx, accounts, categories, goals] = await Promise.all([
    getTransaction(id),
    getAccounts(),
    getCategories(),
    getGoals(),
  ]);
  if (!tx) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/transactions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">{t('editTitle')}</h1>
          <p className="text-xs text-muted-foreground">{tx.note ?? '—'}</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <TransactionForm
            mode="edit"
            accounts={accounts as any}
            categories={categories as any}
            goals={goals as any}
            defaults={{
              id: tx.id,
              type: tx.type,
              amount: Number(tx.amount),
              account_id: tx.account_id,
              to_account_id: tx.to_account_id,
              category_id: tx.category_id,
              goal_id: tx.goal_id,
              date: tx.date.slice(0, 10),
              note: tx.note,
            }}
          />
        </CardContent>
      </Card>

      <form action={deleteTransaction}>
        <input type="hidden" name="id" value={tx.id} />
        <Button
          type="submit"
          variant="ghost"
          size="lg"
          className="w-full text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t('form.delete')}
        </Button>
      </form>
    </div>
  );
}
