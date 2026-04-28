'use client';

import { useState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Camera, Upload, Check, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { scanReceipt, type ScanResult } from '@/app/[locale]/(app)/transactions/scan/actions';
import { createTransaction } from '@/app/[locale]/(app)/transactions/actions';
import { cn } from '@/lib/utils';

interface Account { id: string; name: string; type: string; color: string; }
interface Category { id: string; name: string; type: 'income' | 'expense' | 'both'; icon: string; color: string; }

function findCategoryId(name: string | null | undefined, categories: Category[]): string {
  if (!name) return categories[0]?.id ?? '';
  const lower = name.toLowerCase();
  // Try exact, then contains
  const exact = categories.find((c) => c.name.toLowerCase() === lower);
  if (exact) return exact.id;
  const contains = categories.find(
    (c) => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase())
  );
  return contains?.id ?? categories[0]?.id ?? '';
}

function SaveBtn() {
  const t = useTranslations('Scan');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
      {pending ? t('saving') : t('saveTransaction')}
    </Button>
  );
}

export function ReceiptScanner({
  accounts,
  categories,
}: {
  accounts: Account[];
  categories: Category[];
}) {
  const t = useTranslations('Scan');
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable fields after scan
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState('');

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setPreviewUrl(URL.createObjectURL(file));
    setScanning(true);

    try {
      const fd = new FormData();
      fd.append('image', file);
      const r = await scanReceipt(fd);
      setScanning(false);

      if (!r.ok) {
        setError(r.error ?? 'unknown');
        return;
      }
      setResult(r);
      // Pre-fill editable form
      setType(r.type === 'income' ? 'income' : 'expense');
      if (r.total != null) setAmount(String(r.total));
      if (r.date) setDate(r.date);
      const noteText = [r.merchant, r.note].filter(Boolean).join(' — ');
      setNote(noteText);
      const filteredCats = categories.filter((c) => c.type === (r.type ?? 'expense') || c.type === 'both');
      setCategoryId(findCategoryId(r.category, filteredCats));
    } catch (e) {
      setScanning(false);
      setError('upload_failed');
    }
  }

  function reset() {
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setAmount('');
    setNote('');
    setCategoryId('');
    if (fileRef.current) fileRef.current.value = '';
  }

  const filteredCategories = categories.filter((c) => c.type === type || c.type === 'both');

  return (
    <div className="space-y-4">
      {!previewUrl ? (
        <div className="space-y-3">
          <div className="rounded-xl border-2 border-dashed bg-muted/30 p-8 text-center">
            <Camera className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-semibold">{t('uploadPrompt')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('uploadHint')}</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="hidden"
            />
            <div className="mt-4 flex justify-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.removeAttribute('capture');
                    fileRef.current.click();
                  }
                }}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                {t('chooseFile')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.setAttribute('capture', 'environment');
                    fileRef.current.click();
                  }
                }}
              >
                <Camera className="mr-1.5 h-4 w-4" />
                {t('takePhoto')}
              </Button>
            </div>
          </div>
          <p className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            ℹ️ {t('aiNeeded')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="receipt" className="max-h-72 w-full rounded-xl border object-contain bg-muted/20" />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={reset}
              className="absolute right-2 top-2"
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              {t('rescan')}
            </Button>
          </div>

          {scanning && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {t('analyzing')}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {t(`error_${error}`)}
            </div>
          )}

          {result?.ok && (
            <form action={createTransaction} className="space-y-4">
              <p className="rounded-lg border border-green-300 bg-green-50 p-2.5 text-xs text-green-800">
                ✓ {t('extracted')} — {t('reviewBeforeSave')}
              </p>

              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="account_id" value={accountId} />
              <input type="hidden" name="category_id" value={categoryId} />

              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/40 p-1">
                {(['expense', 'income'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setType(tab)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-sm font-medium',
                      type === tab
                        ? tab === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        : 'text-muted-foreground'
                    )}
                  >
                    {tab === 'income' ? t('income') : t('expense')}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label>{t('amount')}</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">฿</span>
                  <Input
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 text-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('category')}</Label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {filteredCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all',
                        categoryId === cat.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background hover:border-primary/40'
                      )}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-[10px] font-medium leading-tight">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('account')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setAccountId(acc.id)}
                      className={cn(
                        'rounded-lg border-2 px-3 py-2 text-left transition-all',
                        accountId === acc.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background hover:border-primary/40'
                      )}
                    >
                      <span className="text-sm font-medium truncate">{acc.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('date')}</Label>
                <Input
                  name="date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('note')}</Label>
                <Input
                  name="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                />
              </div>

              <SaveBtn />
            </form>
          )}
        </div>
      )}
    </div>
  );
}
