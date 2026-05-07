import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { RecurringForm } from '@/components/investments/recurring-form';

export const dynamic = 'force-dynamic';

export default async function NewRecurringInvestmentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data } = await supabase
    .from('investments')
    .select('id, name, symbol, type')
    .eq('archived', false)
    .order('name');

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/investments/recurring">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">ตั้งค่า DCA อัตโนมัติ</h1>
          <p className="text-xs text-muted-foreground">บันทึกการลงทุนรายเดือนแบบอัตโนมัติ</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <RecurringForm investments={(data ?? []) as any} />
        </CardContent>
      </Card>
    </div>
  );
}
