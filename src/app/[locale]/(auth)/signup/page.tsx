import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { SignupForm } from '@/components/auth/signup-form';

export default async function SignupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Auth');

  return (
    <Card className="border-border/60 shadow-lg">
      <CardContent className="p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t('signupTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('signupSubtitle')}</p>
        </div>
        <SignupForm />
      </CardContent>
    </Card>
  );
}
