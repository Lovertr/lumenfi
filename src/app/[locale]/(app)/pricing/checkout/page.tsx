import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, AlertCircle, Sparkles, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { isOmiseConfigured } from '@/lib/billing/omise';
import { CheckoutForm } from '@/components/billing/checkout-form';

export const dynamic = 'force-dynamic';

const PACK_PRICES: Record<number, number> = {
  10: 79,
  50: 349,
  100: 599,
};

const SUBSCRIPTION_PRICES = {
  monthly: 149,
  yearly: 1490,
};

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; size?: string; cycle?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // If Omise isn't fully configured, fall back to test-checkout
  if (!isOmiseConfigured()) {
    const qs = new URLSearchParams(sp as any).toString();
    redirect(`/${locale}/pricing/test-checkout?${qs}`);
  }

  // Determine amount + description
  let amountThb = 0;
  let description = '';
  let summary = '';

  if (sp.type === 'subscription') {
    const cycle = (sp.cycle === 'yearly' ? 'yearly' : 'monthly') as 'monthly' | 'yearly';
    amountThb = SUBSCRIPTION_PRICES[cycle];
    description = `Lumenfi Pro ${cycle === 'yearly' ? 'รายปี' : 'รายเดือน'}`;
    summary = cycle === 'yearly' ? 'ทดลองฟรี 14 วัน · charge ฿1,490 หลังหมด trial' : 'ทดลองฟรี 14 วัน · charge ฿149 หลังหมด trial';
  } else if (sp.type === 'credits' && sp.size) {
    const size = parseInt(sp.size, 10);
    amountThb = PACK_PRICES[size] ?? 0;
    description = `Credit Pack ${size} reports`;
    summary = `${size} AI Advisor reports — ใช้เมื่อไหร่ก็ได้ ไม่หมดอายุ`;
  } else {
    redirect(`/${locale}/pricing`);
  }

  if (!amountThb) {
    redirect(`/${locale}/pricing`);
  }

  const isSubscription = sp.type === 'subscription';
  const Icon = isSubscription ? Sparkles : Zap;

  return (
    <div className="mx-auto max-w-md space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/pricing">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">ชำระเงิน</h1>
          <p className="text-xs text-muted-foreground">ผ่าน Omise · ปลอดภัย เข้ารหัส</p>
        </div>
      </header>

      {/* Order summary */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white">
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">รายการ</p>
              <p className="text-sm font-bold">{description}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">฿{amountThb.toLocaleString()}</p>
              {isSubscription && sp.cycle === 'yearly' && (
                <p className="text-[10px] text-success">ประหยัด 17%</p>
              )}
            </div>
          </div>
          <p className="mt-3 rounded-md bg-background/60 p-2 text-[11px] text-muted-foreground">
            {summary}
          </p>
        </CardContent>
      </Card>

      {/* Checkout form (client) */}
      <Card>
        <CardContent className="p-5">
          <CheckoutForm
            type={sp.type as 'subscription' | 'credits'}
            cycle={(sp.cycle as 'monthly' | 'yearly') ?? 'monthly'}
            packSize={sp.size ? parseInt(sp.size, 10) : undefined}
            amountThb={amountThb}
            description={description}
            email={user.email ?? ''}
          />
        </CardContent>
      </Card>

      {/* Trust footer */}
      <div className="rounded-lg border bg-muted/20 p-3 text-[11px] text-muted-foreground">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-medium">ปลอดภัย</p>
            <p>การชำระเงินผ่าน Omise (PCI DSS Level 1) — Lumenfi ไม่เก็บข้อมูลบัตร</p>
          </div>
        </div>
      </div>
    </div>
  );
}
