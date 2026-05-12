import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';
import { ResendConfirmation } from '@/components/auth/resend-confirmation';

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Auth');

  return (
    <div className="space-y-3">
      <Card className="border-border/60 shadow-lg">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight">{t('loginTitle')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('loginSubtitle')}</p>
          </div>
          <LoginForm />
        </CardContent>
      </Card>

      {/* Help block for users who never got the confirmation email */}
      <details className="rounded-lg border bg-background p-3 text-sm">
        <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
          🔎 ไม่ได้รับอีเมลยืนยัน?
        </summary>
        <div className="mt-3">
          <ResendConfirmation />
        </div>
      </details>
    </div>
  );
}
