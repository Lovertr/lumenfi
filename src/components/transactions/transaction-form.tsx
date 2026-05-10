'use client';

import { useState, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTransaction, updateTransaction } from '@/app/[locale]/(app)/transactions/actions';
import { scanReceipt, type ScanResult } from '@/app/[locale]/(app)/transactions/scan/actions';
import { cn } from '@/lib/utils';
import {
  TrendingDown, TrendingUp, ArrowLeftRight, Repeat, Target, ArrowDown, Bell, Camera, Upload, Loader2, Trash2, CreditCard, Layers,
} from 'lucide-react';

interface Account {
  id: string;
  name: string;
  type: string;
  color: string;
  account_number?: string | null;
}
interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  icon: string;
  color: string;
}
interface Goal {
  id: string;
  name: string;
  icon: string | null;
}
interface Debt {
  id: string;
  name: string;
  current_balance: number;
  interest_rate: number;
  monthly_payment: number | null;
  type: string;
}

type Type = 'expense' | 'income' | 'transfer';
type State = { error?: string } | null;

function SubmitBtn() {
  const t = useTranslations('Transactions.form');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? t('submitting') : t('submit')}
    </Button>
  );
}

function AccountPicker({
  accounts,
  value,
  onChange,
  excludeId,
}: {
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
  excludeId?: string;
}) {
  const list = excludeId ? accounts.filter((a) => a.id !== excludeId) : accounts;
  return (
    <div className="grid grid-cols-2 gap-2">
      {list.map((acc) => {
        const active = value === acc.id;
        return (
          <button
            key={acc.id}
            type="button"
            onClick={() => onChange(acc.id)}
            className={cn(
              'rounded-lg border-2 px-3 py-2.5 text-left transition-all',
              active
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background hover:border-primary/40'
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: acc.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{acc.name}</div>
                {acc.account_number && (
                  <div className="truncate text-[10px] text-muted-foreground">{acc.account_number}</div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface TransactionDefaults {
  id?: string;
  type?: Type;
  amount?: number | string;
  account_id?: string;
  to_account_id?: string | null;
  category_id?: string | null;
  goal_id?: string | null;
  debt_id?: string | null;
  date?: string;
  note?: string | null;
}

// Normalize account number for matching: strip non-digits
function normalizeAcctNum(s: string | null | undefined): string {
  if (!s) return '';
  return String(s).replace(/[^0-9]/g, '');
}

// Extract last N consecutive digit groups (handles "xxx-x-x1234-5" → "12345")
// Thai bank slips often mask early digits — we focus on visible trailing digits
function extractVisibleDigits(s: string | null | undefined): string {
  if (!s) return '';
  // Get only the digits (skip x, *, -, etc.)
  return String(s).replace(/[^0-9]/g, '');
}

// Find best account match by detected number from OCR
function matchAccountByNumber(accounts: Account[], detected: string | null | undefined): Account | undefined {
  const d = extractVisibleDigits(detected);
  if (!d || d.length < 3) return undefined;

  // Exact match first
  let best = accounts.find((a) => extractVisibleDigits(a.account_number) === d);
  if (best) return best;

  // Suffix match — common case: slip shows "xxx-x-x1234-5" (digits "12345"),
  // user stored "123-4-56789-0" (digits "1234567890") → check if digits end the same
  // Or last-4 of credit card: detected="1234", stored last4="1234"
  best = accounts.find((a) => {
    const an = extractVisibleDigits(a.account_number);
    if (!an) return false;
    if (an.length < 3) return false;
    // Last 4 digits comparison (most common useful match)
    const detectedLast4 = d.slice(-4);
    const storedLast4 = an.slice(-4);
    if (detectedLast4 === storedLast4 && detectedLast4.length === 4) return true;
    // Either ends with the other (handles different formats)
    return an.endsWith(d) || d.endsWith(an);
  });
  if (best) return best;

  // Substring match (less reliable, last resort)
  best = accounts.find((a) => {
    const an = extractVisibleDigits(a.account_number);
    if (!an || an.length < 4) return false;
    return an.includes(d) || d.includes(an);
  });
  return best;
}

export function TransactionForm({
  accounts,
  categories,
  goals = [],
  debts = [],
  mode = 'create',
  defaults,
}: {
  accounts: Account[];
  categories: Category[];
  goals?: Goal[];
  debts?: Debt[];
  mode?: 'create' | 'edit';
  defaults?: TransactionDefaults;
}) {
  const t = useTranslations('Transactions');
  const tForm = useTranslations('Transactions.form');
  const tErr = useTranslations('Transactions.errors');
  const action_fn = mode === 'edit' ? updateTransaction : createTransaction;
  const [state, action] = useFormState<State, FormData>(action_fn, null);

  const [type, setType] = useState<Type>(defaults?.type ?? 'expense');
  const [accountId, setAccountId] = useState(defaults?.account_id ?? accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(defaults?.to_account_id ?? accounts[1]?.id ?? '');
  const [categoryId, setCategoryId] = useState(defaults?.category_id ?? '');
  const [isRecurring, setIsRecurring] = useState(false);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [goalId, setGoalId] = useState(defaults?.goal_id ?? '');
  const [debtId, setDebtId] = useState(defaults?.debt_id ?? '');
  const [installmentEnabled, setInstallmentEnabled] = useState(false);
  const [installmentMonths, setInstallmentMonths] = useState(6);
  const [installmentRate, setInstallmentRate] = useState(0);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [notifyDays, setNotifyDays] = useState(1);

  // Scan state (for new mode only)
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanInfo, setScanInfo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleScanFile(file: File) {
    setScanError(null);
    setScanInfo(null);
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const r = await scanReceipt(fd);
      setScanning(false);
      if (!r.ok) {
        setScanError(r.error ?? 'unknown');
        return;
      }
      if (r.type === 'income' || r.type === 'expense') setType(r.type);
      if (r.total != null) {
        const input = document.getElementById('amount') as HTMLInputElement | null;
        if (input) input.value = String(r.total);
      }
      if (r.date) {
        const input = document.getElementById('date') as HTMLInputElement | null;
        if (input) input.value = r.date;
      }
      if (r.category) {
        const lower = r.category.toLowerCase();
        const matchedCat = categories.find((c) =>
          c.name.toLowerCase() === lower ||
          c.name.toLowerCase().includes(lower) ||
          lower.includes(c.name.toLowerCase())
        );
        if (matchedCat) setCategoryId(matchedCat.id);
      }
      if (r.merchant || r.note) {
        const noteInput = document.getElementById('note') as HTMLInputElement | null;
        if (noteInput) noteInput.value = [r.merchant, r.note].filter(Boolean).join(' — ');
      }
      // Match by account number from receipt/slip
      if (r.account_number) {
        const match = matchAccountByNumber(accounts, r.account_number);
        if (match) {
          setAccountId(match.id);
          setScanInfo(`✓ ${match.name} (${r.account_number})`);
        } else {
          setScanInfo(`เลขบัญชีในใบเสร็จ: ${r.account_number} — ไม่ตรงบัญชีไหน`);
        }
      }
    } catch (e) {
      setScanning(false);
      setScanError('upload_failed');
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const filteredCategories = categories.filter(
    (c) => c.type === type || c.type === 'both'
  );
  const isTransfer = type === 'transfer';

  const selectedCat = categories.find((c) => c.id === categoryId);
  const isDebtPaymentCat =
    !!selectedCat &&
    (selectedCat.name.includes('ชำระหนี้') ||
      selectedCat.name.toLowerCase().includes('debt'));
  const showDebtPicker = type === 'expense' && isDebtPaymentCat && debts.length > 0;

  // Credit card installment toggle — only when paying via credit card account
  // and not already a debt payment
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isCreditCard = selectedAccount?.type === 'credit_card';
  const showInstallmentToggle =
    type === 'expense' && isCreditCard && !isDebtPaymentCat;

  // Calculate installment preview — read amount via DOM (ref is declared later)
  function getCurrentAmount(): number {
    const el = typeof document !== 'undefined'
      ? (document.getElementById('amount') as HTMLInputElement | null)
      : null;
    const v = el?.value ?? '';
    const n = parseFloat(v.replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function calcMonthlyPayment(): number {
    const amt = getCurrentAmount();
    const m = installmentMonths;
    const r = installmentRate;
    if (amt <= 0 || m < 2) return 0;
    if (r <= 0) return amt / m;
    const mr = r / 100 / 12;
    return (amt * mr) / (1 - Math.pow(1 + mr, -m));
  }
  const selectedDebt = debts.find((d) => d.id === debtId);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [paymentPreview, setPaymentPreview] = useState<{ principal: number; interest: number } | null>(null);

  function recalcPreview(amountStr: string) {
    if (!selectedDebt) {
      setPaymentPreview(null);
      return;
    }
    const amt = parseFloat((amountStr || '0').replace(/,/g, ''));
    if (isNaN(amt) || amt <= 0) {
      setPaymentPreview(null);
      return;
    }
    const monthlyRate = (Number(selectedDebt.interest_rate) || 0) / 100 / 12;
    const interest = Math.min(
      amt,
      Math.max(0, Number(selectedDebt.current_balance) || 0) * monthlyRate
    );
    const principal = Math.max(0, amt - interest);
    setPaymentPreview({
      principal: Math.round(principal * 100) / 100,
      interest: Math.round(interest * 100) / 100,
    });
  }

  if (isTransfer && toAccountId === accountId) {
    const alt = accounts.find((a) => a.id !== accountId);
    if (alt && alt.id !== toAccountId) {
      setToAccountId(alt.id);
    }
  }

  return (
    <form action={action} className="space-y-5">
      {mode === 'edit' && defaults?.id && (
        <input type="hidden" name="id" value={defaults.id} />
      )}
      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-3 gap-2 rounded-xl border bg-muted/40 p-1">
        {([
          { v: 'expense', label: t('expense'), icon: TrendingDown, color: 'text-red-600 bg-red-50' },
          { v: 'income', label: t('income'), icon: TrendingUp, color: 'text-green-600 bg-green-50' },
          { v: 'transfer', label: t('transfer'), icon: ArrowLeftRight, color: 'text-blue-600 bg-blue-50' },
        ] as const).map((tab) => {
          const Icon = tab.icon;
          const active = type === tab.v;
          return (
            <button
              key={tab.v}
              type="button"
              onClick={() => setType(tab.v)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? `${tab.color} shadow-sm` : 'text-muted-foreground hover:bg-background'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {mode === 'create' && (
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleScanFile(f);
              if (e.target) e.target.value = '';
            }}
            className="hidden"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-dashed"
              disabled={scanning}
              onClick={() => {
                if (fileRef.current) {
                  fileRef.current.removeAttribute('capture');
                  fileRef.current.click();
                }
              }}
            >
              {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {tForm('scanUpload')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-dashed"
              disabled={scanning}
              onClick={() => {
                if (fileRef.current) {
                  fileRef.current.setAttribute('capture', 'environment');
                  fileRef.current.click();
                }
              }}
            >
              {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
              {tForm('scanCamera')}
            </Button>
          </div>
          {scanning && (
            <p className="text-center text-xs text-muted-foreground">{tForm('scanning')}</p>
          )}
          {scanInfo && !scanning && (
            <p className="text-xs text-muted-foreground">{scanInfo}</p>
          )}
          {scanError && (
            <p className="text-xs text-destructive">
              {scanError === 'no_ai_key' ? tForm('scanNoAiKey') :
               scanError === 'ai_no_data' ? tForm('scanNoData') :
               scanError === 'invalid_api_key' ? tForm('scanInvalidKey') :
               scanError === 'rate_limited' ? tForm('scanRateLimit') :
               scanError === 'ai_provider_down' ? tForm('scanProviderDown') :
               scanError === 'ai_bad_response' ? tForm('scanBadResponse') :
               scanError === 'ai_error' ? tForm('scanFailed') :
               scanError === 'image_too_large' ? 'รูปใหญ่เกินไป (เกิน 10MB)' :
               scanError === 'no_image' ? 'กรุณาเลือกรูป' :
               tForm('scanFailed')}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="amount">{tForm('amount')}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
            ฿
          </span>
          <Input
            id="amount"
            name="amount"
            type="text"
            inputMode="decimal"
            required
            autoFocus
            defaultValue={defaults?.amount != null ? String(defaults.amount) : ''}
            placeholder="0.00"
            className="pl-8 text-xl font-bold"
            onChange={(e) => recalcPreview(e.target.value)}
            ref={amountInputRef}
          />
        </div>
      </div>

      {!isTransfer && (
        <div className="space-y-2">
          <Label>{tForm('category')}</Label>
          <input type="hidden" name="category_id" value={categoryId} />
          {filteredCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tErr('no_categories')}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {filteredCategories.map((cat) => {
                const active = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 transition-all',
                      active
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background hover:border-primary/40'
                    )}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-xs font-medium leading-tight">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tErr('no_accounts')}</p>
      ) : isTransfer ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {tForm('fromAccount')}
            </Label>
            <input type="hidden" name="account_id" value={accountId} />
            <AccountPicker
              accounts={accounts}
              value={accountId}
              onChange={setAccountId}
              excludeId={toAccountId}
            />
          </div>
          <div className="flex justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-muted/50">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {tForm('toAccount')}
            </Label>
            <input type="hidden" name="to_account_id" value={toAccountId} />
            <AccountPicker
              accounts={accounts}
              value={toAccountId}
              onChange={setToAccountId}
              excludeId={accountId}
            />
          </div>
          {accounts.length < 2 && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {tErr('transfer_need_two_accounts')}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label>{tForm('account')}</Label>
          <input type="hidden" name="account_id" value={accountId} />
          <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="date">{tForm('date')}</Label>
        <Input id="date" name="date" type="date" defaultValue={defaults?.date ?? today} required />
      </div>

      {goals.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Target className="h-4 w-4 text-primary" />
            {tForm('linkGoal')}
          </Label>
          <input type="hidden" name="goal_id" value={goalId} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setGoalId('')}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                !goalId ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:bg-muted/40'
              )}
            >
              {tForm('noGoal')}
            </button>
            {goals.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoalId(g.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  goalId === g.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:bg-muted/40'
                )}
              >
                {g.icon && <span>{g.icon}</span>}
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {showDebtPicker && (
        <div className="space-y-2 rounded-lg border-2 border-rose-200 bg-rose-50/40 p-3 dark:border-rose-800/40 dark:bg-rose-950/20">
          <Label className="flex items-center gap-1.5 text-rose-900 dark:text-rose-200">
            <CreditCard className="h-4 w-4" />
            ชำระหนี้รายการไหน?
          </Label>
          <input type="hidden" name="debt_id" value={debtId} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setDebtId('');
                setPaymentPreview(null);
              }}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                !debtId
                  ? 'border-rose-500 bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-100'
                  : 'border-border bg-background hover:bg-muted/40'
              )}
            >
              ไม่ผูกหนี้
            </button>
            {debts.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setDebtId(d.id);
                  recalcPreview(amountInputRef.current?.value ?? '');
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  debtId === d.id
                    ? 'border-rose-500 bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-100'
                    : 'border-border bg-background hover:bg-muted/40'
                )}
              >
                <CreditCard className="h-3 w-3" />
                {d.name}
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ฿{Number(d.current_balance).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
          {selectedDebt && paymentPreview && (
            <div className="mt-2 rounded-md bg-background/60 p-3 text-xs">
              <p className="font-semibold text-rose-900 dark:text-rose-200">
                💡 แยกชำระอัตโนมัติ ({selectedDebt.interest_rate}% ต่อปี)
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded bg-emerald-50 p-2 dark:bg-emerald-950/30">
                  <p className="text-[10px] text-muted-foreground">ลดต้น</p>
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">
                    ฿{paymentPreview.principal.toLocaleString()}
                  </p>
                </div>
                <div className="rounded bg-amber-50 p-2 dark:bg-amber-950/30">
                  <p className="text-[10px] text-muted-foreground">ดอกเบี้ย</p>
                  <p className="font-bold text-amber-700 dark:text-amber-300">
                    ฿{paymentPreview.interest.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                คงเหลือหลังชำระ: ฿{Math.max(0, Number(selectedDebt.current_balance) - paymentPreview.principal).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}

      {showInstallmentToggle && (
        <div className="space-y-3 rounded-lg border-2 border-blue-200 bg-blue-50/40 p-3 dark:border-blue-800/40 dark:bg-blue-950/20">
          <label className="flex items-center justify-between gap-2 text-sm font-medium text-blue-900 dark:text-blue-200">
            <span className="flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              แบ่งผ่อนชำระบัตรเครดิต
            </span>
            <input
              type="checkbox"
              checked={installmentEnabled}
              onChange={(e) => setInstallmentEnabled(e.target.checked)}
              className="h-4 w-4 rounded"
            />
          </label>
          {installmentEnabled && (
            <>
              <input type="hidden" name="installment_months" value={installmentMonths} />
              <input type="hidden" name="installment_rate" value={installmentRate} />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">จำนวนงวด</Label>
                  <select
                    value={installmentMonths}
                    onChange={(e) => setInstallmentMonths(parseInt(e.target.value, 10))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {[3, 4, 6, 9, 10, 12, 18, 24, 36, 48].map((m) => (
                      <option key={m} value={m}>{m} เดือน</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">อัตราดอกเบี้ย (% ต่อปี)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="30"
                    value={installmentRate}
                    onChange={(e) => setInstallmentRate(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
              {getCurrentAmount() > 0 && (
                <div className="rounded-md bg-background/60 p-3 text-xs">
                  <p className="font-semibold text-blue-900 dark:text-blue-200">
                    💳 จะสร้างหนี้ผ่อนชำระอัตโนมัติ
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">ค่างวด/เดือน</p>
                      <p className="font-bold">฿{Math.round(calcMonthlyPayment()).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">ยอดรวม {installmentMonths} งวด</p>
                      <p className="font-bold">฿{Math.round(calcMonthlyPayment() * installmentMonths).toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    หลังบันทึก ระบบจะสร้างหนี้ใน /debts ผูกกับบัตรนี้ — แต่ละเดือนเลือก category &quot;ชำระหนี้&quot; เพื่อบันทึกการจ่ายงวด
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="note">{tForm('note')}</Label>
        <Input id="note" name="note" defaultValue={defaults?.note ?? ''} placeholder={tForm('notePlaceholder')} maxLength={500} />
      </div>

      {mode === 'create' && (
      <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
        <label className="flex cursor-pointer items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Repeat className="h-4 w-4 text-primary" />
            {tForm('saveAsRecurring')}
          </span>
          <input
            type="checkbox"
            name="is_recurring"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-5 w-5 rounded border-input accent-primary"
          />
        </label>
        {isRecurring && (
          <div className="space-y-3 pt-1">
            <div className="space-y-2">
              <Label htmlFor="day_of_month" className="text-xs">
                {tForm('dayOfMonth')}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{tForm('everyMonthOn')}</span>
                <Input
                  id="day_of_month"
                  name="day_of_month"
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="h-9 w-20 text-center"
                />
                <span className="text-xs text-muted-foreground">{tForm('ofEachMonth')}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{tForm('recurringHint')}</p>
            </div>

            <div className="space-y-2 rounded-lg border bg-background p-3">
              <label className="flex cursor-pointer items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Bell className="h-4 w-4 text-amber-600" />
                  {tForm('notifyMe')}
                </span>
                <input
                  type="checkbox"
                  name="notify_enabled"
                  checked={notifyEnabled}
                  onChange={(e) => setNotifyEnabled(e.target.checked)}
                  className="h-5 w-5 rounded border-input accent-primary"
                />
              </label>
              {notifyEnabled && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">{tForm('notifyDaysBefore')}</span>
                  <Input
                    name="notify_days_before"
                    type="number"
                    min={0}
                    max={14}
                    value={notifyDays}
                    onChange={(e) => setNotifyDays(Math.min(14, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="h-9 w-16 text-center"
                  />
                  <span className="text-xs text-muted-foreground">{tForm('daysBeforeUnit')}</span>
                </div>
              )}
              {notifyEnabled && (
                <p className="text-[11px] text-muted-foreground">{tForm('notifyHint')}</p>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {state?.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {tErr(state.error)}
        </div>
      )}

      <SubmitBtn />
    </form>
  );
}
