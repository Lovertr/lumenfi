import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NewAccountForm } from '@/components/accounts/new-account-form';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NewAccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Accounts');

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/accounts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">{t('addAccountTitle')}</h1>
          <p className="text-xs text-muted-foreground">{t('addAccountSubtitle')}</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <NewAccountForm />
        </CardContent>
      </Card>
    </div>
  );
}
