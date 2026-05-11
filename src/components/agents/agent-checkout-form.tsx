'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkoutAgentPlan } from '@/app/[locale]/(app)/agents/billing/actions';

declare global {
  interface Window {
    Omise: any;
  }
}

const OMISE_PUBLIC_KEY = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY ?? '';

interface Props {
  plan: 'starter' | 'pro' | 'team';
  cycle: 'monthly' | 'annual';
  amountThb: number;
  planName: string;
}

export function AgentCheckoutForm({ plan, cycle, amountThb, planName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [omiseReady, setOmiseReady] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Omise) {
      window.Omise.setPublicKey(OMISE_PUBLIC_KEY);
      setOmiseReady(true);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.omise.co/omise.js';
    s.async = true;
    s.onload = () => {
      window.Omise.setPublicKey(OMISE_PUBLIC_KEY);
      setOmiseReady(true);
    };
    document.body.appendChild(s);
  }, []);

  async function handleSubmit() {
    if (!omiseReady) {
      setError('กำลังโหลดระบบชำระเงิน รอสักครู่');
      return;
    }
    if (!cardName || !cardNumber || !cardExpiry || !cardCVV) {
      setError('กรุณากรอกข้อมูลบัตรให้ครบ');
      return;
    }
    const [mm, yy] = cardExpiry.split('/');
    if (!mm || !yy) {
      setError('วันหมดอายุไม่ถูกต้อง (MM/YY)');
      return;
    }

    setError(null);

    const tokenize = (): Promise<string> =>
      new Promise((resolve, reject) => {
        window.Omise.createToken(
          'card',
          {
            name: cardName,
            number: cardNumber.replace(/\s/g, ''),
            expiration_month: mm.trim(),
            expiration_year: '20' + yy.trim(),
            security_code: cardCVV,
          },
          (statusCode: number, response: any) => {
            if (statusCode === 200 && response.id) resolve(response.id);
            else reject(new Error(response.message ?? 'tokenization_failed'));
          }
        );
      });

    let token: string;
    try {
      token = await tokenize();
    } catch (e: any) {
      setError('บัตรไม่ถูกต้อง: ' + (e.message ?? 'unknown'));
      return;
    }

    startTransition(async () => {
      try {
        const r = await checkoutAgentPlan({
          plan,
          cycle,
          paymentMethod: 'card',
          cardToken: token,
        });
        if (!r.ok) {
          setError(r.error ?? 'เกิดข้อผิดพลาด');
          return;
        }
        if (r.authorizeUri) {
          window.location.href = r.authorizeUri;
          return;
        }
        if (r.success && r.redirectUrl) {
          router.push(r.redirectUrl);
          return;
        }
      } catch (e: any) {
        setError(e.message ?? 'เกิดข้อผิดพลาด');
      }
    });
  }

  function formatCardNumber(v: string) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <p className="text-muted-foreground">แพ็คเกจ</p>
        <p className="mt-0.5 text-lg font-bold">{planName} ({cycle === 'annual' ? 'รายปี' : 'รายเดือน'})</p>
        <p className="mt-2 text-2xl font-bold">฿{amountThb.toLocaleString('th-TH')}</p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="card_name">ชื่อบนบัตร</Label>
          <Input
            id="card_name"
            placeholder="THANEE TINTANEE"
            value={cardName}
            onChange={(e) => setCardName(e.target.value.toUpperCase())}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="card_number">เลขบัตร</Label>
          <Input
            id="card_number"
            inputMode="numeric"
            placeholder="4242 4242 4242 4242"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            maxLength={19}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="card_expiry">หมดอายุ (MM/YY)</Label>
            <Input
              id="card_expiry"
              inputMode="numeric"
              placeholder="12/29"
              value={cardExpiry}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                if (v.length >= 2) setCardExpiry(v.slice(0, 2) + '/' + v.slice(2));
                else setCardExpiry(v);
              }}
              maxLength={5}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="card_cvv">CVV</Label>
            <Input
              id="card_cvv"
              inputMode="numeric"
              placeholder="123"
              value={cardCVV}
              onChange={(e) => setCardCVV(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        disabled={pending || !omiseReady}
      >
        {pending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังตัดบัตร...</>
        ) : (
          <><CreditCard className="mr-2 h-4 w-4" /> ชำระเงิน ฿{amountThb.toLocaleString('th-TH')}</>
        )}
      </Button>

      <p className="text-center text-[11px] text-muted-foreground">
        🔒 ปลอดภัยด้วย Omise · ข้อมูลบัตรไม่ผ่านเซิร์ฟเวอร์เรา
      </p>
    </div>
  );
}
