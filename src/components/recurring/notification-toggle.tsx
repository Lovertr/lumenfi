'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, BellOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Status = 'unknown' | 'unsupported' | 'denied' | 'subscribed' | 'available';

export function NotificationToggle() {
  const t = useTranslations('Recurring');
  const [status, setStatus] = useState<Status>('unknown');
  const [busy, setBusy] = useState(false);
  const [endpoint, setEndpoint] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    const perm = Notification.permission;
    if (perm === 'denied') {
      setStatus('denied');
      return;
    }

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setStatus('subscribed');
        setEndpoint(sub.endpoint);
      } else {
        setStatus('available');
      }
    }).catch(() => setStatus('available'));
  }, []);

  async function subscribe() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setStatus(perm === 'denied' ? 'denied' : 'available');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      // VAPID key — using a placeholder env var. Real push delivery requires VAPID setup.
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        // Without VAPID, we can still register for local notifications
        // (browser-fired only when app is running), but real push delivery won't work.
        alert(t('vapidMissing'));
        new Notification('Lumenfi', { body: t('localTestNotif'), icon: '/icons/icon-192.png' });
        setStatus('subscribed');
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) {
        await sub.unsubscribe();
        throw new Error('subscribe failed');
      }
      setStatus('subscribed');
      setEndpoint(sub.endpoint);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
          method: 'DELETE',
        });
        await sub.unsubscribe();
      }
      setStatus('available');
      setEndpoint(null);
    } finally {
      setBusy(false);
    }
  }

  if (status === 'unsupported') {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <BellOff className="h-3.5 w-3.5" />
        {t('notifUnsupported')}
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <BellOff className="h-3.5 w-3.5" />
        {t('notifDenied')}
      </div>
    );
  }

  if (status === 'subscribed') {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-xs text-green-800">
        <span className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5" />
          {t('notifEnabled')}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={unsubscribe}
          disabled={busy}
          className="h-6 text-xs"
        >
          {t('notifDisable')}
        </Button>
      </div>
    );
  }

  return (
    <Button type="button" onClick={subscribe} disabled={busy} variant="outline" size="sm" className="w-full">
      <Bell className="mr-1.5 h-4 w-4 text-amber-600" />
      {busy ? '...' : t('notifEnable')}
    </Button>
  );
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
