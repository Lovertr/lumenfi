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

export function LoanSimulator({ context }: { context: LoanContext }) {
  const t = useTranslations('Loan');

  const [amount, setAmount] = useState('500000');
  const [rate, setRate] = useState('6.5');
  const [years, setYears] = useState('5');
  const [reason, setReason] = useState('');
  const [income, setIncome] = useState(String(context.monthly_income || 30000));
  const [fixedExp, setFixedExp] = useState(String(context.monthly_fixed_expenses || 10000));

  const [rateType, setRateType] = useState<RateType>('reducing');
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

  const calc = useMemo(() => {
    const A = parseFloat(amount.replace(/,/g, '')) || 0;
    const R = parseFloat(rate) || 0;
    const N = (parseFloat(years) || 0) * 12;
    const I = parseFloat(income.replace(/,/g, '')) || 1;
    const E = parseFloat(fixedExp.replace(/,/g, '')) || 0;
    const existingDebt = context.existing_debt_payments;

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
  }, [amount, rate, years, rateType, steps, income, fixedExp, context.existing_debt_payments]);

  async function askAI() {
    setAiLoading(true); setAiError(null); setAiAnalysis(null);
    const r = await analyzeLoanFeasibility({
      loan_amount: parseFloat(amount.replace(/,/g, '')) || 0,
      loan_rate: parseFloat(rate) || 0,
      loan_months: (parseFloat(years) || 0) * 12,
      monthly_payment: Math.round(calc.monthly),
      monthly_income: parseFloat(income.replace(/,/g, '')) || 0,
      monthly_fixed_expenses: parseFloat(fixedExp.replace(/,/g, '')) || 0,
      existing_debt_payments: context.existing_debt_payments,
      total_debt: context.total_debt,
      reason,
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
