'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Plus, ChevronDown } from 'lucide-react';
import { formatTHB } from '@/lib/utils';

interface Goal {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  current: number;
  target: number;
  progress: number;
  deadline: string | null;
}

const STORAGE_KEY = 'lumenfi-dashboard-goal-id';

export function GoalProgressCard({ goals }: { goals: Goal[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Restore selected goal from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && goals.find((g) => g.id === saved)) {
      setSelectedId(saved);
    } else if (goals.length > 0) {
      setSelectedId(goals[0].id);
    }
  }, [goals]);

  function handleSelect(id: string) {
    setSelectedId(id);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    setPickerOpen(false);
  }

  // Empty state — no goals at all
  if (goals.length === 0) {
    return (
      <Card>
        <Link href="/goals/new">
          <CardContent className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center lg:p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Target className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold">ตั้งเป้าหมายแรก</p>
            <p className="text-[10px] text-muted-foreground">สร้างกำลังใจในการออม</p>
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          </CardContent>
        </Link>
      </Card>
    );
  }

  const goal = goals.find((g) => g.id === selectedId) ?? goals[0];
  if (!goal) return null;

  const pct = Math.round(goal.progress * 100);
  const remaining = Math.max(0, goal.target - goal.current);
  const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 75 ? 'bg-blue-500' : pct >= 50 ? 'bg-violet-500' : 'bg-amber-500';

  // Days to deadline
  let daysLeft: number | null = null;
  if (goal.deadline) {
    const d = new Date(goal.deadline);
    daysLeft = Math.ceil((d.getTime() - Date.now()) / 86400000);
  }

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 lg:p-5">
        {/* Header with goal picker (if multiple) */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {goal.icon && <span className="text-base">{goal.icon}</span>}
            <p className="truncate text-xs font-medium">{goal.name}</p>
          </div>
          {goals.length > 1 && (
            <button
              type="button"
              onClick={() => setPickerOpen(!pickerOpen)}
              className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted/40"
              aria-label="เลือกเป้าหมาย"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Big percentage */}
        <p className="mt-1 text-2xl font-bold lg:text-3xl">
          {pct}<span className="text-base font-normal text-muted-foreground">%</span>
        </p>

        {/* Progress bar */}
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${barColor} transition-all`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>

        {/* Numbers */}
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{formatTHB(goal.current)}</span>
          <span>{formatTHB(goal.target)}</span>
        </div>

        {/* Footer */}
        <div className="mt-2 flex items-center justify-between text-[10px]">
          {pct >= 100 ? (
            <span className="font-semibold text-emerald-700">🎉 บรรลุแล้ว</span>
          ) : (
            <span className="text-muted-foreground">เหลือ {formatTHB(remaining)}</span>
          )}
          {daysLeft !== null && pct < 100 && (
            <span className={daysLeft < 30 ? 'font-semibold text-amber-700' : 'text-muted-foreground'}>
              {daysLeft > 0 ? `อีก ${daysLeft} วัน` : daysLeft === 0 ? 'วันนี้!' : `เลย ${Math.abs(daysLeft)} วัน`}
            </span>
          )}
        </div>

        {/* Picker dropdown */}
        {pickerOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setPickerOpen(false)}
            />
            <div className="absolute right-3 top-12 z-20 max-h-64 w-48 overflow-y-auto rounded-lg border bg-background p-1 shadow-lg">
              {goals.map((g) => {
                const p = Math.round(g.progress * 100);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleSelect(g.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      g.id === selectedId ? 'bg-primary/10 text-primary' : 'hover:bg-muted/40'
                    }`}
                  >
                    {g.icon && <span>{g.icon}</span>}
                    <span className="flex-1 truncate">{g.name}</span>
                    <span className="text-[10px] text-muted-foreground">{p}%</span>
                  </button>
                );
              })}
              <Link
                href="/goals"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/40"
                onClick={() => setPickerOpen(false)}
              >
                <Plus className="h-3 w-3" />
                ดูทั้งหมด
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
