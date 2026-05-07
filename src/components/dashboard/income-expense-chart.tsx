'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';
import { fetchIncomeExpenseTimeSeries } from '@/app/[locale]/(app)/dashboard/actions';

type Granularity = 'day' | 'week' | 'month';

interface RangeOption {
  granularity: Granularity;
  months: number;
  label: string;
}

const RANGE_OPTIONS: RangeOption[] = [
  { granularity: 'day', months: 1, label: 'รายวัน · 1 เดือน' },
  { granularity: 'week', months: 1, label: 'รายสัปดาห์ · 1 เดือน' },
  { granularity: 'week', months: 3, label: 'รายสัปดาห์ · 3 เดือน' },
  { granularity: 'week', months: 6, label: 'รายสัปดาห์ · 6 เดือน' },
  { granularity: 'week', months: 12, label: 'รายสัปดาห์ · 1 ปี' },
  { granularity: 'month', months: 12, label: 'รายเดือน · 1 ปี' },
  { granularity: 'month', months: 36, label: 'รายเดือน · 3 ปี' },
  { granularity: 'month', months: 60, label: 'รายเดือน · 5 ปี' },
];

interface DataPoint {
  bucket: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export function IncomeExpenseChart() {
  const [optionIdx, setOptionIdx] = useState(2); // default: week × 3mo
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const opt = RANGE_OPTIONS[optionIdx];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchIncomeExpenseTimeSeries(opt.granularity, opt.months)
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [optionIdx, opt.granularity, opt.months]);

  // Totals for current range
  const totalIncome = data.reduce((s, p) => s + p.income, 0);
  const totalExpense = data.reduce((s, p) => s + p.expense, 0);
  const totalNet = totalIncome - totalExpense;

  return (
    <div className="space-y-3">
      {/* Range picker */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {RANGE_OPTIONS.map((o, i) => {
          const active = i === optionIdx;
          return (
            <button
              key={`${o.granularity}-${o.months}`}
              type="button"
              onClick={() => setOptionIdx(i)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:bg-muted/40'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-emerald-50 p-2">
          <p className="text-muted-foreground">รวมรายรับ</p>
          <p className="mt-0.5 font-bold text-emerald-700">+฿{totalIncome.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="rounded-lg bg-rose-50 p-2">
          <p className="text-muted-foreground">รวมรายจ่าย</p>
          <p className="mt-0.5 font-bold text-rose-700">-฿{totalExpense.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className={`rounded-lg p-2 ${totalNet >= 0 ? 'bg-blue-50' : 'bg-amber-50'}`}>
          <p className="text-muted-foreground">สุทธิ</p>
          <p className={`mt-0.5 font-bold ${totalNet >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
            {totalNet >= 0 ? '+' : ''}฿{totalNet.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[260px] w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            ยังไม่มีข้อมูลในช่วงนี้
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                stroke="#9ca3af"
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="#9ca3af"
                tickFormatter={(v: number) => {
                  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                  return String(v);
                }}
                width={45}
              />
              <Tooltip
                formatter={(v: number, name: string) => {
                  const labels: Record<string, string> = { income: 'รายรับ', expense: 'รายจ่าย', net: 'สุทธิ' };
                  return [`฿${v.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`, labels[name] ?? name];
                }}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(v) => {
                  const labels: Record<string, string> = { income: 'รายรับ', expense: 'รายจ่าย' };
                  return labels[v] ?? v;
                }}
              />
              <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
