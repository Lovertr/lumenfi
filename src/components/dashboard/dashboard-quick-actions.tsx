'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  Activity, CreditCard, TrendingUp, Target, Wallet, Repeat, PiggyBank, Camera,
  Calculator, Brain, Settings, Check, X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QAItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  countKey?: 'accountsCount' | 'debtsCount' | 'goalsCount';
}

interface Counts {
  accountsCount?: number;
  debtsCount?: number;
  goalsCount?: number;
}

const STORAGE_KEY = 'lumenfi.dashCards';
const ALL_KEYS = [
  'cashflow', 'debts', 'investments', 'goals', 'accounts',
  'recurring', 'budgets', 'scan', 'tax', 'debtCalc', 'loan', 'ai',
] as const;
const DEFAULT_KEYS = ['cashflow', 'debts', 'investments', 'goals', 'accounts'];

export function DashboardQuickActions({ counts }: { counts: Counts }) {
  const tDash = useTranslations('Dashboard');
  const tMore = useTranslations('More');

  const items: Record<string, QAItem> = {
    cashflow: { href: '/cashflow', icon: Activity, label: 'Cash Flow', color: 'text-cyan-600 bg-cyan-50' },
    debts: { href: '/debts', icon: CreditCard, label: tDash('quickActions.debts'), countKey: 'debtsCount', color: 'text-red-600 bg-red-50' },
    investments: { href: '/investments', icon: TrendingUp, label: tDash('quickActions.investments'), color: 'text-green-600 bg-green-50' },
    goals: { href: '/goals', icon: Target, label: tDash('quickActions.goals'), countKey: 'goalsCount', color: 'text-purple-600 bg-purple-50' },
    accounts: { href: '/accounts', icon: Wallet, label: tDash('quickActions.accounts'), countKey: 'accountsCount', color: 'text-blue-600 bg-blue-50' },
    recurring: { href: '/recurring', icon: Repeat, label: tMore('recurring'), color: 'text-blue-600 bg-blue-50' },
    budgets: { href: '/budgets', icon: PiggyBank, label: tMore('budgets'), color: 'text-emerald-600 bg-emerald-50' },
    scan: { href: '/transactions/scan', icon: Camera, label: tMore('scan'), color: 'text-pink-600 bg-pink-50' },
    tax: { href: '/tools/tax', icon: Calculator, label: tMore('tax'), color: 'text-amber-600 bg-amber-50' },
    debtCalc: { href: '/tools/debt', icon: CreditCard, label: tMore('debtCalc'), color: 'text-rose-600 bg-rose-50' },
    loan: { href: '/tools/loan', icon: Calculator, label: tMore('loan'), color: 'text-indigo-600 bg-indigo-50' },
    ai: { href: '/ai', icon: Brain, label: tMore('ai'), color: 'text-purple-600 bg-purple-50' },
  };

  const [enabled, setEnabled] = useState<string[]>(DEFAULT_KEYS);
  const [editing, setEditing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEnabled(parsed.filter((k: string) => ALL_KEYS.includes(k as any)));
        }
      }
    } catch {}
    setMounted(true);
  }, []);

  function toggleKey(k: string) {
    const next = enabled.includes(k) ? enabled.filter((x) => x !== k) : [...enabled, k];
    setEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }

  function reset() {
    setEnabled(DEFAULT_KEYS);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_KEYS));
    }
  }

  function renderCard(k: string) {
    const it = items[k];
    if (!it) return null;
    const Icon = it.icon;
    const count = it.countKey ? counts[it.countKey] : undefined;
    return (
      <Link key={k} href={it.href as any}>
        <Card className="transition-all hover:border-primary/40 hover:shadow-sm">
          <CardContent className="flex flex-col items-center justify-center p-3 lg:p-4">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', it.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-2 text-xs font-medium text-center lg:text-sm">{it.label}</p>
            {count != null && count > 0 && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">{count}</p>
            )}
          </CardContent>
        </Card>
      </Link>
    );
  }

  if (!mounted) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {DEFAULT_KEYS.map(renderCard)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end px-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setEditing((s) => !s)}
          className="h-7 px-2 text-xs"
        >
          {editing ? <Check className="mr-1 h-3 w-3" /> : <Settings className="mr-1 h-3 w-3" />}
          {editing ? 'เสร็จ' : 'จัดการ์ด'}
        </Button>
      </div>

      {editing && (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">เลือกการ์ดที่ต้องการแสดงบนหน้าหลัก</p>
              <button
                type="button"
                onClick={reset}
                className="text-[11px] text-primary hover:underline"
              >
                ค่าเริ่มต้น
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALL_KEYS.map((k) => {
                const it = items[k];
                if (!it) return null;
                const active = enabled.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleKey(k)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                      active
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                    )}
                  >
                    {active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {it.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              เลือกได้ {enabled.length} ตัว — บันทึกในเครื่องของคุณเอง
            </p>
          </CardContent>
        </Card>
      )}

      {enabled.length > 0 && (
        <div className={cn(
          'grid gap-3',
          enabled.length <= 2 ? 'grid-cols-2'
          : enabled.length <= 3 ? 'grid-cols-3'
          : enabled.length <= 4 ? 'grid-cols-2 lg:grid-cols-4'
          : 'grid-cols-2 lg:grid-cols-5'
        )}>
          {enabled.map(renderCard)}
        </div>
      )}
    </div>
  );
}
