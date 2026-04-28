import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EditAccountForm } from '@/components/accounts/edit-account-form';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Accounts');

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, type, initial_balance, color, credit_limit, include_in_net_worth')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!account) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/accounts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">{locale === 'th' ? 'แก้ไขบัญชี' : 'Edit Account'}</h1>
          <p className="text-xs text-muted-foreground">{account.name}</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <EditAccountForm account={account as any} />
        </CardContent>
      </Card>
    </div>
  );
}
