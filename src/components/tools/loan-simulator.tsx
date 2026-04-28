'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Calculator, TrendingDown, AlertTriangle, CheckCircle2,
  Sparkles, Loader2, Brain, Plus, Trash2, Table as TableIcon, ChevronDown, ChevronUp,
} from 'lucide-react';
import { formatTHB, cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/markdown';
import { analyzeLoanFeasibility } from '@/app/[locale]/(app)/tools/loan/actions';

interface LoanContext {
  monthly_income: number;
  monthly_fixed_expenses: number;
  existing_debt_payments: number;
  total_debt: number;
}

interface DebtRow {
  id: string;
  name: string;
  type: string;
  current_balance: number;
  interest_rate: number;
  monthly_payment: number;
}

// Compute payoff: months to clear `balance` paying `monthlyPay` at `ratePct` annual interest.
// If monthly payment is less than monthly interest, payoff impossible — return Infinity-like.
function computePayoff(balance: number, ratePct: number, monthlyPay: number) {
  if (balance <= 0) return { months: 0, totalInterest: 0 };
  if (monthlyPay <= 0) return { months: 9999, totalInterest: balance * 5 };
  const r = ratePct / 100 / 12;
  const interestThisMonth = balance * r;
  if (monthlyPay <= interestThisMonth) {
    // Will never pay off
    return { months: 9999, totalInterest: balance * 5 };
  }
  let bal = balance;
  let months = 0;
  let totalInterest = 0;
  while (bal > 0.01 && months < 600) {
    months++;
    const interest = bal * r;
    totalInterest += interest;
    const principal = Math.min(monthlyPay - interest, bal);
    bal = Math.max(0, bal - principal);
  }
  return { months, totalInterest };
}

type RateType = 'reducing' | 'flat' | 'stepped';

interface RateStep { from_month: number; to_month: number | null; rate: number; }

interface AmortizationRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
  rate: number;
}

function pmt(rate: number, periods: number, principal: number): number {
  if (rate === 0) return principal / periods;
  const r = rate / 100 / 12;
  return (principal * r) / (1 - Math.pow(1 + r, -periods));
}

// Build amortization for reducing balance (constant payment)
function buildReducing(P: number, ratePct: number, n: number): AmortizationRow[] {
  const monthly = pmt(ratePct, n, P);
  const r = ratePct / 100 / 12;
  let balance = P;
  const rows: AmortizationRow[] = [];
  for (let m = 1; m <= n; m++) {
    const interest = balance * r;
    const principal = Math.min(monthly - interest, balance);
    balance = Math.max(0, balance - principal);
    rows.push({
      month: m,
      payment: principal + interest,
      interest,
      principal,
      balance,
      rate: ratePct,
    });
  }
  return rows;
}

// Flat rate: interest computed on original principal for whole term
function buildFlat(P: number, ratePct: number, n: number): AmortizationRow[] {
  const totalInterest = (P * ratePct * n) / 100 / 12;
  const totalPay = P + totalInterest;
  const monthlyPay = totalPay / n;
  const monthlyInterest = totalInterest / n;
  const monthlyPrincipal = P / n;
  let balance = P;
  const rows: AmortizationRow[] = [];
  for (let m = 1; m <= n; m++) {
    balance = Math.max(0, balance - monthlyPrincipal);
    rows.push({
      month: m,
      payment: monthlyPay,
      interest: monthlyInterest,
      principal: monthlyPrincipal,
      balance,
      rate: ratePct,
    });
  }
  return rows;
}

