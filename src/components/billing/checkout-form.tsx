'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Loader2, CreditCard, AlertCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { processCheckout } from '@/app/[locale]/(app)/pricing/checkout/actions';

declare global {
  interface Window {
    Omise: any;
  }
}

const OMISE_PUBLIC_KEY = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY ?? '';

interface Props {
  type: 'subscription' | 'credits';
  cycle: 'monthly' | 'yearly';
  packSize?: number;
  amountThb: number;
  description: string;
  email: string;
}

export function CheckoutForm({ type, cycle, packSize, amountThb, description, email }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [omiseReady, setOmiseReady] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'promptpay'>('card');

  // Card form state
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');

  // Load Omise.js
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.Omise) {
      window.Omise.setPublicKey(OMISE_PUBLIC_KEY);
      setOmiseReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.omise.co/omise.js';
    script.async = true;
    script.onload = () => {
      if (window.Omise) {
        window.Omise.setPublicKey(OMISE_PUBLIC_KEY);
        setOmiseReady(true);
      }
    };
    document.body.appendChild(script);
  }, []);

  const handleCardSubmit = () => {
    setError(null);

    if (!omiseReady || !window.Omise) {
      setError('ระบบชำระเงินยังโหลดไม่เสร็จ — รอสักครู่');
      return;
    }

    const [expMonth, expYear] = cardExpiry.split('/').map((s) => s.trim());
    if (!expMonth || !expYear) {
      setError('รูปแบบวันหมดอายุไม่ถูกต้อง (MM/YY)');
      return;
    }

    const fullYear = expYear.length === 2 ? `20${expYear}` : expYear;

    window.Omise.createToken(
      'card',
      {
        name: cardName,
        number: cardNumber.replace(/\s/g, ''),
        expiration_month: expMonth,
        expiration_year: fullYear,
        security_code: cardCVV,
      },
      (statusCode: number, response: any) => {
        if (statusCode !== 200) {
          setError(response?.message ?? 'ข้อมูลบัตรไม่ถูกต้อง');
          return;
        }
        // Token created — submit to server
        const tokenId = response.id;
        startTransition(async () => {
          const result = await processCheckout({
            type,
            cycle,
            packSize,
            paymentMethod: 'card',
            cardToken: tokenId,
          });
          handleResult(result);
        });
      }
    );
  };

  const handlePromptpaySubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await processCheckout({
        type,
        cycle,
        packSize,
        paymentMethod: 'promptpay',
      });
      handleResult(result);
    });
  };

  const handleResult = (result: any) => {
    if (result.ok && result.authorizeUri) {
      // Redirect to Omise authorize URI (3DS or PromptPay QR)
      window.location.href = result.authorizeUri;
    } else if (result.ok && result.success) {
      // Charged successfully — go to success page
      router.push(result.redirectUrl ?? '/settings/billing');
    } else {
      setError(result.error ?? 'การชำระเงินล้มเหลว');
    }
  };

  if (!OMISE_PUBLIC_KEY) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">ระบบชำระเงินยังไม่พร้อม</p>
            <p className="mt-1">
              ต้องตั้งค่า <code>NEXT_PUBLIC_OMISE_PUBLIC_KEY</code> ใน Vercel Environment Variables
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="w-full">
          <a href="/th/pricing">กลับไปหน้าแพลน</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Method picker */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setPaymentMethod('card')}
          className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm transition-all ${
            paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-border'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span className="font-medium">บัตรเครดิต/เดบิต</span>
        </button>
        <button
          type="button"
          onClick={() => setPaymentMethod('promptpay')}
          className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm transition-all ${
            paymentMethod === 'promptpay' ? 'border-primary bg-primary/5' : 'border-border'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          <span className="font-medium">PromptPay QR</span>
        </button>
      </div>

      {paymentMethod === 'card' ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="card_name" className="text-xs">ชื่อบนบัตร</Label>
            <Input
              id="card_name"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="MR. THANABODI N"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="card_number" className="text-xs">เลขบัตร</Label>
            <Input
              id="card_number"
              inputMode="numeric"
              value={cardNumber}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                const grouped = v.match(/.{1,4}/g)?.join(' ') ?? v;
                setCardNumber(grouped);
              }}
              placeholder="4242 4242 4242 4242"
              maxLength={19}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="card_expiry" className="text-xs">วันหมดอายุ (MM/YY)</Label>
              <Input
                id="card_expiry"
                inputMode="numeric"
                value={cardExpiry}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                  if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                  setCardExpiry(v);
                }}
                placeholder="12/28"
                maxLength={5}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="card_cvv" className="text-xs">CVV</Label>
              <Input
                id="card_cvv"
                inputMode="numeric"
                type="password"
                value={cardCVV}
                onChange={(e) => setCardCVV(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                maxLength={4}
                required
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md border bg-muted/20 p-4 text-sm">
          <p className="font-medium">PromptPay</p>
          <p className="mt-1 text-xs text-muted-foreground">
            กดยืนยันแล้วระบบจะสร้าง QR Code ให้สแกนผ่านแอพธนาคาร
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        onClick={paymentMethod === 'card' ? handleCardSubmit : handlePromptpaySubmit}
        disabled={pending || !omiseReady}
        size="lg"
        className="w-full"
      >
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        ชำระ ฿{amountThb.toLocaleString()}
      </Button>

      <p className="text-center text-[10px] text-muted-foreground">
        การกดยืนยัน = ยอมรับเงื่อนไขการใช้บริการ + นโยบายความเป็นส่วนตัว
      </p>
    </div>
  );
}
