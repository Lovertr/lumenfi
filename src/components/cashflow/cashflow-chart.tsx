'use client';

import type { CashFlowDataPoint } from '@/lib/queries/cashflow';

export function CashFlowChart({ data }: { data: CashFlowDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        ยังไม่มีข้อมูลพอที่จะแสดงกราฟ
      </div>
    );
  }

  const maxIncome = Math.max(...data.map((d) => d.income), 1);
  const maxExpense = Math.max(...data.map((d) => d.expense), 1);
  const maxValue = Math.max(maxIncome, maxExpense);

  const width = 600;
  const height = 160;
  const padding = { top: 10, right: 10, bottom: 20, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barW = chartW / data.length;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <line
          x1={padding.left}
          y1={padding.top + chartH / 2}
          x2={width - padding.right}
          y2={padding.top + chartH / 2}
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.2"
        />
        {data.map((d, i) => {
          const x = padding.left + i * barW + barW * 0.15;
          const w = barW * 0.7;
          const incomeH = (d.income / maxValue) * (chartH / 2);
          const expenseH = (d.expense / maxValue) * (chartH / 2);
          const yMid = padding.top + chartH / 2;
          return (
            <g key={d.date}>
              {d.income > 0 && (
                <rect x={x} y={yMid - incomeH} width={w} height={incomeH} fill="#10B981" rx="1" opacity="0.9" />
              )}
              {d.expense > 0 && (
                <rect x={x} y={yMid} width={w} height={expenseH} fill="#EF4444" rx="1" opacity="0.85" />
              )}
            </g>
          );
        })}
        {[0, Math.floor(data.length / 2), data.length - 1].map((idx) => {
          const d = data[idx];
          if (!d) return null;
          const x = padding.left + idx * barW + barW / 2;
          return (
            <text key={d.date} x={x} y={height - 4} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.6">
              {d.date.slice(5)}
            </text>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[#10B981]" /> รายรับ
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[#EF4444]" /> รายจ่าย
        </span>
      </div>
    </div>
  );
}
