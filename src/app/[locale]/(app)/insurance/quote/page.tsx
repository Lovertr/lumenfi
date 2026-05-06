import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { QuoteRequestForm } from '@/components/insurance/quote-request-form';

export const dynamic = 'force-dynamic';

export default async function QuoteRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; gap?: string }>;
}) {
  const { locale } = await params;
  const { type, gap } = await searchParams;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const fullName = user?.user_metadata?.full_name ?? '';
  const userEmail = user?.email ?? '';

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/insurance">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">ขอใบเสนอประกัน</h1>
          <p className="text-xs text-muted-foreground">ตัวแทนติดต่อกลับใน 1 วันทำการ</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <QuoteRequestForm
            defaultType={type ?? 'review'}
            defaultGap={gap ? parseFloat(gap) : null}
            defaultName={fullName}
            defaultEmail={userEmail}
          />
        </CardContent>
      </Card>
    </div>
  );
}
