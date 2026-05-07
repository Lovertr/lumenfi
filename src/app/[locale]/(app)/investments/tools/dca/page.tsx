import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DCACalculator } from '@/components/investments/dca-calculator';

export const dynamic = 'force-dynamic';

export default async function DCACalculatorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/investments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">DCA Calculator</h1>
          <p className="text-xs text-muted-foreground">วางแผนการลงทุนรายเดือน + ดูผลลัพธ์ระยะยาว</p>
        </div>
      </header>

      <DCACalculator />
    </div>
  );
}