// Stepped rate: rate changes per schedule, payment recalculated using PMT for remaining balance + remaining term at each step boundary
function buildStepped(P: number, schedule: RateStep[], n: number): AmortizationRow[] {
  let balance = P;
  const rows: AmortizationRow[] = [];

  for (let m = 1; m <= n; m++) {
    // Find rate for this month
    const step = schedule.find(
      (s) => m >= s.from_month && (s.to_month == null || m <= s.to_month)
    ) ?? schedule[schedule.length - 1];
    const ratePct = step?.rate ?? 0;
    const r = ratePct / 100 / 12;

    // Recalc payment at start of step OR fall back to PMT for remaining months
    const monthsLeft = n - m + 1;
    const monthly = r === 0 ? balance / monthsLeft : (balance * r) / (1 - Math.pow(1 + r, -monthsLeft));

    const interest = balance * r;
    const principal = Math.min(monthly - interest, balance);
    balance = Math.max(0, balance - principal);

    rows.push({
      month: m,
      payment: principal + interest,
      interest,
      principal,
      balance,
      rate: ratePct,
    });
    if (balance <= 0.01) break;
  }
  return rows;
}

const RATE_LABELS = {
  reducing: { th: 'ลดต้นลดดอก', en: 'Reducing balance', desc_th: 'มาตรฐาน — ดอกคิดจากเงินต้นคงเหลือ', desc_en: 'Default — interest on remaining balance' },
  flat: { th: 'ลดต้นไม่ลดดอก (Flat)', en: 'Flat rate', desc_th: 'ดอกคงที่ตลอดสัญญา (พบในสินเชื่อรถ)', desc_en: 'Fixed interest throughout (Thai auto loan)' },
  stepped: { th: 'ดอกขั้นบันได', en: 'Stepped rate', desc_th: 'ดอกแตกต่างตามช่วง (สินเชื่อบ้าน)', desc_en: 'Different rates per period (mortgage)' },
};

