import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { createClient as createSb } from '@supabase/supabase-js';
import OrderRow from './order-row';
import RecentOrderRow from './recent-row';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

export default async function SubscriptionOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) notFound();

  const admin = createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: pending } = await admin
    .from('subscription_orders')
    .select('id, user_id, order_ref, plan_code, billing_cycle, amount_thb, slip_url, slip_uploaded_at, slip_auto_verified, slip_verify_meta, status, created_at')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false });

  const { data: recentApproved } = await admin
    .from('subscription_orders')
    .select('id, user_id, order_ref, amount_thb, status, activated_at, expires_at, slip_auto_verified')
    .in('status', ['approved', 'rejected', 'refunded'])
    .order('updated_at', { ascending: false })
    .limit(20);

  // Enrich with user emails
  const allUserIds = Array.from(
    new Set([...(pending ?? []).map((o) => o.user_id), ...(recentApproved ?? []).map((o) => o.user_id)])
  );
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, display_name')
    .in('id', allUserIds.length > 0 ? allUserIds : ['00000000-0000-0000-0000-000000000000']);
  const profileMap = new Map<string, { email: string; display_name?: string | null }>();
  for (const p of profiles ?? []) profileMap.set(p.id, p);

  // Sign slip URLs for pending orders
  const pendingWithSlips = await Promise.all(
    (pending ?? []).map(async (o) => {
      let signed: string | null = null;
      if (o.slip_url) {
        const { data: s } = await admin.storage
          .from('subscription-slips')
          .createSignedUrl(o.slip_url, 3600);
        signed = s?.signedUrl ?? null;
      }
      const p = profileMap.get(o.user_id);
      return {
        ...o,
        signed_slip_url: signed,
        user_email: p?.email ?? '?',
        user_display_name: p?.display_name ?? null,
      };
    })
  );

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/settings/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <DollarSign className="h-5 w-5 text-primary" />
            Subscription Orders
          </h1>
          <p className="text-xs text-muted-foreground">อนุมัติ / ปฏิเสธ manual PromptPay orders</p>
        </div>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-semibold">
          ⏳ รออนุมัติ ({pendingWithSlips.length})
        </h2>
        {pendingWithSlips.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              ไม่มี order รออนุมัติ
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {pendingWithSlips.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">📋 ล่าสุด 20 รายการ (approved/rejected)</h2>
        <Card>
          <CardContent className="p-0">
            {(recentApproved ?? []).length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">ยังไม่มีประวัติ</div>
            ) : (
              <ul className="divide-y">
                {(recentApproved ?? []).map((o) => {
                  const p = profileMap.get(o.user_id);
                  return (
                    <RecentOrderRow
                      key={o.id}
                      order={o}
                      userEmail={p?.email ?? '?'}
                    />
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
