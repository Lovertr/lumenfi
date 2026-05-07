import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatTHB } from '@/lib/utils';
import { getDashboardData } from '@/lib/queries/dashboard';
import { NetWorthChart } from '@/components/dashboard/net-worth-chart';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function NetWorthPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let nwHistory: Array<{ date: string; total_assets: number; total_liabilities: number; net_worth: number }> = [];
  if (user) {
    try {
      const mod = await import('@/lib/queries/net-worth-snapshot');
      nwHistory = (await mod.getNetWorthHistory(user.id, 365)) as typeof nwHistory;
    } catch {}
  }

  const data = await getDashboardData();
  const oldest = nwHistory[0];
  const change = oldest ? data.netWorth - Number(oldest.net_worth) : 0;
  const changePct = oldest && Number(oldest.net_worth) !== 0
    ? (change / Math.abs(Number(oldest.net_worth))) * 100
    : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">ฐานะการเงินรวม</h1>
          <p className="text-xs text-muted-foreground">Net Worth · ทรัพย์สิน − หนี้สิน</p>
        </div>
      </header>

      {/* Big Net Worth card */}
      <Card className="overflow-hidden bg-gradient-to-br from-[#0A0F1F] to-[#1E293B] text-white">
        <CardContent className="p-6 lg:p-8">
          <p className="text-sm opacity-90">Net Worth</p>
          <p className={`mt-1 text-4xl font-bold lg:text-5xl ${data.netWorth < 0 ? 'text-[#FCA5A5]' : ''}`}>
            {formatTHB(data.netWorth)}
          </p>
          {oldest && (
            <p className="mt-1 text-xs opacity-80">
              {change >= 0 ? '↑' : '↓'} {formatTHB(Math.abs(change))} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%) ตั้งแต่ {oldest.date}
            </p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-4 lg:gap-6">
            <div>
              <div className="flex items-center gap-1.5 opacity-80">
                <TrendingUp className="h-3.5 w-3.5" />
                <p className="text-xs">ทรัพย์สิน</p>
              </div>
              <p className="mt-1 text-xl font-bold lg:text-2xl">{formatTHB(data.totalAssets)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 opacity-80">
                <TrendingDown className="h-3.5 w-3.5" />
                <p className="text-xs">หนี้สิน</p>
              </div>
              <p className="mt-1 text-xl font-bold text-[#FCA5A5] lg:text-2xl">-{formatTHB(data.totalLiabilities)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend chart */}
      {nwHistory.length >= 2 && (
        <Card>
          <CardContent className="p-4 lg:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">แนวโน้ม 1 ปี</h2>
              <p className="text-xs text-muted-foreground">{nwHistory.length} จุดข้อมูล</p>
            </div>
            <NetWorthChart data={nwHistory} />
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/accounts">
          <Card className="transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Wallet className="h-5 w-5" />
              </div>
              <p className="mt-3 font-semibold">บัญชีของฉัน</p>
              <p className="text-xs text-muted-foreground">{data.accountsCount} บัญชี</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/debts">
          <Card className="transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <p className="mt-3 font-semibold">หนี้สิน</p>
              <p className="text-xs text-muted-foreground">{data.debtsCount} ก้อน</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        💡 Net Worth สะท้อนภาพรวมระยะยาว — สำคัญแต่ไม่ใช่สิ่งที่ดูทุกวัน
        <br />
        การวางแผนใช้เงินรายเดือน ดูใน Dashboard และ Cash Flow ได้ดีกว่า
      </p>
    </div>
  );
}
