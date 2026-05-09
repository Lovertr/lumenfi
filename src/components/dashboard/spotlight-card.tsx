'use client';

import { useTransition } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { ChevronRight, X, Lightbulb } from 'lucide-react';
import { dismissSpotlightAction } from '@/app/[locale]/(app)/dashboard/spotlight-actions';

interface Props {
  id: string;
  icon: string;
  title: string;
  description: string;
  url: string;
  cta: string;
}

export function SpotlightCard({ id, icon, title, description, url, cta }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      await dismissSpotlightAction(id);
      router.refresh();
    });
  };

  return (
    <Link href={url} className="block">
      <div className="group relative overflow-hidden rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 transition-all hover:border-amber-300 hover:shadow-md dark:from-amber-950/30 dark:to-orange-950/30">
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-amber-300/20 blur-2xl" />
        <button
          type="button"
          onClick={onDismiss}
          disabled={pending}
          aria-label="ไม่สนใจ"
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-amber-200/40 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="relative flex items-start gap-3 pr-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-2xl">
            {icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="h-3 w-3 text-amber-600" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                แนะนำสำหรับคุณ
              </span>
            </div>
            <p className="mt-0.5 text-sm font-bold">{title}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              {cta}
              <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
