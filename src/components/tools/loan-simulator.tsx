'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator, TrendingDown, AlertTriangle, CheckCircle2, Sparkles, Loader2, Brain } from 'lucide-react';
import { formatTHB, cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/markdown';
import { analyzeLoanFeasibility } from '@/app/[locale]/(app)/tools/loan/actions';

interface LoanContext {
  monthly_income: number;
  monthly_fixed_expenses: number;
  existing_debt_payments: number;
  total_debt: number;
}

function pmt(rate: number, periods: number, principal: number): number {
  if (rate === 0) return principal / periods;
  const r = rate / 100 / 12;
  return (principal * r) / (1 - Math.pow(1 + r, -periods));
}

export function LoanSimulator({ context }: { context: LoanContext }) {
  const t = useTranslations('Loan');

  const [amount, setAmount] = useState('500000');
  const [rate, setRate] = useState('6.5');
  const [years, setYears] = useState('5');
  const [reason, setReason] = useState('');
  const [income, setIncome] = useState(String(context.monthly_income || 30000));
  const [fixedExp, setFixedExp] = useState(String(context.monthly_fixed_expenses || 10000));

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const calc = useMemo(() => {
    const A = parseFloat(amount.replace(/,/g, '')) || 0;
    const R = parseFloat(rate) || 0;
    const M = (parseFloat(years) || 0) * 12;
    const I = parseFloat(income.replace(/,/g, '')) || 1;
    const E = parseFloat(fixedExp.replace(/,/g, '')) || 0;
    const existingDebt = context.existing_debt_payments;

    const monthly = M > 0 ? pmt(R, M, A) : 0;
    const totalPaid = monthly * M;
    const totalInterest = totalPaid - A;

    const oldDTI = (existingDebt / I) * 100;
    const newDTI = ((existingDebt + monthly) / I) * 100;
    const disposableNow = I - E - existingDebt;
    const disposableAfter = disposableNow - monthly;
    const debtToIncomeAfter = newDTI;

    let verdict: 'safe' | 'caution' | 'risk' = 'safe';
    if (newDTI > 50 || disposableAfter < 0) verdict = 'risk';
    else if (newDTI > 40 || disposableAfter < I * 0.15) verdict = 'caution';

    return {
      monthly, totalPaid, totalInterest,
      oldDTI, newDTI, disposableNow, disposableAfter,
      debtToIncomeAfter, verdict,
    };
  }, [amount, rate, years, income, fixedExp, context.existing_debt_payments]);

  async function askAI() {
    setAiLoading(true);
    setAiError(null);
    setAiAnalysis(null);
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
    if (r.ok && r.advice) {
      setAiAnalysis(r.advice);
    } else {
      setAiError(r.error ?? 'unknown');
    }
  }

  const verdictConfig = {
    safe: { icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50 border-green-300', label: t('verdictSafe') },
    caution: { icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-300', label: t('verdictCaution') },
    risk: { icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-50 border-red-300', label: t('verdictRisk') },
  };
  const v = verdictConfig[calc.verdict];
  const VIcon = v.icon;

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
              <Label className="text-xs">{t('rate')}</Label>
              <Input value={rate} onChange={(e) => setRate(e.target.value)} className="h-9 text-sm" />
              <p className="mt-0.5 text-[10px] text-muted-foreground">{t('rateHint')}</p>
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
            <p className="text-muted-foreground">{t('existingDebt')}: <span className="font-semibold text-foreground">{formatTHB(context.existing_debt_payments)}/เดือน</span> · {t('totalDebt')}: <span className="font-semibold text-foreground">{formatTHB(context.total_debt)}</span></p>
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
