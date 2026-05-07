import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { DividendForm } from '@/components/investments/dividend-form';

export const dynamic = 'force-dynamic';

export default async function NewDividendPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: inv } = await supabase
    .from('investments')
    .select('id, name, symbol, quantity')
    .eq('id', id)
    .maybeSingle();

  if (!inv) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href={`/investments/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">บันทึกเงินปันผล</h1>
          <p className="text-xs text-muted-foreground">
            {inv.symbol ?? inv.name} · {Number(inv.quantity).toLocaleString()} หน่วย
          </p>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <DividendForm investmentId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
