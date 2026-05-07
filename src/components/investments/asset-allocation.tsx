'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { investmentTypeConfig, type InvestmentType } from './investment-type-config';
import { formatTHB } from '@/lib/utils';

interface Props {
  valueByType: Record<string, number>;
  valueByCurrency: Record<string, number>;
  valueByMarket: { thai: number; foreign: number };
  totalValue: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1', '#14B8A6'];

const TYPE_LABELS: Record<string, string> = {
  thai_stock: 'หุ้นไทย',
  foreign_stock: 'หุ้นต่างประเทศ',
  mutual_fund: 'กองทุนรวม',
  etf: 'ETF',
  crypto: 'คริปโต',
  gold: 'ทองคำ',
  reit: 'REIT',
  property: 'อสังหา',
  bond: 'พันธบัตร',
  fixed_deposit: 'เงินฝากประจำ',
  lottery_savings: 'สลากออมสิน',
  other: 'อื่นๆ',
};

type View = 'type' | 'currency' | 'market';

export function AssetAllocation({ valueByType, valueByCurrency, valueByMarket, totalValue }: Props) {
  const [view, setView] = useState<View>('type');

  const data = (() => {
    if (view === 'type') {
      return Object.entries(valueByType)
        .map(([k, v]) => ({ name: TYPE_LABELS[k] ?? k, value: v, key: k }))
        .sort((a, b) => b.value - a.value);
    }
    if (view === 'currency') {
      return Object.entries(valueByCurrency)
        .map(([k, v]) => ({ name: k, value: v, key: k }))
        .sort((a, b) => b.value - a.value);
    }
    return [
      { name: 'ตลาดไทย', value: valueByMarket.thai, key: 'thai' },
      { name: 'ต่างประเทศ', value: valueByMarket.foreign, key: 'foreign' },
    ].filter((d) => d.value > 0);
  })();

  if (data.length === 0 || totalValue === 0) return null;

  return (
    <div className="rounded-2xl border bg-card p-4 lg:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">การกระจายสินทรัพย์</h2>
        <div className="flex items-center gap-1 rounded-full border bg-muted/40 p-0.5">
          {(['type', 'currency', 'market'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {v === 'type' ? 'ประเภท' : v === 'currency' ? 'สกุล' : 'ตลาด'}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={2}
            >
              {data.map((entry, idx) => (
                <Cell key={entry.key} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => [`${formatTHB(v)} (${((v / totalValue) * 100).toFixed(1)}%)`, '']}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconSize={10}
              verticalAlign="bottom"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
