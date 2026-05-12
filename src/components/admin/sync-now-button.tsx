'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  syncCompanyNow,
  type SyncNowResult,
} from '@/app/[locale]/(app)/admin/products/actions';

/**
 * Sync now button that shows a spinner + 'กำลัง sync...' while the action
 * is running, and a small toast banner with the result.
 *
 * Why client-side: server-action redirect was hijacking the URL when the
 * admin clicked another company in the middle of a sync. Now the action
 * returns data, and we only update searchParams locally if the user is
 * still viewing the same company.
 */
export function SyncNowButton({
  companyId,
  companyCode,
}: {
  companyId: string;
  companyCode: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [last, setLast] = useState<SyncNowResult | null>(null);

  function onClick() {
    setLast(null);
    startTransition(async () => {
      const result = await syncCompanyNow(companyId);
      setLast(result);

      // Only update URL if the admin is still viewing the same company.
      // If they navigated elsewhere mid-sync, leave their URL alone.
      const currentCode = sp.get('c') ?? '';
      if (currentCode === companyCode) {
        const params = new URLSearchParams(sp.toString());
        params.set('synced', result.ok ? 'success' : 'error');
        params.set('msg', result.message);
        router.replace(`?${params.toString()}`, { scroll: false });
      } else {
        // Different company — just refresh server data silently so the
        // sidebar's freshness indicators update
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={onClick} disabled={pending} size="sm">
        {pending ? (
          <>
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            กำลัง sync...
          </>
        ) : (
          <>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Sync now
          </>
        )}
      </Button>

      {/* Tiny inline status when sync completes — only relevant when no URL change happened */}
      {last && !pending && (
        <p
          className={`flex items-center gap-1 text-[10px] ${
            last.ok ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          {last.ok ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {last.ok ? `เสร็จ · ${last.message}` : `ล้มเหลว · ${last.message}`}
        </p>
      )}
    </div>
  );
}
