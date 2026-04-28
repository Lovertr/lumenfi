import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ReceiptScanner } from '@/components/transactions/receipt-scanner';
import { createClient } from '@/lib/supabase/server';
import { getCategories } from '@/lib/categories';

async function getAccounts() {
  const supabase = createClient();
  const { data } = await supabase
    .from('accounts')
    .select('id, name, type, color')
    .eq('archived', false)
    .order('name');
  return data ?? [];
}

export default async function ScanPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Scan');

  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/transactions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Camera className="h-5 w-5 text-primary" />
            {t('title')}
          </h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <ReceiptScanner accounts={accounts as any} categories={categories as any} />
        </CardContent>
      </Card>
    </div>
  );
}
