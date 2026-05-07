'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { Loader2 } from 'lucide-react';
import { fetchPriceHistory } from '@/app/[locale]/(app)/investments/actions';

type Range = '1mo' | '3mo' | '6mo' | '1y' | '5y';

const RANGES: { id: Range; label: string }[] = [
  { id: '1mo', label: '1 เดือน' },
  { id: '3mo', label: '3 เดือน' },
  { id: '6mo', label: '6 เดือน' },
  { id: '1y', label: '1 ปี' },
  { id: '5y', label: '5 ปี' },
];

interface DataPoint { date: string; close: number; }

export function PriceChart({ symbol, type, avgCost, currency }: { symbol: string; type: string; avgCost: number; currency: string }) {
  const [range, setRange] = useState<Range>('3mo');
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPriceHistory(symbol, type, range)
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setData(r.data);
        else setError(r.error ?? 'ดึงข้อมูลไม่ได้');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [symbol, type, range]);

  const fmt = currency === 'THB' ? '฿' : '$';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={`shrink-0 rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${
              range === r.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:bg-muted/40'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="h-[220px] w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error || data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {error ?? 'ไม่มีข้อมูลสำหรับ symbol นี้'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" interval="preserveStartEnd" minTickGap={20} />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="#9ca3af"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(v: number) => `${fmt}${v.toFixed(2)}`}
                width={60}
              />
              <Tooltip
                formatter={(v: number) => [`${fmt}${Number(v).toFixed(2)}`, 'ราคา']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <ReferenceLine y={avgCost} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: 'ทุน', position: 'right', fontSize: 10, fill: '#6b7280' }} />
              <Line type="monotone" dataKey="close" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
