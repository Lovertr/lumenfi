'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

interface DataPoint {
  date: string;
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
}

export function NetWorthChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    date: d.date.slice(5), // MM-DD
    netWorth: Number(d.net_worth),
    assets: Number(d.total_assets),
    liabilities: Number(d.total_liabilities),
  }));

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <YAxis
            tick={{ fontSize: 10 }}
            stroke="#9ca3af"
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
            width={45}
          />
          <Tooltip
            formatter={(v: number, name: string) => {
              const labels: Record<string, string> = {
                netWorth: 'Net Worth',
                assets: 'สินทรัพย์',
                liabilities: 'หนี้สิน',
              };
              return [`฿${v.toLocaleString('th-TH')}`, labels[name] ?? name];
            }}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="2 2" />
          <Line type="monotone" dataKey="netWorth" stroke="#7C3AED" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
