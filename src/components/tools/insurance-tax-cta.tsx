'use client';

import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Sparkles } from 'lucide-react';
import { formatTHB } from '@/lib/utils';

interface Props {
  /** Estimated marginal tax rate (0-1) — e.g. 0.20 for 20% bracket */
  marginalRate: number;
  /** Currently used personal insurance deduction (out of 100K cap) */
  usedLifeDeduction: number;
  /** Currently used health insurance deduction (out of 25K cap) */
  usedHealthDeduction: number;
}

export function InsuranceTaxCTA({ marginalRate, usedLifeDeduction, usedHealthDeduction }: Props) {
  const lifeRoom = Math.max(0, 100_000 - usedLifeDeduction);
  const healthRoom = Math.max(0, 25_000 - usedHealthDeduction);

  // Suggested premium: amount that fully uses remaining deduction
  const lifeSavings = Math.round(lifeRoom * marginalRate);
  const healthSavings = Math.round(healthRoom * marginalRate);
  const totalSavings = lifeSavings + healthSavings;

  if (lifeRoom === 0 && healthRoom === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="p-4 text-center">
          <p className="text-sm font-semibold text-emerald-800">✓ ลดหย่อนประกันใช้ครบแล้ว</p>
          <p className="mt-1 text-xs text-emerald-700">
            คุณใช้สิทธิ์ลดหย่อนประกันชีวิต + สุขภาพเต็มเพดานแล้ว
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-amber-50">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">💰 ประหยัดภาษีได้อีก ~{formatTHB(totalSavings)}/ปี</p>
            <p className="text-xs text-muted-foreground">โดยซื้อประกันลดหย่อนเพิ่ม</p>
          </div>
        </div>

        <div className="space-y-2 rounded-lg bg-background/60 p-3 text-sm">
          {lifeRoom > 0 && (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">ประกันชีวิต/บำนาญ</p>
                <p className="text-[11px] text-muted-foreground">
                  ใช้แล้ว {formatTHB(usedLifeDeduction)} / 100,000
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">ซื้อเพิ่ม {formatTHB(lifeRoom)}</p>
                <p className="text-sm font-bold text-emerald-600">→ ประหยัด {formatTHB(lifeSavings)}</p>
              </div>
            </div>
          )}

          {healthRoom > 0 && (
            <div className="flex items-center justify-between gap-2 border-t pt-2">
              <div className="min-w-0">
                <p className="truncate font-medium">ประกันสุขภาพ</p>
                <p className="text-[11px] text-muted-foreground">
                  ใช้แล้ว {formatTHB(usedHealthDeduction)} / 25,000
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">ซื้อเพิ่ม {formatTHB(healthRoom)}</p>
                <p className="text-sm font-bold text-emerald-600">→ ประหยัด {formatTHB(healthSavings)}</p>
              </div>
            </div>
          )}
        </div>

        <Button asChild className="w-full">
          <Link href={`/insurance/quote?source_event=tax_planner`}>
            <Sparkles className="mr-1 h-4 w-4" />
            ขอใบเสนอประกัน — ตัวแทนติดต่อกลับใน 1 วัน
          </Link>
        </Button>

        <p className="text-center text-[11px] text-muted-foreground">
          คำนวณบนอัตราภาษีส่วนเพิ่ม {(marginalRate * 100).toFixed(0)}% — เฉพาะแผนที่มีองค์ประกอบคุ้มครองชีวิตเท่านั้น
        </p>
      </CardContent>
    </Card>
  );
}
