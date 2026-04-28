'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Trophy, Snowflake, Mountain } from 'lucide-react';
import { formatTHB, cn } from '@/lib/utils';

interface DebtItem {
  id: string;
  name: string;
  balance: number;
  rate: number; // annual %
  minPayment: number;
}

type Strategy = 'avalanche' | 'snowball';

function simulate(
  initial: DebtItem[],
  extraPerMonth: number,
  strategy: Strategy
): { months: number; totalInterest: number; payoffOrder: { name: string; month: number }[] } {
  const debts = initial.map((d) => ({ ...d, balance: d.balance }));
  let months = 0;
  let totalInterest = 0;
  const payoffOrder: { name: string; month: number }[] = [];

  while (debts.some((d) => d.balance > 0) && months < 600) {
    months++;

    // Accrue monthly interest
    debts.forEach((d) => {
      if (d.balance > 0) {
        const monthlyInterest = (d.balance * d.rate) / 100 / 12;
        d.balance += monthlyInterest;
        totalInterest += monthlyInterest;
      }
    });

    // Pay minimum on each debt
    let pool = extraPerMonth;
    debts.forEach((d) => {
      if (d.balance > 0) {
        const pay = Math.min(d.minPayment, d.balance);
        d.balance -= pay;
        pool += d.minPayment - pay;
      }
    });

    // Allocate the pool to the targeted debt
    const sortedActive = debts
      .filter((d) => d.balance > 0)
      .sort((a, b) =>
        strategy === 'avalanche' ? b.rate - a.rate : a.balance - b.balance
      );

    if (sortedActive.length > 0 && pool > 0) {
      const target = sortedActive[0];
      const pay = Math.min(pool, target.balance);
      target.balance -= pay;
    }

    // Record any payoffs this month
    debts.forEach((d) => {
      if (d.balance <= 0.01 && !payoffOrder.find((p) => p.name === d.name)) {
        payoffOrder.push({ name: d.name, month: months });
        d.balance = 0;
      }
    });
  }

  return { months, totalInterest, payoffOrder };
}

export function DebtCalculator() {
  const t = useTranslations('DebtCalc');

  const [debts, setDebts] = useState<DebtItem[]>([
    { id: '1', name: 'บัตรเครดิต', balance: 50000, rate: 18, minPayment: 1000 },
    { id: '2', name: 'ผ่อนรถ', balance: 200000, rate: 6, minPayment: 5000 },
  ]);
  const [extra, setExtra] = useState('5000');

  const extraNum = parseFloat(extra.replace(/,/g, '')) || 0;
  const validDebts = debts.filter((d) => d.balance > 0);

  const avalanche = useMemo(() => simulate(validDebts, extraNum, 'avalanche'), [validDebts, extraNum]);
  const snowball = useMemo(() => simulate(validDebts, extraNum, 'snowball'), [validDebts, extraNum]);

  function addDebt() {
    setDebts([
      ...debts,
      {
        id: String(Date.now()),
        name: `หนี้ #${debts.length + 1}`,
        balance: 100000,
        rate: 10,
        minPayment: 2000,
      },
    ]);
  }

  function updateDebt(id: string, key: keyof DebtItem, value: string) {
    setDebts(
      debts.map((d) =>
        d.id === id ? { ...d, [key]: key === 'name' ? value : parseFloat(value.replace(/,/g, '')) || 0 } : d
      )
    );
  }

  function removeDebt(id: string) {
    setDebts(debts.filter((d) => d.id !== id));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">{t('debts')}</p>
            <Button size="sm" variant="outline" onClick={addDebt}>
              <Plus className="mr-1 h-3 w-3" /> {t('addDebt')}
            </Button>
          </div>
          <div className="space-y-2">
            {debts.map((d) => (
              <div key={d.id} className="grid grid-cols-12 gap-2 rounded-lg border p-2">
                <Input
                  className="col-span-12 h-8 text-sm sm:col-span-3"
                  value={d.name}
                  onChange={(e) => updateDebt(d.id, 'name', e.target.value)}
                  placeholder={t('debtName')}
                />
                <div className="col-span-4 sm:col-span-3">
                  <p className="text-[10px] text-muted-foreground">{t('balance')}</p>
                  <Input
                    className="h-8 text-sm"
                    value={String(d.balance)}
                    onChange={(e) => updateDebt(d.id, 'balance', e.target.value)}
                  />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <p className="text-[10px] text-muted-foreground">{t('rate')}</p>
                  <Input
                    className="h-8 text-sm"
                    value={String(d.rate)}
                    onChange={(e) => updateDebt(d.id, 'rate', e.target.value)}
                  />
                </div>
                <div className="col-span-4 sm:col-span-3">
                  <p className="text-[10px] text-muted-foreground">{t('minPayment')}</p>
                  <Input
                    className="h-8 text-sm"
                    value={String(d.minPayment)}
                    onChange={(e) => updateDebt(d.id, 'minPayment', e.target.value)}
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeDebt(d.id)}
                  className="col-span-1 h-8 w-8 text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <Label className="text-sm">{t('extraPerMonth')}</Label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">฿</span>
            <Input
              type="text"
              inputMode="decimal"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              className="pl-7"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{t('extraHint')}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ResultCard strategy="avalanche" data={avalanche} />
        <ResultCard strategy="snowball" data={snowball} />
      </div>

      {avalanche.totalInterest > 0 && snowball.totalInterest > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-semibold">{t('comparison')}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('avalancheSaves', {
                    amount: formatTHB(snowball.totalInterest - avalanche.totalInterest, { compact: true }),
                    months: snowball.months - avalanche.months,
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResultCard({
  strategy,
  data,
}: {
  strategy: Strategy;
  data: { months: number; totalInterest: number; payoffOrder: { name: string; month: number }[] };
}) {
  const t = useTranslations('DebtCalc');
  const Icon = strategy === 'avalanche' ? Mountain : Snowflake;
  const color = strategy === 'avalanche' ? 'text-blue-600' : 'text-cyan-600';
  const bg = strategy === 'avalanche' ? 'bg-blue-50' : 'bg-cyan-50';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', bg, color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">{t(strategy)}</p>
            <p className="text-[11px] text-muted-foreground">{t(`${strategy}Hint`)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{t('payoffTime')}</p>
            <p className="font-bold">
              {Math.floor(data.months / 12)} {t('years')} {data.months % 12} {t('months')}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('totalInterest')}</p>
            <p className="font-bold text-red-600">{formatTHB(data.totalInterest, { compact: true })}</p>
          </div>
        </div>
        {data.payoffOrder.length > 0 && (
          <div className="mt-3 space-y-1 border-t pt-3">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">{t('order')}</p>
            {data.payoffOrder.map((p, i) => (
              <p key={i} className="text-xs">
                {i + 1}. {p.name} — {t('paidOffIn', { months: p.month })}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
