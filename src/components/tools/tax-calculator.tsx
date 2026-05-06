'use client';

import { useState, useMemo } from 'react';
import { InsuranceTaxCTA } from './insurance-tax-cta';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, TrendingDown, Lightbulb } from 'lucide-react';
import { formatTHB } from '@/lib/utils';

// Thai Personal Income Tax brackets (2026)
const BRACKETS = [
  { up_to: 150_000, rate: 0 },
  { up_to: 300_000, rate: 0.05 },
  { up_to: 500_000, rate: 0.10 },
  { up_to: 750_000, rate: 0.15 },
  { up_to: 1_000_000, rate: 0.20 },
  { up_to: 2_000_000, rate: 0.25 },
  { up_to: 5_000_000, rate: 0.30 },
  { up_to: Infinity, rate: 0.35 },
];

function calcTax(taxable: number): number {
  let tax = 0;
  let prev = 0;
  for (const b of BRACKETS) {
    if (taxable <= prev) break;
    const slice = Math.min(taxable, b.up_to) - prev;
    tax += slice * b.rate;
    prev = b.up_to;
    if (taxable <= b.up_to) break;
  }
  return tax;
}

function clampNum(v: string, max?: number): number {
  const n = parseFloat(v.replace(/,/g, ''));
  if (isNaN(n) || n < 0) return 0;
  return max !== undefined ? Math.min(n, max) : n;
}

