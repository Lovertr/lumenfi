'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { contributeToGoal } from '@/app/[locale]/(app)/transactions/actions';

export function QuickContribute({ goalId, isLinked }: { goalId: string; isLinked: boolean }) {
  const t = useTranslations('Goals');
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [pending, setPending] = useState(false);

  if (isLinked) return null; // linked goals auto-sync, no manual contribution

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="h-7 px-2 text-xs"
      >
        <Plus className="mr-1 h-3 w-3" />
        {t('contribute')}
      </Button>
    );
  }

  return (
    <form
      onClick={(e) => e.stopPropagation()}
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!amount.trim()) return;
        setPending(true);
        const fd = new FormData();
        fd.append('goal_id', goalId);
        fd.append('amount', amount);
        await contributeToGoal(fd);
        setPending(false);
        setOpen(false);
        setAmount('');
      }}
      className="flex items-center gap-1"
    >
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
          ฿
        </span>
        <Input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            e.stopPropagation();
            setAmount(e.target.value);
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          autoFocus
          placeholder="0"
          className="h-8 pl-6 text-sm"
        />
      </div>
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        disabled={pending || !amount.trim()}
        className="h-8 w-8 text-green-600 hover:bg-green-50"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
          setAmount('');
        }}
        className="h-8 w-8"
      >
        <X className="h-4 w-4" />
      </Button>
    </form>
  );
}
