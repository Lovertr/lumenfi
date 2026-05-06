import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { PWAInstaller } from '@/components/layout/pwa-installer';
import { ThemeScript } from '@/components/layout/theme-toggle';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Lumenfi - Light up your finances',
  description: 'Personal finance app with AI Advisor',
  manifest: '/manifest.json',
  applicationName: 'Lumenfi',
  icons: {
    icon: [
      { url: '/icons/favicon-32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16.png?v=2', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-192.png?v=2', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png?v=2', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Lumenfi',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeScript />
        <NextIntlClientProvider messages={messages}>
          {children}
          <PWAInstaller />
        </NextIntlClientProvider>
      </body>
   