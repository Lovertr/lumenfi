import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { Link } from '@/i18n/routing';

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Auth');

  return (
    <div className="mx-auto max-w-md space-y-6 p-6 pt-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t('forgotPasswordTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('forgotPasswordSubtitle')}</p>
      </div>
      <ForgotPasswordForm />
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          ← {t('backToLogin')}
        </Link>
      </p>
    </div>
  );
}
