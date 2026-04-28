import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NewGoalForm } from '@/components/goals/new-goal-form';

export default async function NewGoalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Goals');

  return (
    <div className="space-y-4 p-4 pt-6">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/goals">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">{t('addTitle')}</h1>
          <p className="text-xs text-muted-foreground">{t('addSubtitle')}</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <NewGoalForm />
        </CardContent>
      </Card>
    </div>
  );
}
