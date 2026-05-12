'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Trophy, Snowflake, Mountain, Save, Target, CheckCircle2, X, Loader2, Brain, Sparkles } from 'lucide-react';
import { renderMarkdown } from '@/lib/markdown';
import { formatTHB, cn } from '@/lib/utils';
import { saveDebtPlan, deactivateDebtPlan, quickCreateDebt, analyzeDebtSituation } from '@/app/[locale]/(app)/tools/debt/actions';
import { useRouter } from 'next/navigation';


// ─────────────────────────────────────────────────────────────────────
// Parse the trailing JSON code-block produced by AI debt analysis.
// AI emits markdown analysis followed by a ```json { "plans": [...] } ``` block.
// Returns { advice (markdown without the JSON), plans (array) }.
// Safe against malformed JSON — returns empty plans on parse fail.
// ─────────────────────────────────────────────────────────────────────
function splitAdviceAndPlans(raw: string | null): {
  advice: string;
  plans: Array<{
    id: string;
    title: string;
    strategy: string;
    extra_per_month: number;
    expected_months: number;
    total_interest: number;
    summary: string;
    steps?: string[];
    pros?: string[];
    cons?: string[];
    recommended?: boolean;
  }>;
} {
  if (!raw) return { advice: '', plans: [] };
  const jsonBlockRe = /```json\s*([\s\S]*?)\s*```/i;
  const m = raw.match(jsonBlockRe);
  if (!m) return { advice: raw, plans: [] };
  const adviceText = raw.replace(jsonBlockRe, '').trim();
  try {
    const parsed = JSON.parse(m[1]);
    const plans = Array.isArray(parsed?.plans) ? parsed.plans : [];
    return { advice: adviceText, plans };
  } catch {
    return { advice: adviceText, plans: [] };
  }
}

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
  ai_advice_md?: string | null;
  plan_options?: any | null;
  selected_option_id?: string | null;
  created_at: string;
}

interface FinancialSnapshot {
  monthly_income: number;
  monthly_expense_total: number;
  existing_debt_payments: number;
  total_debt: number;
  cash_available: number;
  total_assets: number;
  active_months: number;
  budget_categories?: { name: string; budget: number; spent: number }[];
  goals?: {
    name: string;
    target: number;
    current: number;
    deadline: string | null;
    is_emergency_fund: boolean;
    is_linked: boolean;
    monthly_required: number | null;
  }[];
  cashflow?: {
    status: 'healthy' | 'tight' | 'critical';
    status_reason: string;
    months_of_runway: number;
    avg_monthly_net: number;
    projected_net_30: number;
    upcoming_fixed_expense: number;
    upcoming_fixed_income: number;
  } | null;
}

type Strategy = 'avalanche' | 'snowball';

interface SimResult {
  months: number;
  totalInterest: number;
  payoffOrder: { name: string; month: number; debt_id: string }[];
  phases: { from: number; to: number; targetName: string; targetId: string }[];
  isUnderwater: boolean; // true if any debt's min payment ≤ monthly interest
  underwaterDebts: { id: string; name: string; rate: number; balance: number; minPayment: number; monthlyInterest: number; shortfall: number }[];
  hitCap: boolean; // true if simulation hit 600-month cap (still has balance)
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

  // Pre-flight: check if total monthly payment can cover total monthly interest
  // (if the EXTRA is allocated to highest-interest debt, can it cover?)
  const totalMonthlyInterest = initial.reduce((s, d) => s + (d.balance * d.rate / 100 / 12), 0);
  const totalMonthlyPayment = initial.reduce((s, d) => s + d.minPayment, 0) + extraPerMonth;
  const isOverallUnderwater = totalMonthlyPayment <= totalMonthlyInterest;

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

  // Detect per-debt underwater
  const underwaterDebts = initial.map((d) => {
    const monthlyInterest = (d.balance * d.rate) / 100 / 12;
    return {
      id: d.id,
      name: d.name,
      rate: d.rate,
      balance: d.balance,
      minPayment: d.minPayment,
      monthlyInterest,
      shortfall: Math.max(0, monthlyInterest - d.minPayment),
    };
  }).filter((d) => d.shortfall > 0);

  const hitCap = months >= 600 && debts.some((d) => !d.paidOff && d.balance > 0);

  return {
    months,
    totalInterest,
    payoffOrder,
    phases,
    isUnderwater: isOverallUnderwater || underwaterDebts.length > 0,
    underwaterDebts,
    hitCap,
  };
}

