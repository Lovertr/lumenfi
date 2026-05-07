'use client';

import { useState } from 'react';
import { Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TAX_FUND_LIMITS, TAX_FUND_LABELS, type TaxFundType } from '@/lib/queries/tax-saving';
import { formatTHB } from '@/lib/utils';

interface Props {
  byType: Record<TaxFundType, { count: number; cost: number; value: number }>;
  totalContributedThisYear: number;
}

export function TaxFundProgress({ byType, totalContributedThisYear }: Props) {
  const [income, setIncome] = useState('');
  const incomeNum = parseFloat(income.replace(/,/g, '')) || 0;

  const types: TaxFundType[] = ['rmf', 'ssf', 'pvd'];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">เพดานภาษีปี 2026</h2>
        </div>

        <div className="mb-4">
          <Label htmlFor="income">รายได้ต่อปีของคุณ (บาท)</Label>
          <Input
            id="income"
            type="number"
            inputMode="decimal"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="เช่น 1,200,000"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            ใช้คำนวณเพดานสูงสุดที่ใช้ลดหย่อนได้
          </p>
        </div>

        <div className="space-y-3">
          {types.map((t) => {
            const limit = TAX_FUND_LIMITS[t];
            const data = byType[t] ?? { count: 0, cost: 0, value: 0 };
            const maxFromIncome = incomeNum > 0 ? incomeNum * (limit.maxPercentOfIncome / 100) : 0;
            const cap = incomeNum > 0 ? Math.min(maxFromIncome, limit.maxAbsolute) : limit.maxAbsolute;
            const used = data.cost;
            const remaining = Math.max(0, cap - used);
            const percent = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;

            const isFull = used >= cap && cap > 0;
            const isNearFull = percent > 80 && !isFull;

            return (
              <div key={t} className="rounded-lg border bg-background p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{TAX_FUND_LABELS[t]}</span>
                    {isFull && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {isNearFull && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {data.count} กอง
                  </span>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{formatTHB(used)} / {formatTHB(cap)}</span>
                    <span className={`font-semibold ${isFull ? 'text-success' : isNearFull ? 'text-amber-600' : 'text-primary'}`}>
                      {percent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all ${
                        isFull ? 'bg-success' : isNearFull ? 'bg-amber-500' : 'bg-primary'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{limit.description}</span>
                  {remaining > 0 && incomeNum > 0 && (
                    <span className="font-medium text-success">เหลือ {formatTHB(remaining)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {totalContributedThisYear > 0 && (
          <p className="mt-3 rounded-md bg-primary/10 p-2 text-xs text-primary">
            💡 รวมเงินสมทบกองทุนภาษีปีนี้: <span className="font-semibold">{formatTHB(totalContributedThisYear)}</span>
            {incomeNum > 0 && totalContributedThisYear > 0 && ` (ประหยัดภาษีโดยประมาณ ${formatTHB(totalContributedThisYear * 0.1)})`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
