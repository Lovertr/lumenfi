'use client';

import { useState, useMemo } from 'react';
import { Link } from '@/i18n/routing';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';

type Range = '1mo' | '3mo' | '6mo' | '1y' | 'all';

interface DataPoint {
  date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
}

const RANGES: { id: Range; label: string; days: number | null }[] = [
  { id: '1mo', label: '1 เดือน', days: 30 },
  { id: '3mo', label: '3 เดือน', days: 90 },
  { id: '6mo', label: '6 เดือน', days: 180 },
  { id: '1y', label: '1 ปี', days: 365 },
  { id: 'all', label: 'ทั้งหมด', days: null },
];

function formatTHBShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

export function NetWorthMini({ data }: { data: DataPoint[] }) {
  const [range, setRange] = useState<Range>('3mo');

  const filtered = useMemo(() => {
    if (data.length === 0) return [];
    const cfg = RANGES.find((r) => r.id === range);
    if (!cfg?.days) return data;
    const cutoff = Date.now() - cfg.days * 86400000;
    return data.filter((d) => new Date(d.date).getTime() >= cutoff);
  }, [data, range]);

  if (data.length < 2) {
    return (
      <div className="rounded-lg border border-dashed bg-background p-6 text-center text-xs text-muted-foreground">
        เก็บข้อมูล Net Worth อย่างน้อย 2 วันถึงจะแสดงกราฟได้
        <br />
        Snapshot สร้างทุกวันโดยอัตโนมัติ
      </div>
    );
  }

  const first = filtered[0] ?? data[0];
  const last = filtered[filtered.length - 1] ?? data[data.length - 1];
  const change = Number(last.net_worth) - Number(first.net_worth);
  const changePct = Number(first.net_worth) !== 0
    ? (change / Math.abs(Number(first.net_worth))) * 100
    : 0;
  const isPositive = change >= 0;

  const chartData = filtered.map((d) => ({
    date: d.date.slice(5),
    netWorth: Number(d.net_worth),
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">การเปลี่ยนแปลง</p>
          <p className={`text-lg font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? '↑' : '↓'} {formatTHBShort(Math.abs(change))}
            <span className="ml-1 text-sm font-medium">
              ({changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%)
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                range === r.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:bg-muted/40'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="netWorthG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? '#10B981' : '#EF4444'} stopOpacity={0.4} />
                <stop offset="95%" stopColor={isPositive ? '#10B981' : '#EF4444'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9 }}
              stroke="#9ca3af"
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis
              tick={{ fontSize: 9 }}
              stroke="#9ca3af"
              tickFormatter={(v: number) => formatTHBShort(v)}
              width={42}
            />
            <Tooltip
              formatter={(v: number) => [`฿${Number(v).toLocaleString('th-TH')}`, 'Net Worth']}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
              labelStyle={{ fontSize: 10 }}
            />
            <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="2 2" />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke={isPositive ? '#10B981' : '#EF4444'}
              strokeWidth={2.5}
              fill="url(#netWorthG)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <Link
        href="/networth"
        className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-xs transition-colors hover:bg-muted/40"
      >
        <span className="text-muted-foreground">ดูรายละเอียด ทรัพย์สิน + หนี้สิน</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </Link>
    </div>
  );
}
