import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { PWAInstaller } from '@/components/layout/pwa-installer';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Lumenfi — Light up your finances',
  description: 'แอปบริหารการเงินส่วนตัวครบวงจร — รายรับ-รายจ่าย หนี้สิน การลงทุน เป้าหมาย พร้อม AI Advisor ที่ใช้ API key ของคุณเอง',
  manifest: '/manifest.json',
  applicationName: 'Lumenfi',
  authors: [{ name: 'Lumenfi' }],
  keywords: ['finance', 'budget', 'การเงิน', 'budget tracker', 'AI advisor'],
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/logo-final.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Lumenfi',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0A0F1F' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0F1F' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export function generateStaticParams() {
  return 