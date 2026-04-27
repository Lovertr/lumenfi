'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/app/[locale]/(auth)/actions';
import { cn } from '@/lib/utils';

export function LogoutButton({ className, variant = 'ghost' }: { className?: string; variant?: 'ghost' | 'outline' }) {
  const t = useTranslations('Auth');
  const [pending, startTransition] = useTransition();

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
