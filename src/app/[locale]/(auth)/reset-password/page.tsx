import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export default async function ResetPasswordPage({
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
        <h1 className="text-2xl font-bold">{t('resetPasswordTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('resetPasswordSubtitle')}</p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
