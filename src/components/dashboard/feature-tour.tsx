'use client';

import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { ChevronLeft, ChevronRight, X, Sparkles, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Step {
  icon: string;
  title: string;
  description: string;
  url?: string;
  cta?: string;
}

const STEPS: Step[] = [
  {
    icon: '🌟',
    title: 'AI Advisor — ที่ปรึกษา 8 มิติ',
    description:
      'วิเคราะห์ครบทุกด้าน: วางแผน หนี้ ลงทุน ภาษี เกษียณ เป้าหมาย ประกัน Emergency Fund — พร้อมแผน 30/60/90 วันที่ทำได้จริง',
    url: '/advisor',
    cta: 'ลอง AI Advisor',
  },
  {
    icon: '🤖',
    title: 'AI Secretary — เลขาเฝ้าระวัง',
    description:
      'ระบบเช็คสุขภาพการเงินทุกวัน — ถ้า DTI สูง EF ต่ำ Budget เกิน หรือเป้าหมายใกล้ deadline จะ push เตือนให้',
    url: '/advisor',
    cta: 'ดูที่ Advisor',
  },
  {
    icon: '🔁',
    title: 'DCA Auto — ลงทุนรายเดือนอัตโนมัติ',
    description:
      'ตั้งครั้งเดียว ระบบสร้าง buy transaction ทุกเดือนให้ + คำนวณ avg cost ใหม่อัตโนมัติ ไม่ต้องบันทึกเอง',
    url: '/investments/recurring',
    cta: 'ตั้ง DCA Auto',
  },
  {
    icon: '👁️',
    title: 'Watchlist + แจ้งเตือนราคา',
    description:
      'ตั้งราคาเป้าหมายของหุ้นที่สนใจ — ถ้าราคาถึงจะส่ง push notification ทันที เปิดใช้ได้ทั้งโหมดรอซื้อ (ลงถึง) และรอขาย (ขึ้นถึง)',
    url: '/investments/watchlist',
    cta: 'เพิ่ม Watchlist',
  },
  {
    icon: '🧾',
    title: 'รายงานภาษี + เพดาน RMF/SSF',
    description:
      'เครื่องคำนวณเพดานลดหย่อนภาษี + รายงานกำไร-ขาดทุนรายปีแบบ CSV ใช้ยื่น ภ.ง.ด. ได้',
    url: '/investments/tax-saving',
    cta: 'ลองคำนวณ',
  },
  {
    icon: '🎯',
    title: 'ผูกการลงทุนกับเป้าหมาย',
    description:
      'มูลค่าการลงทุนจะนับรวม progress ของเป้าหมายอัตโนมัติ — เห็นภาพรวมว่าใกล้ถึงเป้าแค่ไหน',
    url: '/goals',
    cta: 'ดูเป้าหมาย',
  },
  {
    icon: '💡',
    title: 'Tips: เริ่มจากตรงนี้ก่อน',
    description:
      '1) ตั้ง AI key ที่ /ai/settings\n2) สร้าง Emergency Fund goal\n3) ลอง AI Advisor "สุขภาพการเงินรวม"\n4) ตั้ง DCA Auto สำหรับการลงทุนหลัก\n5) เปิด push notification เพื่อรับ alerts',
  },
];

export function FeatureTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-sm transition-colors hover:bg-primary/10"
      >
        <Compass className="h-4 w-4 text-primary" />
        <span className="flex-1 text-left text-xs">
          <span className="font-semibold">ทัวร์ฟีเจอร์ใหม่</span>
          <span className="ml-1 text-muted-foreground">— 7 ขั้นตอน · 2 นาที</span>
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="ปิด"
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted/40"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Progress dots */}
            <div className="mb-4 flex justify-center gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? 'w-6 bg-primary' : i < step ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="text-center">
              <div className="mb-3 text-5xl">{cur.icon}</div>
              <p className="mb-1 flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wide text-primary">
                <Sparkles className="h-3 w-3" />
                ขั้น {step + 1} / {STEPS.length}
              </p>
              <h2 className="mb-2 text-lg font-bold">{cur.title}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {cur.description}
              </p>

              {cur.url && cur.cta && (
                <Button asChild size="sm" variant="outline" className="mt-4">
                  <Link href={cur.url} onClick={() => setOpen(false)}>
                    {cur.cta} →
                  </Link>
                </Button>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => s - 1)}
                disabled={isFirst}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                ก่อน
              </Button>
              {isLast ? (
                <Button size="sm" onClick={() => setOpen(false)}>
                  เสร็จแล้ว
                </Button>
              ) : (
                <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                  ถัดไป
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