export function LoanSimulator({ context, debts = [] }: { context: LoanContext; debts?: DebtRow[] }) {
  const t = useTranslations('Loan');

  const [amount, setAmount] = useState('500000');
  const [rate, setRate] = useState('6.5');
  const [years, setYears] = useState('5');
  const [reason, setReason] = useState('');
  const [income, setIncome] = useState(String(context.monthly_income || 30000));
  const [fixedExp, setFixedExp] = useState(String(context.monthly_fixed_expenses || 10000));

  const [rateType, setRateType] = useState<RateType>('reducing');
  const [consolidationMode, setConsolidationMode] = useState(false);
  const [selectedDebtIds, setSelectedDebtIds] = useState<string[]>([]);
  const [steps, setSteps] = useState<RateStep[]>([
    { from_month: 1, to_month: 12, rate: 2.99 },
    { from_month: 13, to_month: 24, rate: 3.49 },
    { from_month: 25, to_month: 36, rate: 4.49 },
    { from_month: 37, to_month: null, rate: 5.5 },
  ]);
  const [showSchedule, setShowSchedule] = useState(false);

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Compute consolidation 'before' baseline
  const consolidation = useMemo(() => {
    if (!consolidationMode || selectedDebtIds.length === 0) {
      return null;
    }
    const selected = debts.filter((d) => selectedDebtIds.includes(d.id));
    const totalBalance = selected.reduce((s, d) => s + d.current_balance, 0);
    const totalMonthly = selected.reduce((s, d) => s + d.monthly_payment, 0);

    // Compute "before" payoff for each debt independently, take longest
    let beforeMaxMonths = 0;
    let beforeTotalInterest = 0;
    const perDebt = selected.map((d) => {
      const r = computePayoff(d.current_balance, d.interest_rate, d.monthly_payment);
      beforeMaxMonths = Math.max(beforeMaxMonths, r.months);
      beforeTotalInterest += r.totalInterest;
      return { ...d, payoff_months: r.months, total_interest: r.totalInterest };
    });

    return {
      selected: perDebt,
      totalBalance,
      totalMonthly,
      beforeMaxMonths,
      beforeTotalInterest,
    };
  }, [consolidationMode, selectedDebtIds, debts]);

  // When consolidation enabled and debts selected, auto-set loan amount
  const effectiveAmount = consolidation
    ? String(consolidation.totalBalance)
    : amount;

  const calc = useMemo(() => {
    const A = parseFloat(effectiveAmount.replace(/,/g, '')) || 0;
    const R = parseFloat(rate) || 0;
    const N = (parseFloat(years) || 0) * 12;
    const I = parseFloat(income.replace(/,/g, '')) || 1;
    const E = parseFloat(fixedExp.replace(/,/g, '')) || 0;
    // If consolidating, subtract the monthly payments of debts being consolidated (they'll be paid off)
    const consolidatedMonthly = consolidation?.totalMonthly ?? 0;
    const existingDebt = Math.max(0, context.existing_debt_payments - consolidatedMonthly);

    let amortization: AmortizationRow[] = [];
    if (N > 0 && A > 0) {
      if (rateType === 'reducing') amortization = buildReducing(A, R, N);
      else if (rateType === 'flat') amortization = buildFlat(A, R, N);
      else amortization = buildStepped(A, steps, N);
    }

    const totalInterest = amortization.reduce((s, r) => s + r.interest, 0);
    const totalPaid = amortization.reduce((s, r) => s + r.payment, 0);
    // Use first-period monthly payment as representative (highest stress)
    const monthly = amortization[0]?.payment ?? 0;
    const avgMonthly = amortization.length > 0 ? totalPaid / amortization.length : 0;

    const oldDTI = (existingDebt / I) * 100;
    const newDTI = ((existingDebt + monthly) / I) * 100;
    const disposableNow = I - E - existingDebt;
    const disposableAfter = disposableNow - monthly;

    let verdict: 'safe' | 'caution' | 'risk' = 'safe';
    if (newDTI > 50 || disposableAfter < 0) verdict = 'risk';
    else if (newDTI > 40 || disposableAfter < I * 0.15) verdict = 'caution';

    return {
      monthly, avgMonthly, totalPaid, totalInterest,
      oldDTI, newDTI, disposableNow, disposableAfter,
      verdict, amortization,
    };
  }, [effectiveAmount, rate, years, rateType, steps, income, fixedExp, context.existing_debt_payments, consolidation]);

  async function askAI() {
    setAiLoading(true); setAiError(null); setAiAnalysis(null);
    const r = await analyzeLoanFeasibility({
      loan_amount: parseFloat(effectiveAmount.replace(/,/g, '')) || 0,
      loan_rate: parseFloat(rate) || 0,
      loan_months: (parseFloat(years) || 0) * 12,
      monthly_payment: Math.round(calc.monthly),
      monthly_income: parseFloat(income.replace(/,/g, '')) || 0,
      monthly_fixed_expenses: parseFloat(fixedExp.replace(/,/g, '')) || 0,
      existing_debt_payments: context.existing_debt_payments,
      total_debt: context.total_debt,
      reason,
      consolidation_mode: consolidationMode && !!consolidation,
      consolidated_debts: consolidation?.selected.map((d) => ({
        name: d.name,
        balance: d.current_balance,
        rate: d.interest_rate,
        monthly_payment: d.monthly_payment,
        remaining_months: d.payoff_months,
        total_interest_remaining: d.total_interest,
      })),
      before_total_monthly: consolidation?.totalMonthly,
      before_total_interest: consolidation?.beforeTotalInterest,
      before_payoff_months: consolidation?.beforeMaxMonths,
    });
    setAiLoading(false);
    if (r.ok && r.advice) setAiAnalysis(r.advice);
    else setAiError(r.error ?? 'unknown');
  }

  const verdictConfig = {
    safe: { icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50 border-green-300', label: t('verdictSafe') },
    caution: { icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-300', label: t('verdictCaution') },
    risk: { icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-50 border-red-300', label: t('verdictRisk') },
  };
  const v = verdictConfig[calc.verdict];
  const VIcon = v.icon;

  function updateStep(idx: number, key: keyof RateStep, value: string) {
    setSteps(steps.map((s, i) => {
      if (i !== idx) return s;
      if (key === 'rate') return { ...s, rate: parseFloat(value) || 0 };
      return { ...s, [key]: value ? parseInt(value, 10) : null };
    }));
  }

  return (
    <div className="space-y-4">
      {/* Loan inputs */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Calculator className="h-4 w-4 text-primary" />
            {t('loanDetails')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t('amount')}</Label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">฿</span>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9 pl-6 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">{rateType === 'stepped' ? t('rateAvg') : t('rate')}</Label>
              <Input
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                disabled={rateType === 'stepped'}
                className="h-9 text-sm"
              />
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {rateType === 'stepped' ? t('rateSteppedNote') : t('rateHint')}
              </p>
            </div>
            <div>
              <Label className="text-xs">{t('term')}</Label>
              <Input value={years} onChange={(e) => setYears(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">{t('reason')}</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} className="h-9 text-sm" placeholder={t('reasonPlaceholder')} />
            </div>
          </div>

          {/* Rate type selector */}
          <div className="space-y-2 pt-2">
            <Label className="text-xs">{t('rateType')}</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(['reducing', 'flat', 'stepped'] as const).map((rt) => {
                const active = rateType === rt;
                return (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => setRateType(rt)}
                    className={cn(
                      'flex flex-col items-start gap-0.5 rounded-lg border-2 p-2 text-left transition-all',
                      active ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                    )}
                  >
                    <span className="text-xs font-medium">{RATE_LABELS[rt].th}</span>
                    <span className="text-[10px] leading-tight text-muted-foreground">{RATE_LABELS[rt].desc_th}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stepped rate schedule */}
          {rateType === 'stepped' && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-2.5">
              <p className="text-xs font-semibold">{t('rateSchedule')}</p>
              <div className="space-y-1.5">
                {steps.map((s, i) => (
                  <div key={i} className="grid grid-cols-12 items-center gap-2">
                    <div className="col-span-3">
                      <p className="text-[10px] text-muted-foreground">{t('fromMonth')}</p>
                      <Input value={String(s.from_month)} onChange={(e) => updateStep(i, 'from_month', e.target.value)} className="h-7 text-xs" />
                    </div>
                    <div className="col-span-3">
                      <p className="text-[10px] text-muted-foreground">{t('toMonth')}</p>
                      <Input value={s.to_month != null ? String(s.to_month) : ''} placeholder={t('ongoing')} onChange={(e) => updateStep(i, 'to_month', e.target.value)} className="h-7 text-xs" />
                    </div>
                    <div className="col-span-5">
                      <p className="text-[10px] text-muted-foreground">{t('ratePct')}</p>
                      <Input value={String(s.rate)} onChange={(e) => updateStep(i, 'rate', e.target.value)} className="h-7 text-xs" />
                    </div>
                    <Button type="button" size="icon" variant="ghost" onClick={() => setSteps(steps.filter((_, j) => j !== i))} className="col-span-1 h-7 w-7 text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => {
                const last = steps[steps.length - 1];
                setSteps([...steps, { from_month: last ? (last.to_month ?? last.from_month) + 1 : 1, to_month: null, rate: 5 }]);
              }} className="h-7 text-xs">
                <Plus className="mr-1 h-3 w-3" /> {t('addStep')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Consolidation mode toggle + debt picker */}
      {debts.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <label className="flex cursor-pointer items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Brain className="h-4 w-4 text-primary" />
                {t('consolidationMode')}
              </span>
              <input
                type="checkbox"
                checked={consolidationMode}
                onChange={(e) => setConsolidationMode(e.target.checked)}
                className="h-5 w-5 rounded border-input accent-primary"
              />
            </label>
            <p className="text-xs text-muted-foreground">{t('consolidationHint')}</p>

            {consolidationMode && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">{t('selectDebtsToConsolidate')}:</p>
                <div className="space-y-1.5">
                  {debts.map((d) => {
                    const checked = selectedDebtIds.includes(d.id);
                    return (
                      <label
                        key={d.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 transition-colors",
                          checked ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedDebtIds([...selectedDebtIds, d.id]);
                            else setSelectedDebtIds(selectedDebtIds.filter((x) => x !== d.id));
                          }}
                          className="h-4 w-4 rounded border-input accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{d.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatTHB(d.current_balance)} · {d.interest_rate}%/ปี · ผ่อน {formatTHB(d.monthly_payment)}/เดือน
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {consolidation && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs space-y-1">
                    <p className="font-semibold">{t('consolidationSummary')}</p>
                    <div className="flex justify-between">
                      <span>{t('totalBalanceToConsolidate')}</span>
                      <span className="font-bold">{formatTHB(consolidation.totalBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('currentMonthlyTotal')}</span>
                      <span className="font-bold">{formatTHB(consolidation.totalMonthly)}/เดือน</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('currentPayoffMonths')}</span>
                      <span className="font-bold">{consolidation.beforeMaxMonths >= 9999 ? t('neverPayoff') : `${consolidation.beforeMaxMonths} ${t('months')}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('currentTotalInterest')}</span>
                      <span className="font-bold text-red-600">{formatTHB(consolidation.beforeTotalInterest)}</span>
                    </div>
                    <p className="pt-1 text-[10px] italic text-muted-foreground">
                      {t('autoFillNote')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {/* Income/expenses */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-semibold">{t('yourFinances')}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t('monthlyIncome')}</Label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">฿</span>
                <Input value={income} onChange={(e) => setIncome(e.target.value)} className="h-9 pl-6 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">{t('fixedExpenses')}</Label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">฿</span>
                <Input value={fixedExp} onChange={(e) => setFixedExp(e.target.value)} className="h-9 pl-6 text-sm" />
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{t('fixedHint')}</p>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2.5 text-xs">
            <p className="text-muted-foreground">
              {t('existingDebt')}: <span className="font-semibold text-foreground">{formatTHB(context.existing_debt_payments)}/เดือน</span>
              {' · '}{t('totalDebt')}: <span className="font-semibold text-foreground">{formatTHB(context.total_debt)}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Verdict */}
      <Card className={cn('border-2', v.bg)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <VIcon className={cn('mt-0.5 h-5 w-5 shrink-0', v.color)} />
            <div className="flex-1">
              <p className={cn('text-sm font-bold', v.color)}>{v.label}</p>
              <div className="mt-2 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">{t('monthlyPayment')}</p>
                  <p className="text-base font-bold">{formatTHB(calc.monthly)}</p>
                  {rateType === 'stepped' && (
                    <p className="text-[10px] text-muted-foreground">
                      {t('avg')}: {formatTHB(calc.avgMonthly)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">{t('totalInterest')}</p>
                  <p className="text-base font-bold text-red-600">{formatTHB(calc.totalInterest)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('newDTI')}</p>
                  <p className={cn('text-base font-bold', calc.newDTI > 50 ? 'text-red-600' : calc.newDTI > 40 ? 'text-amber-600' : 'text-green-600')}>
                    {calc.newDTI.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">({t('was')}: {calc.oldDTI.toFixed(1)}%)</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('disposableAfter')}</p>
                  <p className={cn('text-base font-bold', calc.disposableAfter < 0 ? 'text-red-600' : 'text-foreground')}>
                    {formatTHB(calc.disposableAfter)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amortization toggle */}
      {calc.amortization.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <button
              type="button"
              onClick={() => setShowSchedule((s) => !s)}
              className="flex w-full items-center justify-between text-sm font-semibold"
            >
              <span className="flex items-center gap-1.5">
                <TableIcon className="h-4 w-4 text-primary" />
                {t('amortizationTitle')} ({calc.amortization.length} {t('months')})
              </span>
              {showSchedule ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showSchedule && (
              <div className="mt-3 max-h-[420px] overflow-x-auto overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/50">
                    <tr className="border-b text-left">
                      <th className="px-2 py-1.5 text-[10px] uppercase">{t('thMonth')}</th>
                      <th className="px-2 py-1.5 text-right text-[10px] uppercase">{t('thRate')}</th>
                      <th className="px-2 py-1.5 text-right text-[10px] uppercase">{t('thPayment')}</th>
                      <th className="px-2 py-1.5 text-right text-[10px] uppercase">{t('thInterest')}</th>
                      <th className="px-2 py-1.5 text-right text-[10px] uppercase">{t('thPrincipal')}</th>
                      <th className="px-2 py-1.5 text-right text-[10px] uppercase">{t('thBalance')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc.amortization.map((row) => (
                      <tr key={row.month} className="border-b last:border-0">
                        <td className="px-2 py-1 font-mono">{row.month}</td>
                        <td className="px-2 py-1 text-right">{row.rate.toFixed(2)}%</td>
                        <td className="px-2 py-1 text-right font-mono">{formatTHB(row.payment)}</td>
                        <td className="px-2 py-1 text-right font-mono text-red-600">{formatTHB(row.interest)}</td>
                        <td className="px-2 py-1 text-right font-mono text-green-700">{formatTHB(row.principal)}</td>
                        <td className="px-2 py-1 text-right font-mono">{formatTHB(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-primary/5 font-semibold">
                    <tr>
                      <td colSpan={2} className="px-2 py-1.5">{t('total')}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{formatTHB(calc.totalPaid)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-red-600">{formatTHB(calc.totalInterest)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-green-700">
                        {formatTHB(parseFloat(amount.replace(/,/g, '')) || 0)}
                      </td>
                      <td className="px-2 py-1.5"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {/* Consolidation comparison */}
      {consolidation && (
        <Card className="border-2 border-primary/40">
          <CardContent className="p-4">
            <p className="mb-3 text-sm font-semibold">{t('beforeAfterCompare')}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-[10px] uppercase">{t('metric')}</th>
                    <th className="px-2 py-1.5 text-right text-[10px] uppercase">{t('before')}</th>
                    <th className="px-2 py-1.5 text-right text-[10px] uppercase">{t('after')}</th>
                    <th className="px-2 py-1.5 text-right text-[10px] uppercase">{t('change')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-2 py-1.5">{t('compareMonthly')}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{formatTHB(consolidation.totalMonthly)}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{formatTHB(calc.monthly)}</td>
                    <td className={cn("px-2 py-1.5 text-right font-mono font-semibold", calc.monthly < consolidation.totalMonthly ? "text-green-600" : "text-red-600")}>
                      {calc.monthly < consolidation.totalMonthly ? "−" : "+"}{formatTHB(Math.abs(consolidation.totalMonthly - calc.monthly))}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-2 py-1.5">{t('comparePayoff')}</td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {consolidation.beforeMaxMonths >= 9999 ? "∞" : `${consolidation.beforeMaxMonths} ${t('months')}`}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">{calc.amortization.length} {t('months')}</td>
                    <td className={cn("px-2 py-1.5 text-right font-mono font-semibold", calc.amortization.length < consolidation.beforeMaxMonths ? "text-green-600" : "text-red-600")}>
                      {calc.amortization.length < consolidation.beforeMaxMonths ? "−" : "+"}{Math.abs(calc.amortization.length - Math.min(consolidation.beforeMaxMonths, 600))} {t('months')}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5">{t('compareInterest')}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{formatTHB(consolidation.beforeTotalInterest)}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{formatTHB(calc.totalInterest)}</td>
                    <td className={cn("px-2 py-1.5 text-right font-mono font-semibold", calc.totalInterest < consolidation.beforeTotalInterest ? "text-green-600" : "text-red-600")}>
                      {calc.totalInterest < consolidation.beforeTotalInterest ? "−" : "+"}{formatTHB(Math.abs(consolidation.beforeTotalInterest - calc.totalInterest))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 rounded border bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground">
              💡 {t('compareHint')}
            </p>
          </CardContent>
        </Card>
      )}
      {/* AI advice */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Brain className="h-4 w-4 text-purple-600" />
              {t('aiAnalysisTitle')}
            </p>
            <Button size="sm" onClick={askAI} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
              {aiLoading ? t('analyzing') : aiAnalysis ? t('regenerate') : t('askAI')}
            </Button>
          </div>
          {aiError && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
              {aiError === 'no_ai_key' ? t('noAiKey') : aiError === 'ai_error' ? t('aiFailed') : aiError}
            </div>
          )}
          {aiAnalysis && (
            <div className="mt-3 rounded-lg border bg-muted/20 p-3 text-sm">
              {renderMarkdown(aiAnalysis)}
            </div>
          )}
          {!aiAnalysis && !aiError && !aiLoading && (
            <p className="mt-2 text-xs text-muted-foreground">{t('aiHint')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
