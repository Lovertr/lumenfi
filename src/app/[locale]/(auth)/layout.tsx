import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { LogoMark, Wordmark } from '@/components/brand/logo-mark';
import { LanguageSwitcher } from '@/components/layout/language-switcher';

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 pt-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={32} />
          <Wordmark className="text-lg" />
        </Link>
        <LanguageSwitcher />
      </header>

      {/* Centered card */}
      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
