import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Lumenfi — Light up your finances',
  description: 'แอปบริหารการเงินส่วนตัวครบวงจร — รายรับ-รายจ่าย หนี้สิน การลงทุน เป้าหมาย พร้อม AI Advisor ที่ใช้ API key ของคุณเอง',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/logo-final.svg',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lumenfi',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0F1F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

// Force dynamic rendering to bypass any static file serving issues on Vercel.
// Once /th confirmed working, can switch back to static via generateStaticParams.
export const dynamic = 'force-dynamic';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
