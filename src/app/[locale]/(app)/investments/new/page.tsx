import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NewInvestmentForm } from '@/components/investments/new-investment-form';

export const dynamic = 'force-dynamic';

export default async function NewInvestmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tax_saving?: string }>;
}) {
  const { locale } = await params;
  const { tax_saving } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('Investments');

  const defaultTaxSaving = tax_saving === '1';

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href={defaultTaxSaving ? "/investments/tax-saving" : "/investments"}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">
            {defaultTaxSaving ? 'เพิ่มกองทุนลดหย่อนภาษี' : t('addTitle')}
          </h1>
          <p className="text-xs text-muted-foreground">
            {defaultTaxSaving ? 'RMF · SSF · PVD · กบข.' : t('addSubtitle')}
          </p>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <NewInvestmentForm defaultTaxSaving={defaultTaxSaving} />
        </CardContent>
      </Card>
    </div>
  );
}
