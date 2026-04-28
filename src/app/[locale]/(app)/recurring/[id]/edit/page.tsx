import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { RecurringEditForm } from '@/components/recurring/recurring-edit-form';
import { getCategories } from '@/lib/categories';

async function getRecurring(id: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data;
}

async function getAccounts() {
  const supabase = createClient();
  const { data } = await supabase
    .from('accounts')
    .select('id, name, type, color')
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

export default async function EditRecurringPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Recurring');

  const [rec, accounts, categories, goals] = await Promise.all([
    getRecurring(id),
    getAccounts(),
    getCategories(),
    getGoals(),
  ]);
  if (!rec) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/recurring">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">{t('editTitle')}</h1>
          <p className="text-xs text-muted-foreground">{rec.note ?? '—'}</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <RecurringEditForm
            defaults={rec as any}
            accounts={accounts as any}
            categories={categories as any}
            goals={goals as any}
          />
        </CardContent>
      </Card>
    </div>
  );
}
