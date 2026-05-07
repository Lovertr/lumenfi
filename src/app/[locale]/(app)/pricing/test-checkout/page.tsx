import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * TEST MODE checkout page — simulates a successful payment.
 * In production this is replaced by Omise hosted checkout.
 */
export default async function TestCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tx?: string; type?: string; size?: string; cycle?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createServiceClient();

  // Auto-complete the transaction (for credit packs)
  if (sp.type === 'credits' && sp.tx) {
    await admin
      .from('payment_transactions')
      .update({ status: 'succeeded' })
      .eq('id', sp.tx)
      .eq('user_id', user.id);

    // Add credits
    const size = parseInt(sp.size ?? '0', 10);
    const { data: cur } = await admin
      .from('ai_credits')
      .select('advisor_report_balance, total_purchased')
      .eq('user_id', user.id)
      .maybeSingle();

    if (cur) {
      await admin
        .from('ai_credits')
        .update({
          advisor_report_balance: (cur.advisor_report_balance ?? 0) + size,
          total_purchased: (cur.total_purchased ?? 0) + size,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    } else {
      await admin.from('ai_credits').insert({
        user_id: user.id,
        advisor_report_balance: size,
        total_purchased: size,
      });
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4 pt-10">
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-success" />
          <h1 className="text-xl font-bold">
            {sp.type === 'subscription' ? 'เริ่ม Trial 14 วันแล้ว' : 'ซื้อ Credit สำเร็จ'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {sp.type === 'subscription'
              ? 'คุณมีสิทธิ์ใช้ AI Lumenfi ไม่จำกัด 14 วัน — ทดลองได้เลย'
              : `เพิ่ม ${sp.size} credits เข้าบัญชีแล้ว`}
          </p>
          <p className="mt-4 rounded-md bg-amber-50 p-2 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            ⚙️ <b>Test Mode</b> — Omise ยังไม่ approved · ใน production จะ redirect ไป Omise hosted checkout จริง
          </p>
          <div className="mt-6 grid gap-2">
            <Button asChild>
              <Link href={sp.type === 'subscription' ? '/advisor' : '/advisor'}>
                ลองใช้เลย →
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/settings/billing">
                ดู subscription
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="mr-1 h-3 w-3" />
                กลับ dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
