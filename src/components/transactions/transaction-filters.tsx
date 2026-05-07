'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { TrendingDown, TrendingUp, ArrowLeftRight, X, Calendar } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense' | 'both';
  color: string | null;
}

const RANGE_PRESETS = [
  { value: 'this_month', label: 'เดือนนี้' },
  { value: 'last_month', label: 'เดือนที่แล้ว' },
  { value: 'last_3', label: '3 เดือน' },
  { value: 'last_6', label: '6 เดือน' },
  { value: 'this_year', label: 'ปีนี้' },
  { value: 'all', label: 'ทั้งหมด' },
] as const;

export function TransactionFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const currentCategory = params.get('category');
  const currentType = params.get('type');
  const currentRange = params.get('range') ?? 'this_month';
  const customFrom = params.get('from') ?? '';
  const customTo = params.get('to') ?? '';

  const [showCustom, setShowCustom] = useState(currentRange === 'custom');

  function applyFilter(updates: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearAll() {
    router.push(pathname);
    setShowCustom(false);
  }

  function handleRangeClick(value: string) {
    if (value === 'custom') {
      setShowCustom(true);
      applyFilter({ range: 'custom' });
    } else {
      setShowCustom(false);
      applyFilter({ range: value, from: null, to: null });
    }
  }

  const visibleCats = currentType
    ? categories.filter((c) => c.type === currentType || c.type === 'both')
    : categories;

  const hasFilter = !!(currentCategory || currentType || (currentRange && currentRange !== 'this_month') || customFrom || customTo);

  return (
    <div className="space-y-2">
      {/* Date range pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        {RANGE_PRESETS.map((p) => {
          const active = currentRange === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => handleRangeClick(p.value)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:bg-muted/40'
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => handleRangeClick('custom')}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            currentRange === 'custom'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-background hover:bg-muted/40'
          }`}
        >
          เลือกเอง
        </button>
        {hasFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            <X className="h-3 w-3" />
            ล้าง
          </button>
        )}
      </div>

      {/* Custom date inputs */}
      {showCustom && (
        <div className="flex items-center gap-2 rounded-lg border bg-background p-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => applyFilter({ range: 'custom', from: e.target.value })}
            className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
          />
          <span className="text-xs text-muted-foreground">ถึง</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => applyFilter({ range: 'custom', to: e.target.value })}
            className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
          />
        </div>
      )}

      {/* Type pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <TypePill
          active={currentType === 'expense'}
          onClick={() =>
            applyFilter({ type: currentType === 'expense' ? null : 'expense', category: null })
          }
          icon={TrendingDown}
          label="รายจ่าย"
          color="text-red-600"
        />
        <TypePill
          active={currentType === 'income'}
          onClick={() =>
            applyFilter({ type: currentType === 'income' ? null : 'income', category: null })
          }
          icon={TrendingUp}
          label="รายรับ"
          color="text-green-600"
        />
        <TypePill
          active={currentType === 'transfer'}
          onClick={() =>
            applyFilter({ type: currentType === 'transfer' ? null : 'transfer', category: null })
          }
          icon={ArrowLeftRight}
          label="โอน"
          color="text-blue-600"
        />
      </div>

      {/* Category chips */}
      {visibleCats.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleCats.map((c) => {
            const active = currentCategory === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => applyFilter({ category: active ? null : c.id })}
                className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background hover:bg-muted/40'
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TypePill({
  active,
  onClick,
  icon: Icon,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background hover:bg-muted/40'
      }`}
    >
      <Icon className={`h-3.5 w-3.5 ${active ? '' : color}`} />
      {label}
    </button>
  );
}
