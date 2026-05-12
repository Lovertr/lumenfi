'use client';

import { useState, useTransition } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteDebtPlan } from '@/app/[locale]/(app)/tools/debt/actions';

/**
 * Trash icon button with inline "ลบจริง / ยก" confirmation.
 * Used on /tools/debt/plans history rows.
 */
export function DeleteDebtPlanButton({
  planId,
  planTitle,
}: {
  planId: string;
  planTitle: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const fd = new FormData();
    fd.set('id', planId);
    startTransition(async () => {
      await deleteDebtPlan(fd);
      setConfirming(false);
    });
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="rounded-md bg-destructive px-2 py-1 text-[10px] font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          aria-label={`ลบจริง ${planTitle}`}
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'ลบจริง'}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(false);
          }}
          className="rounded-md border px-2 py-1 text-[10px] hover:bg-muted"
        >
          ยก
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setConfirming(true);
      }}
      className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
      aria-label={`ลบ ${planTitle}`}
      title="ลบแผนนี้"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
