'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, X, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setBudget } from '@/app/[locale]/(app)/budgets/actions';
import { formatTHB } from '@/lib/utils';

interface Category { id: string; name: string; icon: string; color: string; }

export function BudgetRow({
  category,
  budget,
  spent,
}: {
  category: Category;
  budget: number;
  spent: number;
}) {
  const t = useTranslations('Budgets');
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(budget || ''));
  const [pending, setPending] = useState(false);

  const hasBudget = budget > 0;
  const percent = hasBudget ? Math.min(100, (spent / budget) * 100) : 0;
  const isOver = hasBudget && spent > budget;
  const remaining = Math.max(0, budget - spent);

  async function save() {
    setPending(true);
    const fd = new FormData();
    fd.append('category_id', category.id);
    fd.append('amount', value || '0');
    await setBudget(fd);
    setPending(false);
    setEditing(false);
  }

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl"
            style={{ backgroundColor: `${category.color}1A` }}
          >
            {category.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{category.name}</p>
            {editing ? (
              <div className="mt-1.5 flex items-center gap-1">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    ฿
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    autoFocus
                    placeholder="0"
                    className="h-8 pl-6 text-sm"
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={save}
                  disabled={pending}
                  className="h-8 w-8 text-green-600"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setValue(String(budget || ''));
                  }}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : hasBudget ? (
              <>
                <div className="mt-1 flex items-baseline justify-between text-xs">
                  <span className={isOver ? 'font-semibold text-red-600' : 'text-muted-foreground'}>
                    {formatTHB(spent, { compact: true })} / {formatTHB(budget, { compact: true })}
                  </span>
                  <span className={isOver ? 'text-red-600' : 'text-muted-foreground'}>
                    {Math.round(percent)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: isOver ? '#EF4444' : category.color,
                    }}
                  />
                </div>
                {!isOver && remaining > 0 && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {t('remainingThisMonth')}: {formatTHB(remaining, { compact: true })}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">{t('notSet')}</p>
            )}
          </div>
          {!editing && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setEditing(true)}
              className="h-8 w-8"
              aria-label={t('edit')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
