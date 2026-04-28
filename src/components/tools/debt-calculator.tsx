'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Trophy, Snowflake, Mountain, Save, Target, CheckCircle2, X, Loader2 } from 'lucide-react';
import { formatTHB, cn } from '@/lib/utils';
import { saveDebtPlan, deactivateDebtPlan, quickCreateDebt } from '@/app/[locale]/(app)/tools/debt/actions';
import { useRouter } from 'next/navigation';

interface DebtItem {
  id: string;
  name: string;
  balance: number;
  rate: number;
  minPayment: number;
}

interface ActivePlan {
  id: string;
  strategy: 'avalanche' | 'snowball';
  extra_per_month: number;
  total_months: number | null;
  total_interest: number | null;
  payoff_order: { debt_id?: string; name: string; month: number }[] | null;
  created_at: string;
}

type Strategy = 'avalanche' | 'snowball';

interface SimResult {
  months: number;
  totalInterest: number;
  payoffOrder: { name: string; month: number; debt_id: string }[];
  // Phase = "during this month range, the extra is going to debt X"
  phases: { from: number; to: number; targetName: string; targetId: string }[];
}

function simulate(
  initial: DebtItem[],
  extraPerMonth: number,
  strategy: Strategy
): SimResult {
  const debts = initial.map((d) => ({ ...d, balance: d.balance, paidOff: false }));
  let months = 0;
  let totalInterest = 0;
  const payoffOrder: { name: string; month: number; debt_id: string }[] = [];
  const phases: { from: number; to: number; targetName: string; targetId: string }[] = [];
  let currentTargetId = '';
  let phaseStart = 1;

  while (debts.some((d) => !d.paidOff && d.balance > 0) && months < 600) {
    months++;

    debts.forEach((d) => {
      if (!d.paidOff && d.balance > 0) {
        const monthlyInterest = (d.balance * d.rate) / 100 / 12;
        d.balance += monthlyInterest;
        totalInterest += monthlyInterest;
      }
    });

    let pool = extraPerMonth;
    debts.forEach((d) => {
      if (!d.paidOff && d.balance > 0) {
        const pay = Math.min(d.minPayment, d.balance);
        d.balance -= pay;
        pool += d.minPayment - pay;
      }
    });

    const sortedActive = debts
      .filter((d) => !d.paidOff && d.balance > 0)
      .sort((a, b) =>
        strategy === 'avalanche' ? b.rate - a.rate : a.balance - b.balance
      );

    const target = sortedActive[0];
    if (target) {
      // Track phase change
      if (target.id !== currentTargetId) {
        if (currentTargetId) {
          phases.push({
            from: phaseStart,
            to: months - 1,
            targetName: debts.find((d) => d.id === currentTargetId)?.name ?? '',
            targetId: currentTargetId,
          });
        }
        currentTargetId = target.id;
        phaseStart = months;
      }

      if (pool > 0) {
        const pay = Math.min(pool, target.balance);
        target.balance -= pay;
      }
    }

    debts.forEach((d) => {
      if (!d.paidOff && d.balance <= 0.01) {
        d.paidOff = true;
        d.balance = 0;
        payoffOrder.push({ name: d.name, month: months, debt_id: d.id });
      }
    });
  }

  if (currentTargetId) {
    phases.push({
      from: phaseStart,
      to: months,
      targetName: debts.find((d) => d.id === currentTargetId)?.name ?? '',
      targetId: currentTargetId,
    });
  }

  return { months, totalInterest, payoffOrder, phases };
}

