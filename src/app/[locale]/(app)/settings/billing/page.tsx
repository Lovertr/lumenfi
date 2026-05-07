import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, CreditCard, Sparkles, Zap, Receipt, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { getCurrentQuotaUsage } from '@/lib/billing/gateway';
import { CancelSubscriptionButton } from '@/components/billing/cancel-button';

export const dynamic = 'force-dynamic';

export default async function BillingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: sub }, { data: credits }, { data: payments }] = await Promise.all([
    supabase
      .from('user_subscriptions')
      .select('plan_code, status, billing_cycle, current_period_end, trial_ends_at, cancel_at_period_end, plan:subscription_plans(name_th, price_thb_monthly, price_thb_yearly, has_lumenfi_ai)')
      .eq('user_id', user?.id ?? '')
      .maybeSingle(),
    supabase
      .from('ai_credits')
      .select('advisor_report_balance, total_purchased, total_used')
      .eq('user_id', user?.id ?? '')
      .maybeSingle(),
    supabase
      .from('payment_transactions')
      .select('id, type, amount_thb, status, created_at, plan_code, credits_pack_size, receipt_url')
      .eq('user_id', user?.id ?? '')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const usage = await getCurrentQuotaUsage();

  const isActive = sub && ['trial', 'active'].includes(sub.status as string);
  const planMeta = (sub as any)?.plan;
  const isTrialing = sub?.status === 'trial';

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <CreditCard className="h-5 w-5 text-primary" />
            การชำระเงิน + Subscription
          </h1>
          <p className="text-xs text-muted-foreground">จัดการแพลน + ดูใบเสร็จ</p>
        </div>
      </header>

      {/* Current plan */}
      {isActive && planMeta ? (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
                    แพลนปัจจุบัน
                  </span>
                </div>
                <p className="mt-1 text-lg font-bold">{planMeta.name_th}</p>
                <p className="text-sm text-muted-foreground">
                  ฿{sub.billing_cycle === 'yearly' ? planMeta.price_thb_yearly : planMeta.price_thb_monthly}
                  /{sub.billing_cycle === 'yearly' ? 'ปี' : 'เดือน'}
                </p>

                {isTrialing && sub.trial_ends_at && (
                  <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    🎁 Trial หมด {new Date(sub.trial_ends_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                  </p>
                )}

                {sub.current_period_end && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {sub.cancel_at_period_end ? 'จะหมดอายุ' : 'รอบถัดไป charge'}: {new Date(sub.current_period_end).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                  </p>
                )}

                {sub.cancel_at_period_end && (
                  <p className="mt-2 inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[11px] text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                    ⚠ ยกเลิกแล้ว — จะ downgrade เมื่อจบรอบ
                  </p>
                )}
              </div>

              {!sub.cancel_at_period_end && <CancelSubscriptionButton />}
            </div>

            {/* Usage stats */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-background/50 p-3">
                <p className="text-muted-foreground">AI Chat วันนี้</p>
                <p className="mt-0.5 text-lg font-bold">{usage.chatToday}</p>
              </div>
              <div className="rounded-md bg-background/50 p-3">
                <p className="text-muted-foreground">Advisor reports เดือนนี้</p>
                <p className="mt-0.5 text-lg font-bold">{usage.advisorThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-5 text-center">
            <CreditCard className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">ยังไม่ได้สมัคร subscription</p>
            <p className="mt-1 text-xs text-muted-foreground">ใช้ฟรี (BYO key) อยู่</p>
            <Button asChild className="mt-3">
              <Link href="/pricing">ดูแพลน</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Credits balance */}
      {credits && credits.total_purchased > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold">Credit Pack</h2>
            </div>
            <p className="mt-2 text-2xl font-bold">{credits.advisor_report_balance} reports</p>
            <p className="text-[11px] text-muted-foreground">
              ใช้แล้ว {credits.total_used} / ซื้อทั้งหมด {credits.total_purchased}
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link href="/pricing">ซื้อเพิ่ม</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment history */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">ประวัติการชำระเงิน</h2>
          </div>

          {!payments || payments.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              ยังไม่มีการชำระเงิน
            </p>
          ) : (
            <div className="space-y-2">
              {payments.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border bg-background p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {p.type === 'subscription_initial'
                        ? '🌟 Subscription'
                        : p.type === 'subscription_renewal'
                        ? '🔁 ต่ออายุ'
                        : p.type === 'credit_pack'
                        ? `⚡ Credit Pack ${p.credits_pack_size}`
                        : '💳'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(p.created_at).toLocaleString('th-TH', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">฿{Number(p.amount_thb).toLocaleString()}</p>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        p.status === 'succeeded'
                          ? 'bg-success/15 text-success'
                          : p.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-700'
                          : 'bg-destructive/15 text-destructive'
                      }`}
                    >
                      {p.status === 'succeeded' && 'จ่ายแล้ว'}
                      {p.status === 'pending' && 'รอ'}
                      {p.status === 'failed' && 'ล้มเหลว'}
                      {p.status === 'refunded' && 'คืนเงิน'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
