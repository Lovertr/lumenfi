'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { Home, ListChecks, Plus, Brain, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const t = useTranslations('Nav');
  const pathname = usePathname();

  const items = [
    { href: '/dashboard', icon: Home, label: t('home') },
    { href: '/transactions', icon: ListChecks, label: t('transactions') },
    { href: '/transactions/new', icon: Plus, label: t('add'), isPrimary: true },
    { href: '/ai', icon: Brain, label: t('ai') },
    { href: '/more', icon: MoreHorizontal, label: t('more') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-bottom lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
                aria-label={item.label}
              >
                <Icon className="h-6 w-6" />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
