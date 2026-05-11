import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { SignupForm } from '@/components/auth/signup-form';

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Auth');
  const sp = searchParams ? await searchParams : {};
  const invite = typeof sp.invite === 'string' ? sp.invite : undefined;

  return (
    <Card className="border-border/60 shadow-lg">
      <CardContent className="p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t('signupTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('signupSubtitle')}</p>
          {invite ? (
            <p className="mt-3 inline-flex rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              🔗 สมัครผ่านลิงก์เชิญจากตัวแทน · รหัส {invite}
            </p>
          ) : null}
        </div>
        <SignupForm inviteCode={invite} />
      </CardContent>
    </Card>
  );
}
