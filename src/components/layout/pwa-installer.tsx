'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.warn('SW registration failed:', err));
    }

    // Check if already installed (running as PWA)
    if (typeof window !== 'undefined') {
      const standalone =
        window.matchMedia?.('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Don't show immediately if user dismissed before
      const dismissed = typeof localStorage !== 'undefined'
        ? localStorage.getItem('lumenfi-pwa-dismissed')
        : null;
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isStandalone || !showPrompt || !deferredPrompt) return null;

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }

  function dismiss() {
    setShowPrompt(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lumenfi-pwa-dismissed', String(Date.now()));
    }
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl border bg-background p-4 shadow-lg lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">ติดตั้ง Lumenfi</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            เปิดได้เหมือนแอพ ไม่ต้องเปิดเบราว์เซอร์
          </p>
          <Button onClick={install} size="sm" className="mt-3 w-full">
            ติดตั้งเลย
          </Button>
        </div>
      </div>
    </div>
  );
}
