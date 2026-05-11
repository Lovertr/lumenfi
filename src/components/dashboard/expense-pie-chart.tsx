'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatTHB } from '@/lib/utils';

interface Category {
  name: string;
  icon: string;
  color: string;
  amount: number;
}

export function ExpensePieChart({
  categories,
  total,
}: {
  categories: Category[];
  total: number;
}) {
  if (categories.length === 0 || total <= 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        ยังไม่มีรายจ่ายในช่วงนี้
      </div>
    );
  }

  const data = categories.map((c) => ({
    name: c.name,
    value: c.amount,
    icon: c.icon,
    color: c.color,
    percent: total > 0 ? (c.amount / total) * 100 : 0,
  }));

  return (
    <div className="space-y-3">
      <div className="relative h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={84}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              wrapperStyle={{ outline: 'none', zIndex: 50 }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d: any = payload[0].payload;
                return (
                  <div className="rounded-lg border-2 border-foreground/10 bg-white px-3 py-2 text-xs shadow-xl dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: d.color }}
                      />
                      <p className="font-semibold text-foreground">
                        {d.icon} {d.name}
                      </p>
                    </div>
                    <p className="mt-1 text-sm font-bold text-foreground">
                      {formatTHB(d.value)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {d.percent.toFixed(1)}% ของรายจ่ายทั้งหมด
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] text-muted-foreground">รวม</p>
          <p className="text-base font-bold">{formatTHB(total)}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: d.color }}
            />
            <span className="truncate">
              {d.icon} {d.name}
            </span>
            <span className="ml-auto whitespace-nowrap font-medium tabular-nums text-muted-foreground">
              {d.percent.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
