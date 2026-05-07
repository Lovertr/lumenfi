'use client';

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Area, AreaChart } from 'recharts';
import { Calculator, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatTHB } from '@/lib/utils';

export function DCACalculator() {
  const [monthly, setMonthly] = useState('5000');
  const [years, setYears] = useState('20');
  const [returnPct, setReturnPct] = useState('7');
  const [initial, setInitial] = useState('0');

  const data = useMemo(() => {
    const m = parseFloat(monthly.replace(/,/g, '')) || 0;
    const y = parseInt(years) || 0;
    const r = (parseFloat(returnPct) || 0) / 100;
    const init = parseFloat(initial.replace(/,/g, '')) || 0;
    const monthlyRate = r / 12;

    let balance = init;
    let invested = init;
    const points: { year: number; invested: number; total: number; growth: number }[] = [
      { year: 0, invested: init, total: init, growth: 0 },
    ];

    for (let year = 1; year <= y; year++) {
      for (let month = 0; month < 12; month++) {
        balance = balance * (1 + monthlyRate) + m;
        invested += m;
      }
      points.push({
        year,
        invested,
        total: balance,
        growth: balance - invested,
      });
    }
    return points;
  }, [monthly, years, returnPct, initial]);

  const final = data[data.length - 1];
  const totalReturn = final.invested > 0 ? ((final.total - final.invested) / final.invested) * 100 : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">ตัวคำนวณ DCA</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="monthly" className="text-xs">ลงทุน/เดือน</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">฿</span>
                <Input id="monthly" type="number" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} className="pl-7" />
              </div>
            </div>
            <div>
              <Label htmlFor="years" className="text-xs">ระยะเวลา (ปี)</Label>
              <Input id="years" type="number" inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="returnPct" className="text-xs">ผลตอบแทน/ปี (%)</Label>
              <Input id="returnPct" type="number" inputMode="decimal" step="0.1" value={returnPct} onChange={(e) => setReturnPct(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="initial" className="text-xs">เงินตั้งต้น (ถ้ามี)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">฿</span>
                <Input id="initial" type="number" inputMode="decimal" value={initial} onChange={(e) => setInitial(e.target.value)} className="pl-7" />
              </div>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            💡 ผลตอบแทนเฉลี่ยตลาดหุ้นไทย (SET) ระยะยาว ~7-9% / กองทุนรวมหุ้น 6-10%
          </p>
        </CardContent>
      </Card>

      {/* Result hero */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-purple-600 p-5 text-white">
        <p className="text-xs opacity-80">มูลค่ารวมหลัง {years} ปี</p>
        <p className="text-3xl font-bold">{formatTHB(final.total)}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-white/15 p-2">
            <p className="opacity-80">เงินที่ใส่</p>
            <p className="mt-0.5 font-semibold">{formatTHB(final.invested)}</p>
          </div>
          <div className="rounded-lg bg-white/15 p-2">
            <p className="opacity-80">กำไร</p>
            <p className="mt-0.5 font-semibold">+{formatTHB(final.growth)}</p>
          </div>
          <div className="rounded-lg bg-white/15 p-2">
            <p className="opacity-80">ผลตอบแทน</p>
            <p className="mt-0.5 font-semibold">{totalReturn.toFixed(0)}%</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-2 text-xs font-semibold">การเติบโตรายปี</h3>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="totalG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="investedG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#9ca3af" tickFormatter={(y: number) => `ปี ${y}`} />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" tickFormatter={(v: number) => `฿${(v/1_000_000).toFixed(1)}M`} width={55} />
                <Tooltip
                  formatter={(v: number, k: string) => [formatTHB(Number(v)), k === 'total' ? 'มูลค่ารวม' : k === 'invested' ? 'เงินที่ใส่' : 'กำไร']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="invested" name="เงินที่ใส่" stroke="#9ca3af" fill="url(#investedG)" strokeWidth={2} />
                <Area type="monotone" dataKey="total" name="มูลค่ารวม" stroke="#3B82F6" fill="url(#totalG)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            ⚠️ DCA ไม่ใช่สูตรสำเร็จ
          </p>
          <ul className="mt-1 ml-4 list-disc space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
            <li>ผลตอบแทนในอดีตไม่รับประกันอนาคต</li>
            <li>ต้องมีวินัย ลงทุนต่อเนื่องแม้ตลาดผันผวน</li>
            <li>กระจายความเสี่ยงในหลายสินทรัพย์</li>
            <li>ผลคำนวณนี้ไม่รวมเงินเฟ้อและภาษี</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
