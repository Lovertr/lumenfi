import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Plus, Eye, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatTHB } from '@/lib/utils';
import { removeFromWatchlist } from './actions';

export const dynamic = 'force-dynamic';

export default async function WatchlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: items } = await supabase
    .from('investment_watchlist')
    .select('id, symbol, type, name, target_price, alert_above, current_price, last_checked, note')
    .order('created_at', { ascending: false });

  const list = items ?? [];

  const TYPE_LABELS: Record<string, string> = {
    thai_stock: 'หุ้นไทย', foreign_stock: 'หุ้น ตปท', mutual_fund: 'กองทุน',
    etf: 'ETF', crypto: 'Crypto', gold: 'ทอง', reit: 'REIT', other: 'อื่นๆ',
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/investments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Watchlist
            </h1>
            <p className="text-xs text-muted-foreground">รายการที่อยากซื้อ + แจ้งเตือนราคา</p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href="/investments/watchlist/new">
            <Plus className="mr-1 h-4 w-4" />
            เพิ่ม
          </Link>
        </Button>
      </header>

      {list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <Eye className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">ยังไม่มีรายการ Watchlist</p>
            <p className="mt-1 text-xs text-muted-foreground">
              เพิ่มหุ้น/กองทุนที่สนใจ เพื่อ track ราคาและรอจังหวะเข้าซื้อ
            </p>
            <Button asChild className="mt-4">
              <Link href="/investments/watchlist/new">
                <Plus className="mr-1 h-4 w-4" />
                เพิ่มรายการแรก
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((w: any) => {
            const target = w.target_price !== null ? Number(w.target_price) : null;
            const current = w.current_price !== null ? Number(w.current_price) : null;
            const triggered = target !== null && current !== null
              ? (w.alert_above ? current >= target : current <= target)
              : false;
            const distance = target !== null && current !== null
              ? ((current - target) / target) * 100
              : null;

            return (
              <Card key={w.id} className={triggered ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' : ''}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold">{w.symbol}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                        {TYPE_LABELS[w.type] ?? w.type}
                      </span>
                      {triggered && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          🔔 ถึงแล้ว!
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {w.name ?? '—'}
                      {w.note && ` · ${w.note}`}
                    </p>
                    {target !== null && (
                      <div className="mt-1 flex items-center gap-1 text-[11px]">
                        {w.alert_above ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : <TrendingDown className="h-3 w-3 text-rose-600" />}
                        <span className="text-muted-foreground">
                          เป้า {formatTHB(target)} ({w.alert_above ? '≥' : '≤'})
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {current !== null ? (
                      <>
                        <p className="text-base font-bold">{formatTHB(current)}</p>
                        {distance !== null && (
                          <p className={`text-[11px] ${distance >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {distance >= 0 ? '+' : ''}{distance.toFixed(1)}%
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">ยังไม่มีราคา</p>
                    )}
                  </div>
                  <form action={removeFromWatchlist}>
                    <input type="hidden" name="id" value={w.id} />
                    <Button type="submit" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
