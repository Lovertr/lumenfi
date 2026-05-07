'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { TrendingDown, TrendingUp, ArrowLeftRight, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense' | 'both';
  color: string | null;
}

export function TransactionFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const currentCategory = params.get('category');
  const currentType = params.get('type');

  function applyFilter(key: string, value: string | null) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearAll() {
    router.push(pathname);
  }

  // Filter category list by selected type
  const visibleCats = currentType
    ? categories.filter((c) => c.type === currentType || c.type === 'both')
    : categories;

  const hasFilter = !!(currentCategory || currentType);

  return (
    <div className="space-y-2">
      {/* Type pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <TypePill
          active={currentType === 'expense'}
          onClick={() =>
            applyFilter('type', currentType === 'expense' ? null : 'expense')
          }
          icon={TrendingDown}
          label="รายจ่าย"
          color="text-red-600"
        />
        <TypePill
          active={currentType === 'income'}
          onClick={() =>
            applyFilter('type', currentType === 'income' ? null : 'income')
          }
          icon={TrendingUp}
          label="รายรับ"
          color="text-green-600"
        />
        <TypePill
          active={currentType === 'transfer'}
          onClick={() =>
            applyFilter('type', currentType === 'transfer' ? null : 'transfer')
          }
          icon={ArrowLeftRight}
          label="โอน"
          color="text-blue-600"
        />
        {hasFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            <X className="h-3 w-3" />
            ล้าง
          </button>
        )}
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
                onClick={() =>
                  applyFilter('category', active ? null : c.id)
                }
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
