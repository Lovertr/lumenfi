'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function YearPicker({ years, current }: { years: number[]; current: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const onChange = (year: number) => {
    const params = new URLSearchParams(sp.toString());
    params.set('year', String(year));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {years.map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => onChange(y)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            current === y ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted/40'
          }`}
        >
          {y + 543}
        </button>
      ))}
    </div>
  );
}
