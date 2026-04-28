'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/app/[locale]/(auth)/actions';
import { cn } from '@/lib/utils';

export function LogoutButton({
  className,
  variant = 'ghost',
  showLabel = false,
}: {
  className?: string;
  variant?: 'ghost' | 'outline' | 'destructive';
  showLabel?: boolean;
}) {
  const t = useTranslations('Auth');
  const [pending, startTransition] = useTransition();

  if (showLabel) {
    return (
      <Button
        type="button"
        variant={variant}
        className={cn('w-full', className)}
        disabled={pending}
        onClick={() => startTransition(() => signOut())}
      >
        <LogOut className="h-4 w-4" />
        {t('logout')}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      variant={variant}
      className={cn('h-9 w-9', className)}
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
      aria-label={t('logout')}
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