export function TaxCalculator() {
  const t = useTranslations('Tax');

  const [annualIncome, setAnnualIncome] = useState('600000');
  const [expenseDeduct, setExpenseDeduct] = useState('100000'); // 50% of income up to 100K
  const [personalAllow] = useState(60000);
  const [spouseAllow, setSpouseAllow] = useState('0');
  const [childAllow, setChildAllow] = useState('0');
  const [parentAllow, setParentAllow] = useState('0');
  const [healthInsurance, setHealthInsurance] = useState('0');
  const [lifeInsurance, setLifeInsurance] = useState('0');
  const [annuityInsurance, setAnnuityInsurance] = useState('0');
  const [homeLoanInterest, setHomeLoanInterest] = useState('0');
  const [pvd, setPvd] = useState('0');
  const [rmf, setRmf] = useState('0');
  const [ssf, setSsf] = useState('0');
  const [donation, setDonation] = useState('0');
  const [easyEReceipt, setEasyEReceipt] = useState('0');
  const [socialSec, setSocialSec] = useState('9000');

  const result = useMemo(() => {
    const income = clampNum(annualIncome);
    const expense = Math.min(clampNum(expenseDeduct), income * 0.5, 100000);
    const personalAllowance =
      personalAllow +
      clampNum(spouseAllow, 60000) +
      clampNum(childAllow) +
      clampNum(parentAllow, 60000) +
      Math.min(clampNum(healthInsurance), 25000) +
      Math.min(clampNum(lifeInsurance), 100000) +
      Math.min(clampNum(annuityInsurance), 200000) +
      Math.min(clampNum(homeLoanInterest), 100000) +
      Math.min(clampNum(pvd), income * 0.15) +
      Math.min(clampNum(rmf), income * 0.30, 500000) +
      Math.min(clampNum(ssf), income * 0.30, 200000) +
      Math.min(clampNum(donation), income * 0.10) +
      Math.min(clampNum(easyEReceipt), 50000) +
      Math.min(clampNum(socialSec), 9000);

    const taxable = Math.max(0, income - expense - personalAllowance);
    const tax = calcTax(taxable);
    const effectiveRate = income > 0 ? (tax / income) * 100 : 0;

    // Suggestions
    const remainingRMF = Math.max(0, Math.min(income * 0.30, 500000) - clampNum(rmf));
    const remainingSSF = Math.max(0, Math.min(income * 0.30, 200000) - clampNum(ssf));
    const additionalIfMaxRMF = calcTax(taxable) - calcTax(Math.max(0, taxable - remainingRMF));
    const additionalIfMaxSSF = calcTax(taxable) - calcTax(Math.max(0, taxable - remainingSSF));

    // Marginal rate based on taxable income brackets
    const marginalRate =
      taxable <= 150000 ? 0 :
      taxable <= 300000 ? 0.05 :
      taxable <= 500000 ? 0.10 :
      taxable <= 750000 ? 0.15 :
      taxable <= 1000000 ? 0.20 :
      taxable <= 2000000 ? 0.25 :
      taxable <= 5000000 ? 0.30 : 0.35;

    return {
      income,
      expense,
      personalAllowance,
      taxable,
      tax,
      effectiveRate,
      marginalRate,
      usedLifeDeduction: Math.min(clampNum(lifeInsurance), 100000) + Math.min(clampNum(annuityInsurance), 200000),
      usedHealthDeduction: Math.min(clampNum(healthInsurance), 25000),
      remainingRMF,
      remainingSSF,
      saveIfMaxRMF: additionalIfMaxRMF,
      saveIfMaxSSF: additionalIfMaxSSF,
    };
  }, [annualIncome, expenseDeduct, personalAllow, spouseAllow, childAllow, parentAllow, healthInsurance, lifeInsurance, annuityInsurance, homeLoanInterest, pvd, rmf, ssf, donation, easyEReceipt, socialSec]);

  function NumInput({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{label}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">฿</span>
          <Input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 pl-6 text-sm"
          />
        </div>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-1 text-sm font-semibold">
            <Calculator className="h-4 w-4 text-primary" />
            {t('income')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumInput label={t('annualIncome')} value={annualIncome} onChange={setAnnualIncome} />
            <NumInput label={t('expenseDeduct')} value={expenseDeduct} onChange={setExpenseDeduct} hint={t('expenseHint')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 text-sm font-semibold">{t('allowances')}</div>
          <div className="grid grid-cols-2 gap-3">
            <NumInput label={`${t('personal')} (฿60K ${t('locked')})`} value="60000" onChange={() => {}} />
            <NumInput label={t('spouse')} value={spouseAllow} onChange={setSpouseAllow} />
            <NumInput label={t('child')} value={childAllow} onChange={setChildAllow} />
            <NumInput label={t('parent')} value={parentAllow} onChange={setParentAllow} />
            <NumInput label={t('socialSec')} value={socialSec} onChange={setSocialSec} hint="≤ ฿9K" />
            <NumInput label={t('homeLoanInterest')} value={homeLoanInterest} onChange={setHomeLoanInterest} hint="≤ ฿100K" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 text-sm font-semibold">{t('insurance')}</div>
          <div className="grid grid-cols-2 gap-3">
            <NumInput label={t('healthIns')} value={healthInsurance} onChange={setHealthInsurance} hint="≤ ฿25K" />
            <NumInput label={t('lifeIns')} value={lifeInsurance} onChange={setLifeInsurance} hint="≤ ฿100K" />
            <NumInput label={t('annuityIns')} value={annuityInsurance} onChange={setAnnuityInsurance} hint="≤ ฿200K" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 text-sm font-semibold">{t('investments')}</div>
          <div className="grid grid-cols-2 gap-3">
            <NumInput label="PVD" value={pvd} onChange={setPvd} hint="≤ 15%" />
            <NumInput label="RMF" value={rmf} onChange={setRmf} hint="≤ 30%, ≤ ฿500K" />
            <NumInput label="SSF" value={ssf} onChange={setSsf} hint="≤ 30%, ≤ ฿200K" />
            <NumInput label={t('donation')} value={donation} onChange={setDonation} hint="≤ 10%" />
            <NumInput label="Easy E-Receipt" value={easyEReceipt} onChange={setEasyEReceipt} hint="≤ ฿50K" />
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-1 text-sm font-semibold text-primary">
            <TrendingDown className="h-4 w-4" />
            {t('result')}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">{t('taxableIncome')}</p>
              <p className="font-bold">{formatTHB(result.taxable)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('totalDeductions')}</p>
              <p className="font-bold">{formatTHB(result.expense + result.personalAllowance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('taxOwed')}</p>
              <p className="text-xl font-bold text-red-600">{formatTHB(result.tax)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('effectiveRate')}</p>
              <p className="font-bold">{result.effectiveRate.toFixed(2)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      {(result.remainingRMF > 0 || result.remainingSSF > 0) && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-1 text-sm font-semibold text-amber-900">
              <Lightbulb className="h-4 w-4" />
              {t('suggestions')}
            </div>
            <div className="space-y-2 text-xs text-amber-800">
              {result.remainingRMF > 0 && result.saveIfMaxRMF > 0 && (
                <p>
                  💎 {t('rmfSuggestion', {
                    amount: formatTHB(result.remainingRMF),
                    saved: formatTHB(result.saveIfMaxRMF),
                  })}
                </p>
              )}
              {result.remainingSSF > 0 && result.saveIfMaxSSF > 0 && (
                <p>
                  ✨ {t('ssfSuggestion', {
                    amount: formatTHB(result.remainingSSF),
                    saved: formatTHB(result.saveIfMaxSSF),
                  })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <InsuranceTaxCTA
        marginalRate={result.marginalRate}
        usedLifeDeduction={result.usedLifeDeduction}
        usedHealthDeduction={result.usedHealthDeduction}
      />
    </div>
  );
}
