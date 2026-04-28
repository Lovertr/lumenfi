'use client';

import { useTranslations, useLocale } from 'next-intl';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

interface MonthlyPoint { month: string; income: number; expense: number; }
interface BreakdownItem { name: string; value: number; color: string; icon: string; }

const FALLBACK_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#14B8A6'];

function formatMonth(s: string, locale: string) {
  const [y, m] = s.split('-');
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', { month: 'short', year: '2-digit' });
}

function formatCompact(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(v);
}

export function ReportsCharts({
  monthly,
  expenseBreakdown,
  incomeBreakdown,
}: {
  monthly: MonthlyPoint[];
  expenseBreakdown: BreakdownItem[];
  incomeBreakdown: BreakdownItem[];
}) {
  const t = useTranslations('Reports');
  const locale = useLocale();

  const monthlyDisplay = monthly.map((m) => ({
    ...m,
    label: formatMonth(m.month, locale),
    net: m.income - m.expense,
  }));

  return (
    <div className="space-y-4">
      {/* Monthly income vs expense */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">{t('monthlyTitle')}</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyDisplay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => `฿${Number(v).toLocaleString()}`}
                contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" fill="#10B981" name={t('income')} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#EF4444" name={t('expense')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Net trend line */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">{t('netTrend')}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyDisplay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `฿${Number(v).toLocaleString()}`} />
              <Line
                type="monotone"
                dataKey="net"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 3 }}
                name={t('net')}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category breakdowns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 text-sm font-semibold">
              {t('expenseByCategory')} <span className="text-xs font-normal text-muted-foreground">({t('thisMonth')})</span>
            </h2>
            {expenseBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('noData')}</p>
            ) : (
              <BreakdownChart items={expenseBreakdown} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 text-sm font-semibold">
              {t('incomeByCategory')} <span className="text-xs font-normal text-muted-foreground">({t('thisMonth')})</span>
            </h2>
            {incomeBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('noData')}</p>
            ) : (
              <BreakdownChart items={incomeBreakdown} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BreakdownChart({ items }: { items: BreakdownItem[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={items}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={75}
            innerRadius={40}
            paddingAngle={2}
          >
            {items.map((it, idx) => (
              <Cell key={idx} fill={it.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => `฿${Number(v).toLocaleString()}`} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1">
        {items.slice(0, 6).map((it, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: it.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length] }}
              />
              <span className="truncate">{it.icon} {it.name}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-medium">฿{Number(it.value).toLocaleString()}</span>
              <span className="w-9 text-right text-muted-foreground">
                {total > 0 ? `${Math.round((it.value / total) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
