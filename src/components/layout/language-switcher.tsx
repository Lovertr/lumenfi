'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useTransition } from 'react';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations('Language');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: 'th' | 'en') => {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <div className={cn('inline-flex items-center gap-1 rounded-full border bg-background p-0.5 text-xs', className)}>
      <Languages className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
      <button
        type="button"
        onClick={() => switchTo('th')}
        className={cn(
          'rounded-full px-2.5 py-1 font-medium transition-colors',
          locale === 'th' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        )}
        disabled={isPending}
        aria-label={t('switch')}
      >
        ไทย
      </button>
      <button
        type="button"
        onClick={() => switchTo('en')}
        className={cn(
          'rounded-full px-2.5 py-1 font-medium transition-colors',
          locale === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        )}
        disabled={isPending}
        aria-label={t('switch')}
      >
        EN
      </button>
    </div>
  );
}
