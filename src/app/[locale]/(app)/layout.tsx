import { setRequestLocale } from 'next-intl/server';
import { BottomNav } from '@/components/layout/bottom-nav';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-20">
      <main>{children}</main>
      <BottomNav />
    </div>
  );
}
