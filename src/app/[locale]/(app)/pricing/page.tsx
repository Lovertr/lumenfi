import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Check, Sparkles, Zap, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { CreditPackButtons } from '@/components/billing/credit-pack-buttons';
import { SubscribeButton } from '@/components/billing/subscribe-button';

export const dynamic = 'force-dynamic';

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: sub } = user
    ? await supabase
        .from('user_subscriptions')
        .select('plan_code, status, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null };

  const { data: credits } = user
    ? await supabase
        .from('ai_credits')
        .select('advisor_report_balance')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null };

  const isPro = sub?.plan_code === 'pro' && ['trial', 'active'].includes(sub.status);
  const creditBalance = credits?.advisor_report_balance ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">เลือกแพลนที่เหมาะกับคุณ</h1>
          <p className="text-xs text-muted-foreground">เลือกได้ทุกเมื่อ — ยกเลิกเมื่อไหร่ก็ได้</p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* FREE */}
        <Card className={!isPro && creditBalance === 0 ? 'border-2 border-primary/40' : ''}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-bold">ฟรี (BYO Key)</h2>
            </div>
            <p className="mt-2 text-3xl font-bold">฿0</p>
            <p className="text-xs text-muted-foreground">ตลอดไป</p>

            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                ฟีเจอร์ครบทุกอย่าง
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                AI Chat + Advisor + Secretary
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                ใช้ AI Key ของคุณเอง
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <span className="mt-0.5 text-xs">⚠</span>
                ต้องสมัคร API key เอง (~฿20-100/เดือนตามใช้)
              </li>
            </ul>

            <Button asChild variant="outline" className="mt-6 w-full" disabled={!isPro && creditBalance === 0}>
              <Link href="/ai/settings">
                {!isPro && creditBalance === 0 ? '✓ แพลนปัจจุบัน' : 'เปลี่ยนกลับ'}
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* PAYG */}
        <Card className={creditBalance > 0 ? 'border-2 border-primary/40' : ''}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-bold">จ่ายตามใช้</h2>
            </div>
            <p className="mt-2 text-3xl font-bold">
              ฿9 <span className="text-base font-normal text-muted-foreground">/ รายงาน</span>
            </p>
            <p className="text-xs text-muted-foreground">ซื้อ credit pack — ไม่มีค่าใช้จ่ายต่อเนื่อง</p>

            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                ใช้ AI Lumenfi (ไม่ต้องสมัคร key เอง)
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                AI Advisor 8 มิติ
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                Credit ไม่หมดอายุ
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <span className="mt-0.5 text-xs">·</span>
                AI Chat + Secretary ใช้ BYO key
              </li>
            </ul>

            {creditBalance > 0 && (
              <p className="mt-4 rounded-md bg-amber-50 p-2 text-center text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                💰 มี credit คงเหลือ <b>{creditBalance}</b> reports
              </p>
            )}

            <div className="mt-6">
              <CreditPackButtons />
            </div>
          </CardContent>
        </Card>

        {/* PRO */}
        <Card className={`relative ${isPro ? 'border-2 border-primary' : 'border-primary/40 ring-2 ring-primary/20'}`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="rounded-full bg-gradient-to-r from-primary to-purple-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              ⭐ คุ้มสุด
            </span>
          </div>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Pro</h2>
            </div>
            <p className="mt-2 text-3xl font-bold">
              ฿129 <span className="text-base font-normal text-muted-foreground">/ เดือน</span>
            </p>
            <p className="text-xs text-muted-foreground">หรือ ฿1,290/ปี (ประหยัด 17%)</p>

            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>ใช้ AI Lumenfi <b>ไม่จำกัด</b></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                AI Chat + Advisor 8 มิติ + Secretary
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                ฟรีทดลองใช้ <b>14 วัน</b>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                ยกเลิกได้ทุกเมื่อ
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                Priority support
              </li>
            </ul>

            <div className="mt-6">
              {isPro ? (
                <Button asChild className="w-full" variant="outline">
                  <Link href="/settings/billing">จัดการ subscription</Link>
                </Button>
              ) : (
                <SubscribeButton />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison */}
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 text-sm font-semibold">เลือกอย่างไรดี?</h3>
          <div className="grid gap-3 text-xs sm:grid-cols-3">
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="font-semibold">🔧 มี API Key อยู่แล้ว / นักพัฒนา</p>
              <p className="mt-1 text-muted-foreground">
                เลือก <b>ฟรี</b> — ใช้ key ของตัวเอง ควบคุมต้นทุนเอง
              </p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="font-semibold">📊 ใช้นานๆ ครั้ง / ทดลอง</p>
              <p className="mt-1 text-muted-foreground">
                เลือก <b>จ่ายตามใช้</b> — ขอวิเคราะห์เดือนละ 1-2 ครั้งก็พอ
              </p>
            </div>
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <p className="font-semibold">🌟 ใช้ทุกวัน / ต้องการเลขาทางการเงิน</p>
              <p className="mt-1 text-muted-foreground">
                เลือก <b>Pro</b> — ใช้ไม่จำกัด ทดลองฟรี 14 วันก่อน
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 text-sm font-semibold">คำถามที่พบบ่อย</h3>
          <div className="space-y-3 text-sm">
            <details className="rounded-md border bg-background p-3">
              <summary className="cursor-pointer font-medium">ยกเลิก subscription ได้ไหม?</summary>
              <p className="mt-2 text-xs text-muted-foreground">
                ได้ทุกเมื่อที่ /settings/billing — ใช้งานได้จนถึงสิ้นรอบ billing แล้ว downgrade เป็น Free อัตโนมัติ
              </p>
            </details>
            <details className="rounded-md border bg-background p-3">
              <summary className="cursor-pointer font-medium">Credit pack หมดอายุไหม?</summary>
              <p className="mt-2 text-xs text-muted-foreground">
                ไม่หมดอายุ — ใช้เมื่อไหร่ก็ได้ (ถ้าบัญชียังเปิดอยู่)
              </p>
            </details>
            <details className="rounded-md border bg-background p-3">
              <summary className="cursor-pointer font-medium">ข้อมูลถูกส่งให้ใครบ้าง?</summary>
              <p className="mt-2 text-xs text-muted-foreground">
                ข้อมูลการเงินของคุณถูกส่งให้ AI provider เท่าที่จำเป็น (Anthropic/OpenAI/Gemini) ตามที่ระบุใน privacy policy
                — Lumenfi ไม่เก็บประวัติแชทที่ AI provider ปลายทาง
              </p>
            </details>
            <details className="rounded-md border bg-background p-3">
              <summary className="cursor-pointer font-medium">Trial 14 วันต้องใส่บัตรไหม?</summary>
              <p className="mt-2 text-xs text-muted-foreground">
                ใส่ — Omise charge ครั้งแรกอัตโนมัติเมื่อครบ trial ถ้าไม่ยกเลิกก่อน คุณจะได้รับการแจ้งเตือน 3 วันก่อนหมด trial
              </p>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
