'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const LS_KEY = 'lumenfi:cycle-mode';

/** Toggle between "pay cycle" view and "calendar month" view.
 * Persists preference in localStorage + URL ?cycle=calendar / ?cycle=pay
 * Only renders when user has set pay_cycle_day (i.e. cycle.isPayCycle was
 * the original default). If hasPayCycleDay is false, nothing to toggle. */
export function CycleToggle({
  hasPayCycleDay,
  currentMode,
}: {
  hasPayCycleDay: boolean;
  currentMode: 'pay' | 'calendar';
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  // Sync localStorage choice into URL on first mount if URL doesn't have it.
  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    const urlMode = searchParams.get('cycle');
    if (urlMode) return; // URL wins
    const saved = window.localStorage.getItem(LS_KEY) as 'pay' | 'calendar' | null;
    if (saved && saved !== currentMode) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('cycle', saved);
      router.replace(`?${params.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasPayCycleDay) return null;

  function select(mode: 'pay' | 'calendar') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LS_KEY, mode);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('cycle', mode);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border bg-muted/40 p-0.5 text-[11px]">
      <button
        type="button"
        onClick={() => select('pay')}
        className={cn(
          'rounded-full px-3 py-1 font-medium transition-colors',
          currentMode === 'pay'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        งวด
      </button>
      <button
        type="button"
        onClick={() => select('calendar')}
        className={cn(
          'rounded-full px-3 py-1 font-medium transition-colors',
          currentMode === 'calendar'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        ปฏิทิน
      </button>
    </div>
  );
}
