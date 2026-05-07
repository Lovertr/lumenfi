'use client';

import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { Loader2 } from 'lucide-react';
import { fetchIncomeExpenseTimeSeries } from '@/app/[locale]/(app)/dashboard/actions';

type Granularity = 'day' | 'week' | 'month';

interface DataPoint {
  bucket: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  cumNet: number;
}

const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: 'รายวัน',
  week: 'รายสัปดาห์',
  month: 'รายเดือน',
};

// Preset chips per granularity (label, fromOffsetDays or special)
const DAY_PRESETS = [
  { id: 'last_7', label: '7 วันล่าสุด', days: 7 },
  { id: 'last_14', label: '14 วันล่าสุด', days: 14 },
  { id: 'last_30', label: '30 วันล่าสุด', days: 30 },
  { id: 'this_month', label: 'เดือนนี้', special: 'this_month' as const },
  { id: 'last_month', label: 'เดือนที่แล้ว', special: 'last_month' as const },
];

const WEEK_PRESETS = [
  { id: 'last_4w', label: '1 เดือน', months: 1 },
  { id: 'last_3m', label: '3 เดือน', months: 3 },
  { id: 'last_6m', label: '6 เดือน', months: 6 },
  { id: 'last_12m', label: '1 ปี', months: 12 },
];

const MONTH_PRESETS = [
  { id: 'last_6m', label: '6 เดือน', months: 6 },
  { id: 'last_12m', label: '1 ปี', months: 12 },
  { id: 'last_24m', label: '2 ปี', months: 24 },
  { id: 'last_36m', label: '3 ปี', months: 36 },
  { id: 'last_60m', label: '5 ปี', months: 60 },
];

