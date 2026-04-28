'use client';

import { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations, useLocale } from 'next-intl';

interface Upcoming {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  nextDate: string;
  daysUntil: number;
  note: string | null;
  category?: { name: string; icon: string } | null;
  account?: { name: string } | null;
}

export function UpcomingBanner({ items }: { items: Upcoming[] }) {
  const t = useTranslations('Recurring');
  const locale = useLocale();

  // Fire local browser notification once per page load if notification permission is granted
  useEffect(() => {
    if (!items.length) return;
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const lastShown = sessionStorage.getItem('lumenfi.notifShown');
    const today = new Date().toISOString().slice(0, 10);
    if (lastShown === today) return;

    items.slice(0, 3).forEach((it) => {
      const label = it.category?.name ?? (it.type === 'income' ? 'รายรับ' : it.type === 'expense' ? 'รายจ่าย' : 'โอน');
      const when = it.daysUntil === 0
        ? (locale === 'th' ? 'วันนี้' : 'today')
        : (locale === 'th' ? `อีก ${it.daysUntil} วัน` : `in ${it.daysUntil} day(s)`);
      try {
        new Notification('Lumenfi · ' + (locale === 'th' ? 'รายการใกล้ถึงกำหนด' : 'Upcoming recurring'), {
          body: `${label} ฿${Number(it.amount).toLocaleString()} · ${when}`,
          icon: '/icons/icon-192.png',
          tag: `lumenfi-recurring-${it.id}`,
        });
      } catch {
        // ignore
      }
    });
    sessionStorage.setItem('lumenfi.notifShown', today);
  }, [items, locale]);

  if (items.length === 0) return null;

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-semibold text-amber-900">
              {t('upcomingTitle', { count: items.length })}
            </p>
            <ul className="space-y-1 text-xs text-amber-800">
              {items.slice(0, 5).map((it) => {
                const label = it.category?.name ?? (it.type === 'income' ? t('income') : it.type === 'expense' ? t('expense') : 'Transfer');
                const dt = new Date(it.nextDate);
                const dStr = dt.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
                  day: 'numeric',
                  month: 'short',
                });
                const when = it.daysUntil === 0
                  ? t('today')
                  : t('inDays', { days: it.daysUntil });
                return (
                  <li key={it.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {it.category?.icon ?? '🔄'} {label} — ฿{Number(it.amount).toLocaleString()}
                    </span>
                    <span className="shrink-0 font-medium">
                      {dStr} ({when})
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
