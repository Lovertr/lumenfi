import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WatchlistForm } from '@/components/investments/watchlist-form';

export const dynamic = 'force-dynamic';

export default async function NewWatchlistItemPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/investments/watchlist">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">เพิ่ม Watchlist</h1>
          <p className="text-xs text-muted-foreground">เพิ่มหุ้น/กองทุนที่สนใจเข้ารายการ</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <WatchlistForm />
        </CardContent>
      </Card>
    </div>
  );
}