export function DebtCalculator({
  initialDebts = [],
  activePlan = null,
}: {
  initialDebts?: { id: string; name: string; current_balance: number; interest_rate: number; monthly_payment: number | null }[];
  activePlan?: ActivePlan | null;
}) {
  const t = useTranslations('DebtCalc');

  const seedDebts: DebtItem[] = initialDebts.length > 0
    ? initialDebts.map((d) => ({
        id: d.id,
        name: d.name,
        balance: Number(d.current_balance),
        rate: Number(d.interest_rate),
        minPayment: Number(d.monthly_payment ?? Math.max(d.current_balance * 0.02, 500)),
      }))
    : [
        { id: '1', name: 'บัตรเครดิต', balance: 50000, rate: 18, minPayment: 1000 },
        { id: '2', name: 'ผ่อนรถ', balance: 200000, rate: 6, minPayment: 5000 },
      ];

  const [debts, setDebts] = useState<DebtItem[]>(seedDebts);
  const [extra, setExtra] = useState(String(activePlan?.extra_per_month ?? 5000));
  const [chosenStrategy, setChosenStrategy] = useState<Strategy>(activePlan?.strategy ?? 'avalanche');
  const [saved, setSaved] = useState(!!activePlan);

  const extraNum = parseFloat(extra.replace(/,/g, '')) || 0;
  const validDebts = debts.filter((d) => d.balance > 0);

  const avalanche = useMemo(() => simulate(validDebts, extraNum, 'avalanche'), [validDebts, extraNum]);
  const snowball = useMemo(() => simulate(validDebts, extraNum, 'snowball'), [validDebts, extraNum]);
  const chosen = chosenStrategy === 'avalanche' ? avalanche : snowball;

  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newMin, setNewMin] = useState('');
  const [newType, setNewType] = useState('credit_card');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function handleQuickCreate() {
    setAddError(null);
    if (!newName.trim() || !newBalance.trim() || !newRate.trim()) {
      setAddError('กรุณากรอกข้อมูลให้ครบ');
      return;
    }
    setAdding(true);
    const fd = new FormData();
    fd.append('name', newName);
    fd.append('type', newType);
    fd.append('balance', newBalance);
    fd.append('rate', newRate);
    fd.append('min_payment', newMin || '0');
    const r = await quickCreateDebt(fd);
    setAdding(false);
    if (!r.ok) {
      setAddError('เพิ่มหนี้ไม่สำเร็จ ลองใหม่');
      return;
    }
    setShowAddForm(false);
    setNewName(''); setNewBalance(''); setNewRate(''); setNewMin('');
    setSaved(false);
    router.refresh(); // re-fetch initialDebts
  }

  function updateDebt(id: string, key: keyof DebtItem, value: string) {
    setDebts(
      debts.map((d) =>
        d.id === id ? { ...d, [key]: key === 'name' ? value : parseFloat(value.replace(/,/g, '')) || 0 } : d
      )
    );
    setSaved(false);
  }

  function removeDebt(id: string) {
    setDebts(debts.filter((d) => d.id !== id));
    setSaved(false);
  }

  async function handleSave() {
    const fd = new FormData();
    fd.append('strategy', chosenStrategy);
    fd.append('extra_per_month', String(extraNum));
    fd.append('total_months', String(chosen.months));
    fd.append('total_interest', String(Math.round(chosen.totalInterest)));
    fd.append('payoff_order', JSON.stringify(chosen.payoffOrder));
    const r = await saveDebtPlan(fd);
    if (!('error' in r) || !r.error) setSaved(true);
  }

  async function handleClear() {
    await deactivateDebtPlan();
    setSaved(false);
  }

  return (
    <div className="space-y-4">
      {activePlan && saved && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="font-semibold">{t('activePlan')}: </span>
                  {t(activePlan.strategy)} · +฿{Number(activePlan.extra_per_month).toLocaleString()}/{t('months')}
                </span>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={handleClear}>
                <X className="mr-1 h-3 w-3" /> {t('clearPlan')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">{t('debts')}</p>
            <Button size="sm" variant="outline" onClick={() => setShowAddForm((s) => !s)}>
              <Plus className="mr-1 h-3 w-3" /> {t('addDebt')}
            </Button>
          </div>
          {showAddForm && (
            <div className="mb-3 space-y-2 rounded-lg border-2 border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-semibold text-primary">{t('quickAddTitle')}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground">{t('debtName')}</p>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8 text-sm" placeholder="เช่น บัตรเครดิต KBank" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t('quickType')}</p>
                  <select value={newType} onChange={(e) => setNewType(e.target.value)} className="h-8 w-full rounded-md border bg-background px-2 text-sm">
                    <option value="credit_card">บัตรเครดิต</option>
                    <option value="personal_loan">สินเชื่อบุคคล</option>
                    <option value="auto_loan">สินเชื่อรถ</option>
                    <option value="mortgage">สินเชื่อบ้าน</option>
                    <option value="student_loan">กยศ./การศึกษา</option>
                    <option value="informal">หนี้นอกระบบ</option>
                    <option value="installment_zero">ผ่อน 0%</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t('balance')}</p>
                  <Input value={newBalance} onChange={(e) => setNewBalance(e.target.value)} className="h-8 text-sm" placeholder="50000" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t('rate')}</p>
                  <Input value={newRate} onChange={(e) => setNewRate(e.target.value)} className="h-8 text-sm" placeholder="18" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{t('minPayment')}</p>
                  <Input value={newMin} onChange={(e) => setNewMin(e.target.value)} className="h-8 text-sm" placeholder="1000" />
                </div>
              </div>
              {addError && <p className="text-[11px] text-destructive">{addError}</p>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleQuickCreate} disabled={adding} className="flex-1">
                  {adding ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                  {adding ? '...' : t('saveDebt')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setAddError(null); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">{t('quickAddHint')}</p>
            </div>
          )}
          {initialDebts.length > 0 && debts === seedDebts && (
            <p className="mb-2 rounded-md border bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
              ✓ {t('autoLoadedFromDebts', { count: initialDebts.length })}
            </p>
          )}
          <div className="space-y-2">
            {debts.map((d) => (
              <div key={d.id} className="grid grid-cols-12 gap-2 rounded-lg border p-2">
                <Input
                  className="col-span-12 h-8 text-sm sm:col-span-3"
                  value={d.name}
                  onChange={(e) => updateDebt(d.id, 'name', e.target.value)}
                />
                <div className="col-span-4 sm:col-span-3">
                  <p className="text-[10px] text-muted-foreground">{t('balance')}</p>
                  <Input className="h-8 text-sm" value={String(d.balance)} onChange={(e) => updateDebt(d.id, 'balance', e.target.value)} />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <p className="text-[10px] text-muted-foreground">{t('rate')}</p>
                  <Input className="h-8 text-sm" value={String(d.rate)} onChange={(e) => updateDebt(d.id, 'rate', e.target.value)} />
                </div>
                <div className="col-span-4 sm:col-span-3">
                  <p className="text-[10px] text-muted-foreground">{t('minPayment')}</p>
                  <Input className="h-8 text-sm" value={String(d.minPayment)} onChange={(e) => updateDebt(d.id, 'minPayment', e.target.value)} />
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeDebt(d.id)} className="col-span-1 h-8 w-8 text-destructive">
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
              onChange={(e) => { setExtra(e.target.value); setSaved(false); }}
              className="pl-7"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{t('extraHint')}</p>
        </CardContent>
      </Card>

      {/* Strategy chooser tabs */}
      <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/40 p-1">
        {(['avalanche', 'snowball'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setChosenStrategy(s); setSaved(false); }}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              chosenStrategy === s
                ? s === 'avalanche' ? 'bg-blue-50 text-blue-700' : 'bg-cyan-50 text-cyan-700'
                : 'text-muted-foreground'
            )}
          >
            {s === 'avalanche' ? <Mountain className="mr-1 inline h-4 w-4" /> : <Snowflake className="mr-1 inline h-4 w-4" />}
            {t(s)}
          </button>
        ))}
      </div>

      <ResultCard strategy={chosenStrategy} data={chosen} debts={validDebts} />

      <div className="grid gap-4 lg:grid-cols-2">
        {chosenStrategy !== 'avalanche' && <CompactCard strategy="avalanche" data={avalanche} />}
        {chosenStrategy !== 'snowball' && <CompactCard strategy="snowball" data={snowball} />}
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

      {/* Save plan */}
      {validDebts.length > 0 && (
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={handleSave}
          disabled={saved}
        >
          <Save className="mr-2 h-4 w-4" />
          {saved ? t('planSaved') : t('savePlan')}
        </Button>
      )}
    </div>
  );
}

