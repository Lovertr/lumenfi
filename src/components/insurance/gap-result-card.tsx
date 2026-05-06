'use client';

import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Shield, Activity, AlertTriangle, PiggyBank, ChevronDown, ChevronUp } from 'lucide-react';
import type { GapResult, Severity } from '@/lib/insurance/gap-analyzer';
import { formatTHB } from '@/lib/utils';

const TYPE_META: Record<GapResult['type'], { icon: any; label: string; color: string }> = {
  life: { icon: Heart, label: 'ประกันชีวิต', color: 'text-rose-600 bg-rose-50' },
  health: { icon: Activity, label: 'ประกันสุขภาพ', color: 'text-emerald-600 bg-emerald-50' },
  critical_illness: { icon: AlertTriangle, label: 'ประกันโรคร้ายแรง', color: 'text-amber-600 bg-amber-50' },
  accident: { icon: Shield, label: 'ประกันอุบัติเหตุ', color: 'text-blue-600 bg-blue-50' },
  emergency_fund: { icon: PiggyBank, label: 'เงินสำรองฉุกเฉิน', color: 'text-violet-600 bg-violet-50' },
};

const SEV_META: Record<Severity, { label: string; cls: string }> = {
  critical: { label: 'วิกฤต', cls: 'border-destructive/40 bg-destructive/5' },
  recommended: { label: 'ควรพิจารณา', cls: 'border-amber-300 bg-amber-50/40' },
  optional: { label: 'ขั้นต่อไป', cls: 'border-border' },
  covered: { label: '✓ คุ้มครองแล้ว', cls: 'border-emerald-300 bg-emerald-50/40' },
};

export function GapResultCard({ result }: { result: GapResult }) {
  const [open, setOpen] = useState(result.severity === 'critical');
  const meta = TYPE_META[result.type];
  const sev = SEV_META[result.severity];
  const Icon = meta.icon;
  const isCovered = result.severity === 'covered';
  const showQuoteCTA = !isCovered && result.type !== 'emergency_fund';

  return (
    <Card className={sev.cls}>
      <CardContent className="p-4">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-3 text-left"
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{meta.label}</p>
              <span className="text-xs">{sev.label}</span>
            </div>
            {!isCovered && result.gap > 0 && (
              <p className="text-xs text-muted-foreground">
                ขาดทุน {formatTHB(result.gap)}
              </p>
            )}
            {isCovered && (
              <p className="text-xs text-emerald-700">
                ทุน {formatTHB(result.current)}
              </p>
            )}
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {open && (
          <div className="mt-4 space-y-3 border-t pt-3">
            <p className="text-sm leading-relaxed text-muted-foreground">{result.reasoning}</p>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-muted/40 p-2">
                <p className="text-[11px] text-muted-foreground">ทุนปัจจุบัน</p>
                <p className="font-semibold">{formatTHB(result.current)}</p>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <p className="text-[11px] text-muted-foreground">ทุนแนะนำ</p>
                <p className="font-semibold">{formatTHB(result.recommended)}</p>
              </div>
            </div>

            {showQuoteCTA && result.suggestedPremium.max > 0 && (
              <div className="rounded-md bg-background/60 p-3 text-sm">
                <p className="text-xs text-muted-foreground">เบี้ยประมาณการ</p>
                <p className="font-semibold">
                  {formatTHB(result.suggestedPremium.min)} – {formatTHB(result.suggestedPremium.max)} / ปี
                </p>
                {result.taxBenefit > 0 && (
                  <p className="mt-1 text-xs text-emerald-700">
                    💰 ประหยัดภาษีได้ ~{formatTHB(result.taxBenefit)}/ปี
                  </p>
                )}
              </div>
            )}

            {showQuoteCTA && (
              <Button asChild size="sm" className="w-full">
                <Link href={`/insurance/quote?type=${result.type}&gap=${result.gap}`}>
                  ขอใบเสนอประกัน
                </Link>
              </Button>
            )}

            {result.type === 'emergency_fund' && !isCovered && (
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href="/goals/new?preset=emergency">
                  ตั้งเป้าหมายเงินสำรอง
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
