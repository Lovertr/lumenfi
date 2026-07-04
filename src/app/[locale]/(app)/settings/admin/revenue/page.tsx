import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, TrendingUp, DollarSign, Users, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { createClient as createSb } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

interface OrderPoint {
  amount_thb: string | number;
  plan_code: string;
  billing_cycle: string;
  approved_at: string | null;
  created_at: string;
  activated_at: string | null;
  expires_at: string | null;
}

export default async function RevenueDashboard({
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

  const now = Date.now();
  const day = 24 * 3600 * 1000;
  const thirty = new Date(now - 30 * day).toISOString();
  const sixty = new Date(now - 60 * day).toISOString();

  const { data: approved } = await admin
    .from('subscription_orders')
    .select('amount_thb, plan_code, billing_cycle, approved_at, created_at, activated_at, expires_at')
    .in('status', ['approved'])
    .gte('approved_at', sixty)
    .order('approved_at', { ascending: false });

  const rows: OrderPoint[] = approved ?? [];
  const inLast = (o: OrderPoint, days: number) =>
    o.approved_at && new Date(o.approved_at).getTime() >= now - days * day;

  const total30 = rows.filter((o) => inLast(o, 30)).reduce((s, o) => s + Number(o.amount_thb), 0);
  const total60_30 = rows.filter((o) => !inLast(o, 30) && inLast(o, 60)).reduce((s, o) => s + Number(o.amount_thb), 0);
  const growth = total60_30 > 0 ? ((total30 - total60_30) / total60_30) * 100 : 0;

  const bySku = new Map<string, { count: number; total: number }>();
  for (const o of rows.filter((o) => inLast(o, 30))) {
    const key = o.plan_code + '_' + o.billing_cycle;
    const cur = bySku.get(key) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(o.amount_thb);
    bySku.set(key, cur);
  }
  const skus = Array.from(bySku.entries()).sort((a, b) => b[1].total - a[1].total);

  // MRR: sum of active subs normalized to monthly value
  const [{ data: activeUser }, { data: activeAgent }] = await Promise.all([
    admin.from('user_subscriptions').select('billing_cycle').eq('status', 'active'),
    admin.from('agent_subscriptions').select('billing_cycle, monthly_amount').eq('status', 'active'),
  ]);

  const mrrUser = (activeUser ?? []).reduce((s: number, x: any) => {
    return s + (x.billing_cycle === 'yearly' ? 1490 / 12 : 149);
  }, 0);
  const mrrAgent = (activeAgent ?? []).reduce((s: number, x: any) => {
    return s + Number(x.monthly_amount ?? 0);
  }, 0);
  const mrrTotal = mrrUser + mrrAgent;
  const arr = mrrTotal * 12;

  const activeSubs = (activeUser?.length ?? 0) + (activeAgent?.length ?? 0);

  // Referrals granted last 30 days
  const { count: referralsCount } = await admin
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('reward_granted', true)
    .gte('reward_granted_at', thirty);

  const fmt = (n: number) =>
    n.toLocaleString('th-TH', { maximumFractionDigits: 0 });

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
            <TrendingUp className="h-5 w-5 text-primary" />
            Revenue Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">MRR / รายรับล่าสุด / ยอดขายแยกตาม SKU</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Repeat className="h-3 w-3" /> MRR
            </div>
            <p className="mt-1 text-2xl font-bold">฿{fmt(mrrTotal)}</p>
            <p className="text-[10px] text-muted-foreground">
              User ฿{fmt(mrrUser)} · Agent ฿{fmt(mrrAgent)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" /> ARR
            </div>
            <p className="mt-1 text-2xl font-bold">฿{fmt(arr)}</p>
            <p className="text-[10px] text-muted-foreground">MRR × 12</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" /> รายรับ 30 วัน
            </div>
            <p className="mt-1 text-2xl font-bold">฿{fmt(total30)}</p>
            <p
              className={
                'text-[10px] ' +
                (growth >= 0 ? 'text-emerald-600' : 'text-red-600')
              }
            >
              {growth >= 0 ? '+' : ''}
              {growth.toFixed(1)}% vs prev 30d
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> Active subs
            </div>
            <p className="mt-1 text-2xl font-bold">{activeSubs}</p>
            <p className="text-[10px] text-muted-foreground">
              User {activeUser?.length ?? 0} · Agent {activeAgent?.length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">รายรับแยก SKU (30 วัน)</h2>
          {skus.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีรายการอนุมัติในช่วงนี้</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="pb-1.5 text-left">SKU</th>
                  <th className="pb-1.5 text-right">จำนวน</th>
                  <th className="pb-1.5 text-right">ยอดรวม</th>
                </tr>
              </thead>
              <tbody>
                {skus.map(([sku, s]) => (
                  <tr key={sku} className="border-b last:border-0">
                    <td className="py-1.5 font-mono text-xs">{sku}</td>
                    <td className="py-1.5 text-right">{s.count}</td>
                    <td className="py-1.5 text-right font-semibold">฿{fmt(s.total)}</td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-semibold">
                  <td className="py-2">รวม</td>
                  <td className="py-2 text-right">
                    {skus.reduce((s, [, x]) => s + x.count, 0)}
                  </td>
                  <td className="py-2 text-right">฿{fmt(total30)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-1 text-sm font-semibold">🎁 Viral loop</h2>
          <p className="text-sm">
            Referral rewards granted (30 วัน): <span className="font-bold">{referralsCount ?? 0}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            ทุก referred user ที่จ่าย Pro = ทั้ง 2 ฝ่ายได้ +30 วัน
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
