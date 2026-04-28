import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileBarChart } from 'lucide-react';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { LogoutButton } from '@/components/auth/logout-button';

export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="space-y-4 p-4 pt-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/more">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">{locale === 'th' ? 'รายงาน' : 'Reports'}</h1>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
            <FileBarChart className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold">
            {locale === 'th' ? 'รายงาน — Phase 10' : 'Reports — Phase 10'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            {locale === 'th'
              ? 'สรุปรายเดือน/ปี + Export PDF + เปรียบเทียบช่วงเวลา — รอเซสชันถัดไป'
              : 'Monthly/yearly summary + PDF export + period comparison — coming next'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