export function DebtCalculator({
  initialDebts = [],
  activePlan = null,
  snapshot = null,
}: {
  initialDebts?: { id: string; name: string; current_balance: number; interest_rate: number; monthly_payment: number | null }[];
  activePlan?: ActivePlan | null;
  snapshot?: FinancialSnapshot | null;
}) {
  const t = useTranslations('DebtCalc');

  const seedDebts: DebtItem[] = initialDebts.length > 0
    ? initialDebts.map((d) => ({
        id: d.id,
        name: d.name,
        balance: Number(d.current_balance),
        rate: Number(d.interest_rate),
        // Default to the actual monthly_payment from DB. Fall back to 2%
        // of balance (or min ฿500) only if no value set. Round to 2 decimals
        // so the UI never shows 730.7210000.
        minPayment: Math.round(
          Number(d.monthly_payment ?? Math.max(d.current_balance * 0.02, 500)) * 100,
        ) / 100,
      }))
    : [
        { id: '1', name: 'บัตรเครดิต', balance: 50000, rate: 18, minPayment: 1000 },
        { id: '2', name: 'ผ่อนรถ', balance: 200000, rate: 6, minPayment: 5000 },
      ];

  const [debts, setDebts] = useState<DebtItem[]>(seedDebts);
  const [extra, setExtra] = useState(activePlan?.extra_per_month != null ? String(activePlan.extra_per_month) : '');
  const [chosenStrategy, setChosenStrategy] = useState<Strategy>(activePlan?.strategy ?? 'avalanche');
  const [saved, setSaved] = useState(!!activePlan);

  const extraIsEmpty = extra.trim() === '';
  const extraNum = extraIsEmpty ? 0 : (parseFloat(extra.replace(/,/g, '')) || 0);
  const extraIsExplicitZero = !extraIsEmpty && extraNum === 0;
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

  const [aiAdvice, setAiAdvice] = useState<string | null>(activePlan?.ai_advice_md ?? null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function askAI() {
    if (!snapshot) {
      setAiError('no_snapshot');
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiAdvice(null);
    const r = await analyzeDebtSituation(
      validDebts.map((d) => ({
        name: d.name,
        type: 'debt',
        balance: d.balance,
        rate: d.rate,
        monthly_payment: d.minPayment,
      })),
      snapshot,
      extraNum,
      chosenStrategy,
      extraIsEmpty // true = ask AI to recommend optimal
    );
    setAiLoading(false);
    if (r.ok && r.advice) setAiAdvice(r.advice);
    else setAiError(r.error ?? 'unknown');
  }

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

  const [savingOption, setSavingOption] = useState<string | null>(null);

  function periodWordFromSnap(snap: FinancialSnapshot | null | undefined): string {
    return (snap as any)?.pay_cycle?.day ? 'งวด' : 'เดือน';
  }

  async function handlePickPlan(p: { id: string; strategy: string; extra_per_month: number; expected_months: number; total_interest: number }) {
    setSavingOption(p.id);
    const fd = new FormData();
    const dbStrategy = (p.strategy === 'snowball') ? 'snowball' : 'avalanche';
    fd.append('strategy', dbStrategy);
    fd.append('extra_per_month', String(p.extra_per_month));
    fd.append('total_months', String(p.expected_months));
    fd.append('total_interest', String(p.total_interest));
    fd.append('payoff_order', JSON.stringify([]));
    if (aiAdvice) fd.append('ai_advice_md', aiAdvice);
    const { plans } = splitAdviceAndPlans(aiAdvice);
    fd.append('plan_options', JSON.stringify(plans));
    fd.append('selected_option_id', p.id);
    const r = await saveDebtPlan(fd);
    setSavingOption(null);
    if (r?.ok) {
      setSaved(true);
      router.refresh();
    }
  }

    async function handleSave() {
    const fd = new FormData();
    fd.append('strategy', chosenStrategy);
    fd.append('extra_per_month', String(extraNum));
    fd.append('total_months', String(chosen.months));
    fd.append('total_interest', String(Math.round(chosen.totalInterest)));
    fd.append('payoff_order', JSON.stringify(chosen.payoffOrder));
    if (aiAdvice) fd.append('ai_advice_md', aiAdvice);
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
                  <Input
                  className="h-8 text-sm"
                  type="text"
                  inputMode="decimal"
                  value={Number.isFinite(d.minPayment) ? d.minPayment.toFixed(2) : '0.00'}
                  onChange={(e) => updateDebt(d.id, 'minPayment', e.target.value)}
                />
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
              placeholder={t('extraPlaceholder')}
              className="pl-7"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{t('extraHint')}</p>
          {extraIsEmpty && (
            <p className="mt-1 rounded border border-purple-200 bg-purple-50 px-2 py-1 text-[11px] text-purple-900">
              ✨ {t('extraEmptyHint')}
            </p>
          )}
          {extraIsExplicitZero && (
            <p className="mt-1 rounded border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
              ℹ️ {t('extraZeroHint')}
            </p>
          )}
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
                  {validDebts.length === 1
                    ? t('singleDebtNoCompare')
                    : avalanche.totalInterest === snowball.totalInterest && avalanche.months === snowball.months
                    ? t('strategiesEqual')
                    : t('avalancheSaves', {
                        amount: formatTHB(Math.abs(snowball.totalInterest - avalanche.totalInterest)),
                        months: Math.abs(snowball.months - avalanche.months),
                      })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI advisor */}
      <Card>
        <CardContent className="p-4">
          {snapshot && (
            <div className="mb-3 rounded-lg border border-purple-200 bg-purple-50/50 p-2.5 text-[11px]">
              <p className="mb-1 font-semibold text-purple-900">{t('aiContextTitle')}</p>
              <ul className="space-y-0.5 text-purple-900/80">
                <li>· {t('ctxIncomeExpense')}: <span className="font-mono">{formatTHB(snapshot.monthly_income)}/เดือน − {formatTHB(snapshot.monthly_expense_total)}</span></li>
                {snapshot.cashflow && (
                  <li>· {t('ctxCashFlow')}: <span className={cn('font-semibold', snapshot.cashflow.status === 'critical' ? 'text-red-600' : snapshot.cashflow.status === 'tight' ? 'text-amber-600' : 'text-green-700')}>{snapshot.cashflow.status === 'critical' ? '✗ วิกฤต' : snapshot.cashflow.status === 'tight' ? '⚠ ตึง' : '✓ แข็งแรง'}</span> · runway {snapshot.cashflow.months_of_runway.toFixed(1)} {t('months')}</li>
                )}
                <li>· {t('ctxDebts')}: {validDebts.length} {t('items')} · ผ่อน {formatTHB(snapshot.existing_debt_payments)}/เดือน</li>
                {snapshot.goals && snapshot.goals.length > 0 && (
                  <li>· {t('ctxGoals')}: {snapshot.goals.length} {t('items')} ({snapshot.goals.filter((g) => g.is_emergency_fund).length > 0 ? '🛡️ มีกองทุนฉุกเฉิน' : t('noEmergencyFund')})</li>
                )}
                {snapshot.budget_categories && snapshot.budget_categories.length > 0 && (
                  <li>· {t('ctxBudgets')}: {snapshot.budget_categories.length} {t('categories')}</li>
                )}
                {validDebts.length >= 2 && (() => {
                  const totalBal = validDebts.reduce((s, d) => s + d.balance, 0);
                  const wAvg = totalBal > 0 ? validDebts.reduce((s, d) => s + d.balance * d.rate, 0) / totalBal : 0;
                  const maxRate = Math.max(...validDebts.map((d) => d.rate));
                  const hasHighRate = maxRate >= 12; // worth considering consolidation
                  return hasHighRate ? (
                    <li className="text-purple-700 font-medium">
                      · 🔄 {t('ctxConsolidation', { avg: wAvg.toFixed(1), max: maxRate.toFixed(1) })}
                    </li>
                  ) : null;
                })()}
              </ul>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Brain className="h-4 w-4 text-purple-600" />
              {t('aiAdvisorTitle')}
            </p>
            <Button size="sm" onClick={askAI} disabled={aiLoading || validDebts.length === 0 || !snapshot}>
              {aiLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
              {aiLoading ? t('analyzing') : aiAdvice ? t('regenerate') : t('askAI')}
            </Button>
          </div>
          {aiError && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
              {aiError === 'no_ai_key' ? t('noAiKey')
                : aiError === 'no_snapshot' ? t('noSnapshot')
                : aiError === 'ai_error' ? t('aiFailed')
                : aiError}
            </div>
          )}
          {aiAdvice && (() => {
            const { advice, plans } = splitAdviceAndPlans(aiAdvice);
            return (
              <div className="mt-3 space-y-3">
                {advice && (
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                    {renderMarkdown(advice)}
                  </div>
                )}

                {plans.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      📋 แผนที่ AI แนะนำ — เลือก 1 แผนเพื่อบันทึก
                    </p>
                    <div className="grid gap-2">
                      {plans.map((p) => {
                        const isSelected = activePlan?.selected_option_id === p.id;
                        return (
                          <div
                            key={p.id}
                            className={cn(
                              'rounded-xl border-2 p-3 transition-all',
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50'
                                : p.recommended
                                  ? 'border-primary/40 bg-primary/5'
                                  : 'border-border bg-background',
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
                                  {p.title}
                                  {p.recommended && (
                                    <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-primary">
                                      ⭐ แนะนำ
                                    </span>
                                  )}
                                  {isSelected && (
                                    <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
                                      ✓ บันทึกแล้ว
                                    </span>
                                  )}
                                </p>
                                {p.summary && (
                                  <p className="mt-1 text-xs text-muted-foreground">{p.summary}</p>
                                )}
                                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                                  <div>
                                    <span className="text-muted-foreground">โปะเพิ่ม:</span>{' '}
                                    <span className="font-semibold">฿{p.extra_per_month.toLocaleString()}/{periodWordFromSnap(snapshot)}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">ระยะเวลา:</span>{' '}
                                    <span className="font-semibold">{p.expected_months} {p.expected_months >= 12 ? `(~${(p.expected_months/12).toFixed(1)}ปี)` : 'เดือน'}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">ดอกรวม:</span>{' '}
                                    <span className="font-semibold text-rose-600">฿{p.total_interest.toLocaleString()}</span>
                                  </div>
                                </div>
                                {p.steps && p.steps.length > 0 && (
                                  <details className="mt-2">
                                    <summary className="cursor-pointer text-[11px] font-medium text-primary">ดูขั้นตอน · ข้อดี-ข้อเสีย</summary>
                                    <div className="mt-2 space-y-1.5 text-[11px]">
                                      <div>
                                        <p className="font-semibold text-emerald-700">✓ ขั้นตอน</p>
                                        <ul className="ml-4 list-decimal">
                                          {p.steps.map((st, i) => <li key={i}>{st}</li>)}
                                        </ul>
                                      </div>
                                      {p.pros && p.pros.length > 0 && (
                                        <div>
                                          <p className="font-semibold text-emerald-700">+ ข้อดี</p>
                                          <ul className="ml-4 list-disc">
                                            {p.pros.map((s, i) => <li key={i}>{s}</li>)}
                                          </ul>
                                        </div>
                                      )}
                                      {p.cons && p.cons.length > 0 && (
                                        <div>
                                          <p className="font-semibold text-amber-700">− ข้อระวัง</p>
                                          <ul className="ml-4 list-disc">
                                            {p.cons.map((s, i) => <li key={i}>{s}</li>)}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </details>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant={isSelected ? 'outline' : 'default'}
                                disabled={savingOption === p.id}
                                onClick={() => handlePickPlan(p)}
                              >
                                {savingOption === p.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : isSelected ? 'บันทึกใหม่' : 'เลือกแผนนี้'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          {!aiAdvice && !aiError && !aiLoading && (
            <p className="mt-2 text-xs text-muted-foreground">{t('aiAdvisorHint')}</p>
          )}
        </CardContent>
      </Card>

      {/* Save plan */}
      {validDebts.length > 0 && (
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={handleSave}
          disabled={chosen.hitCap}
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
              <Target className="h-3 w-3" /> {t('payTopupHereFirst')}
            </p>
            <p className="mt-1 text-base font-bold">{firstTarget.name}</p>
            <p className="text-xs text-muted-foreground">
              {firstTarget.rate}%/yr · {formatTHB(firstTarget.balance)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t('focusUntil', { month: firstPhase.to })}
            </p>
          </div>
        )}

        {(data.hitCap || data.underwaterDebts.length > 0) && (
          <div className="mb-3 rounded-lg border-2 border-red-300 bg-red-50 p-3 text-xs text-red-900">
            <p className="flex items-center gap-1 font-bold">
              ⚠️ {t('underwaterWarning')}
            </p>
            {data.underwaterDebts.length > 0 && (
              <ul className="mt-1.5 space-y-1">
                {data.underwaterDebts.map((d) => (
                  <li key={d.id}>
                    · <span className="font-semibold">{d.name}</span>: {t('payIs')} {formatTHB(d.minPayment)}/{t('months')} {t('butInterest')} {formatTHB(d.monthlyInterest)}/{t('months')} → {t('shortfall')} {formatTHB(d.shortfall)}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px]">
              💡 {t('underwaterFix')}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{t('payoffTime')}</p>
            <p className="font-bold">
              {data.hitCap
                ? <span className="text-red-600">{t('neverPayoff')}</span>
                : `${Math.floor(data.months / 12)} ${t('years')} ${data.months % 12} ${t('months')}`}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('totalInterest')}</p>
            <p className="font-bold text-red-600">
              {data.hitCap ? '∞' : formatTHB(data.totalInterest)}
            </p>
          </div>
        </div>

        {/* PHASE TIMELINE — which debt gets the extra in each month range */}
        {data.phases.length > 1 && (
          <div className="mt-3 space-y-1.5 border-t pt-3">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">{t('extraSchedule')}</p>
            <p className="rounded-md bg-amber-50 border border-amber-200 px-2 py-1.5 text-[10px] leading-relaxed text-amber-900">
              {t('mustPayMinNote')}
            </p>
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
            {data.hitCap
              ? <span className="text-red-600">{t('neverPayoff')}</span>
              : `${Math.floor(data.months / 12)}${t('years')} ${data.months % 12}${t('months')}`}
          </span>
          <span className="text-red-600">
            {data.hitCap ? '∞' : formatTHB(data.totalInterest)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
