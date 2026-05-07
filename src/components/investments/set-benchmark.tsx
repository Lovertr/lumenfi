'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { fetchPriceHistory } from '@/app/[locale]/(app)/investments/actions';

type Range = '1mo' | '3mo' | '6mo' | '1y' | '5y';

const RANGES: { id: Range; label: string }[] = [
  { id: '3mo', label: '3 เดือน' },
  { id: '6mo', label: '6 เดือน' },
  { id: '1y', label: '1 ปี' },
  { id: '5y', label: '5 ปี' },
];

interface DataPoint {
  date: string;
  setIndex: number | null;
  portfolio: number | null;
}

export function SETBenchmark({ portfolioPLPercent }: { portfolioPLPercent: number }) {
  const [range, setRange] = useState<Range>('6mo');
  const [data, setData] = useState<DataPoint[]>([]);
  const [setReturn, setSetReturn] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // SET Index symbol on Yahoo: ^SET.BK
    fetchPriceHistory('^SET.BK', 'thai_stock', range)
      .then((r) => {
        if (cancelled) return;
        if (r.ok && r.data.length > 0) {
          const first = r.data[0].close;
          const last = r.data[r.data.length - 1].close;
          const setRet = ((last - first) / first) * 100;
          setSetReturn(setRet);

          const points: DataPoint[] = r.data.map((p) => ({
            date: p.date,
            setIndex: ((p.close - first) / first) * 100,
            portfolio: null,
          }));
          // Plot portfolio as a flat line at portfolioPLPercent for now
          // (real impl would query portfolio_snapshots table)
          if (points.length > 0) {
            points[points.length - 1].portfolio = portfolioPLPercent;
            points[0].portfolio = 0;
          }
          setData(points);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [range, portfolioPLPercent]);

  const beat = setReturn !== null && portfolioPLPercent > setReturn;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">เทียบกับ SET Index</h2>
            <p className="text-[11px] text-muted-foreground">ผลตอบแทนสะสม % เทียบตลาดหุ้นไทย</p>
          </div>
          <div className="flex items-center gap-1">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  range === r.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:bg-muted/40'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {setReturn !== null && (
          <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-3 text-xs">
            <div>
              <p className="text-muted-foreground">SET Index</p>
              <p className={`mt-0.5 text-base font-bold ${setReturn >= 0 ? 'text-success' : 'text-destructive'}`}>
                {setReturn >= 0 ? '+' : ''}{setReturn.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Portfolio คุณ</p>
              <p className={`mt-0.5 flex items-center gap-1 text-base font-bold ${portfolioPLPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                {portfolioPLPercent >= 0 ? '+' : ''}{portfolioPLPercent.toFixed(2)}%
                {beat ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              </p>
            </div>
            <div className="col-span-2 border-t pt-2 text-[11px] text-muted-foreground">
              {beat
                ? '🎉 Portfolio คุณชนะตลาด! Outperformance ' + (portfolioPLPercent - setReturn).toFixed(2) + '%'
                : 'Portfolio คุณยังตามหลัง SET ' + Math.abs(portfolioPLPercent - setReturn).toFixed(2) + '%'}
            </div>
          </div>
        )}

        <div className="h-[180px] w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              ไม่สามารถโหลดข้อมูล SET ได้
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#9ca3af" interval="preserveStartEnd" minTickGap={30} />
                <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" tickFormatter={(v: number) => `${v.toFixed(0)}%`} width={42} />
                <Tooltip
                  formatter={(v: number, k: string) => [`${v?.toFixed(2)}%`, k === 'setIndex' ? 'SET Index' : 'Portfolio']}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Line type="monotone" dataKey="setIndex" name="SET Index" stroke="#9ca3af" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="portfolio" name="Portfolio" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          * Portfolio % เป็นค่าปัจจุบัน — รายละเอียดรายวันต้องรอ snapshot สะสม (ทำงานทุกวัน)
        </p>
      </CardContent>
    </Card>
  );
}