// Limits to prevent absurd queries (granularity × maximum days)
const MAX_RANGE_DAYS: Record<Granularity, number> = {
  day: 92,    // ~3 months max for daily view
  week: 730,  // ~2 years max for weekly
  month: 3650, // ~10 years max for monthly
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isoMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function startOfMonth(year: number, month0: number): Date {
  return new Date(year, month0, 1);
}

function endOfMonth(year: number, month0: number): Date {
  return new Date(year, month0 + 1, 0);
}

export function IncomeExpenseChart() {
  const [granularity, setGranularity] = useState<Granularity>('week');
  const [presetId, setPresetId] = useState<string>('last_3m');
  const [customMode, setCustomMode] = useState(false);

  // Custom range state — semantics depend on granularity
  // day:    fromDate / toDate (YYYY-MM-DD)
  // week:   fromMonth / toMonth (YYYY-MM)
  // month:  fromYear / toYear  (YYYY)
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Resolve range to absolute fromDate/toDate
  const { fromDate, toDate, isValid, errorMsg } = useMemo(() => {
    return resolveRange(granularity, presetId, customMode, customFrom, customTo);
  }, [granularity, presetId, customMode, customFrom, customTo]);

  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isValid || !fromDate || !toDate) {
      setData([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchIncomeExpenseTimeSeries(granularity, fromDate, toDate)
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [granularity, fromDate, toDate, isValid]);

  // When granularity changes, set sensible default preset
  function handleGranularityChange(g: Granularity) {
    setGranularity(g);
    setCustomMode(false);
    if (g === 'day') setPresetId('last_30');
    else if (g === 'week') setPresetId('last_3m');
    else setPresetId('last_12m');
  }

  const presets =
    granularity === 'day' ? DAY_PRESETS :
    granularity === 'week' ? WEEK_PRESETS : MONTH_PRESETS;

  const totalIncome = data.reduce((s, p) => s + p.income, 0);
  const totalExpense = data.reduce((s, p) => s + p.expense, 0);
  const totalNet = totalIncome - totalExpense;

  // Server already computes cumNet against all-time baseline
  const chartData = data;

  return (
    <div className="space-y-3">
      {/* Granularity selector */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border bg-muted/40 p-1">
        {(['day', 'week', 'month'] as Granularity[]).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => handleGranularityChange(g)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              granularity === g ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {GRANULARITY_LABELS[g]}
          </button>
        ))}
      </div>

      {/* Preset chips + custom toggle */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {presets.map((p) => {
          const active = !customMode && presetId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setCustomMode(false);
                setPresetId(p.id);
              }}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:bg-muted/40'
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setCustomMode(true);
            // Pre-fill custom inputs based on current preset's resolved dates
            if (fromDate && toDate) {
              if (granularity === 'day') {
                setCustomFrom(fromDate);
                setCustomTo(toDate);
              } else if (granularity === 'week') {
                setCustomFrom(fromDate.slice(0, 7));
                setCustomTo(toDate.slice(0, 7));
              } else {
                setCustomFrom(fromDate.slice(0, 4));
                setCustomTo(toDate.slice(0, 4));
              }
            }
          }}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            customMode
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-background hover:bg-muted/40'
          }`}
        >
          เลือกเอง
        </button>
      </div>

      {/* Custom range inputs */}
      {customMode && (
        <div className="rounded-lg border bg-background p-3 space-y-2">
          <div className="flex items-center gap-2">
            <CustomInput
              granularity={granularity}
              value={customFrom}
              onChange={setCustomFrom}
              placeholder="จาก"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <CustomInput
              granularity={granularity}
              value={customTo}
              onChange={setCustomTo}
              placeholder="ถึง"
            />
          </div>
          {!isValid && errorMsg && (
            <p className="text-xs text-amber-700">{errorMsg}</p>
          )}
        </div>
      )}

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
      <div className="h-[280px] w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !isValid ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            กรุณาเลือกช่วงให้ถูกต้อง
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            ยังไม่มีข้อมูลในช่วงนี้
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
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
                  const labels: Record<string, string> = { income: 'รายรับ', expense: 'รายจ่าย', cumNet: 'สุทธิสะสม' };
                  return [`฿${v.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`, labels[name] ?? name];
                }}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(v) => {
                  const labels: Record<string, string> = { income: 'รายรับ', expense: 'รายจ่าย', cumNet: 'สุทธิสะสม' };
                  return labels[v] ?? v;
                }}
              />
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="2 2" />
              <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="cumNet" stroke="#3B82F6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function CustomInput({
  granularity,
  value,
  onChange,
  placeholder,
}: {
  granularity: Granularity;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  if (granularity === 'day') {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
      />
    );
  }
  if (granularity === 'week') {
    return (
      <input
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
      />
    );
  }
  // month → year picker (simple number input)
  return (
    <input
      type="number"
      min={2000}
      max={2100}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
    />
  );
}

function resolveRange(
  granularity: Granularity,
  presetId: string,
  customMode: boolean,
  customFrom: string,
  customTo: string
): { fromDate: string; toDate: string; isValid: boolean; errorMsg?: string } {
  const today = new Date();
  const todayStr = isoDate(today);

  if (customMode) {
    if (!customFrom || !customTo) {
      return { fromDate: '', toDate: '', isValid: false, errorMsg: 'กรุณาเลือกช่วงทั้งสองข้าง' };
    }
    let from: Date, to: Date;
    if (granularity === 'day') {
      from = new Date(customFrom);
      to = new Date(customTo);
    } else if (granularity === 'week') {
      const [fy, fm] = customFrom.split('-').map(Number);
      const [ty, tm] = customTo.split('-').map(Number);
      from = startOfMonth(fy, fm - 1);
      to = endOfMonth(ty, tm - 1);
    } else {
      from = startOfMonth(Number(customFrom), 0);
      to = endOfMonth(Number(customTo), 11);
    }
    if (from > to) return { fromDate: '', toDate: '', isValid: false, errorMsg: 'วันเริ่มต้องไม่หลังวันสิ้นสุด' };
    const diffDays = Math.ceil((to.getTime() - from.getTime()) / 86400000);
    if (diffDays > MAX_RANGE_DAYS[granularity]) {
      return {
        fromDate: '',
        toDate: '',
        isValid: false,
        errorMsg: `ช่วงกว้างเกินไปสำหรับ${GRANULARITY_LABELS[granularity]} — ลด range หรือเปลี่ยน granularity`,
      };
    }
    return { fromDate: isoDate(from), toDate: isoDate(to), isValid: true };
  }

  // Preset
  if (granularity === 'day') {
    const p = DAY_PRESETS.find((p) => p.id === presetId);
    if (!p) return { fromDate: '', toDate: '', isValid: false };
    if (p.special === 'this_month') {
      const first = startOfMonth(today.getFullYear(), today.getMonth());
      return { fromDate: isoDate(first), toDate: todayStr, isValid: true };
    }
    if (p.special === 'last_month') {
      const first = startOfMonth(today.getFullYear(), today.getMonth() - 1);
      const last = endOfMonth(today.getFullYear(), today.getMonth() - 1);
      return { fromDate: isoDate(first), toDate: isoDate(last), isValid: true };
    }
    const days = (p as any).days;
    const from = new Date(today);
    from.setDate(today.getDate() - days + 1);
    return { fromDate: isoDate(from), toDate: todayStr, isValid: true };
  }

  if (granularity === 'week') {
    const p = WEEK_PRESETS.find((p) => p.id === presetId);
    const months = p?.months ?? 3;
    const from = new Date(today);
    from.setMonth(today.getMonth() - months);
    return { fromDate: isoDate(from), toDate: todayStr, isValid: true };
  }

  // month
  const p = MONTH_PRESETS.find((p) => p.id === presetId);
  const months = p?.months ?? 12;
  const from = new Date(today);
  from.setMonth(today.getMonth() - months);
  return { fromDate: isoDate(from), toDate: todayStr, isValid: true };
}