function ResultCard({
  strategy,
  data,
  debts,
}: {
  strategy: Strategy;
  data: SimResult;
  debts: DebtItem[];
}) {
  const t = useTranslations('DebtCalc');
  const Icon = strategy === 'avalanche' ? Mountain : Snowflake;
  const color = strategy === 'avalanche' ? 'text-blue-600' : 'text-cyan-600';
  const bg = strategy === 'avalanche' ? 'bg-blue-50' : 'bg-cyan-50';

  // Find the FIRST target — that's where extra payment goes right NOW
  const firstPhase = data.phases[0];
  const firstTarget = firstPhase ? debts.find((d) => d.id === firstPhase.targetId) : null;

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

        {/* CURRENT TARGET */}
        {firstTarget && (
          <div className="mb-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Target className="h-3 w-3" /> {t('payExtraTo')}
            </p>
            <p className="mt-1 text-base font-bold">{firstTarget.name}</p>
            <p className="text-xs text-muted-foreground">
              {firstTarget.rate}%/yr · {formatTHB(firstTarget.balance, { compact: true })}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t('focusUntil', { month: firstPhase.to })}
            </p>
          </div>
        )}

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

        {/* PHASE TIMELINE — which debt gets the extra in each month range */}
        {data.phases.length > 1 && (
          <div className="mt-3 space-y-1.5 border-t pt-3">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">{t('extraSchedule')}</p>
            {data.phases.map((p, i) => {
              const debt = debts.find((d) => d.id === p.targetId);
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                    i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    {i + 1}
                  </div>
                  <span className="font-medium">{p.targetName}</span>
                  <span className="text-muted-foreground">
                    · {t('monthRange', { from: p.from, to: p.to })}
                    {debt && ` · ${debt.rate}%/yr`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompactCard({ strategy, data }: { strategy: Strategy; data: SimResult }) {
  const t = useTranslations('DebtCalc');
  return (
    <Card className="opacity-70">
      <CardContent className="p-3">
        <p className="text-xs font-semibold text-muted-foreground">{t('alternative')}: {t(strategy)}</p>
        <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
          <span>
            {Math.floor(data.months / 12)}{t('years')} {data.months % 12}{t('months')}
          </span>
          <span className="text-red-600">
            {formatTHB(data.totalInterest, { compact: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
