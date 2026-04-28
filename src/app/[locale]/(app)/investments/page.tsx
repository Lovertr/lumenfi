import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { LogoutButton } from '@/components/auth/logout-button';

export default async function InvestmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="space-y-4 p-4 pt-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">{locale === 'th' ? 'การลงทุน' : 'Investments'}</h1>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600">
            <TrendingUp className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold">
            {locale === 'th' ? 'การลงทุน — Phase 8' : 'Investment Tracking — Phase 8'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            {locale === 'th'
              ? 'ติดตามพอร์ตหุ้น กองทุน คริปโต ทอง — กำลังพัฒนา รอเซสชันถัดไป'
              : 'Track stocks, funds, crypto, gold — coming in next session'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
