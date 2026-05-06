'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronRight, ChevronLeft, Sparkles, Wallet, Target, TrendingUp } from 'lucide-react';
import { completeOnboarding, skipOnboarding } from '@/app/[locale]/(app)/onboarding/actions';
import { LogoMark, Wordmark } from '@/components/brand/logo-mark';

const STEP_COUNT = 4;

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'เงินสด', emoji: '💵' },
  { value: 'bank', label: 'ธนาคาร', emoji: '🏦' },
  { value: 'savings', label: 'ออมทรัพย์', emoji: '🐷' },
  { value: 'e_wallet', label: 'e-Wallet', emoji: '📱' },
];

const GOAL_PRESETS = [
  { name: 'เงินสำรองฉุกเฉิน', amount: 100000, icon: '🛟' },
  { name: 'ดาวน์บ้าน', amount: 500000, icon: '🏠' },
  { name: 'เกษียณ', amount: 5000000, icon: '🌴' },
  { name: 'ท่องเที่ยว', amount: 50000, icon: '✈️' },
];

export function OnboardingWizard() {
  const tDash = useTranslations('Dashboard');
  const [step, setStep] = useState(0);
  const [accountType, setAccountType] = useState('bank');
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');

  return (
    <form action={completeOnboarding} className="space-y-4">
      <div className="flex items-center justify-center gap-2">
        <LogoMark size={36} />
        <Wordmark className="text-xl" />
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 py-2">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? 'w-8 bg-primary' : i < step ? 'w-1.5 bg-primary/60' : 'w-1.5 bg-muted'
            }`}
          />
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 0 && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold">ยินดีต้อนรับสู่ Lumenfi 🎉</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  มาตั้งค่าใน 1 นาที — เพื่อให้แอพพร้อมใช้งานเฉพาะคุณ
                </p>
              </div>
              <div className="space-y-2 rounded-lg bg-muted/40 p-4 text-left text-sm">
                <p>📊 ใส่รายได้-รายจ่ายต่อเดือน → AI คำนวณสุขภาพการเงินให้</p>
                <p>💼 บัญชีแรกของคุณ → เริ่มบันทึกได้ทันที</p>
                <p>🎯 เป้าหมาย (ไม่บังคับ) → กำหนดทิศทาง</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold">รายได้-รายจ่ายต่อเดือน</h2>
                <p className="text-xs text-muted-foreground">ประมาณการก็ได้ ปรับทีหลังได้</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_income">รายได้ต่อเดือน (บาท)</Label>
                <Input
                  id="monthly_income"
                  name="monthly_income"
                  type="text"
                  inputMode="decimal"
                  placeholder="30,000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_expense_estimate">รายจ่ายเฉลี่ย (บาท)</Label>
                <Input
                  id="monthly_expense_estimate"
                  name="monthly_expense_estimate"
                  type="text"
                  inputMode="decimal"
                  placeholder="20,000"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Wallet className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold">บัญชีแรกของคุณ</h2>
                <p className="text-xs text-muted-foreground">บัญชีไหนใช้บ่อยสุด?</p>
              </div>
              <div className="space-y-2">
                <Label>ประเภท</Label>
                <input type="hidden" name="account_type" value={accountType} />
                <div className="grid grid-cols-2 gap-2">
                  {ACCOUNT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setAccountType(t.value)}
                      className={`flex items-center gap-2 rounded-lg border-2 p-3 text-left transition-all ${
                        accountType === t.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <span className="text-xl">{t.emoji}</span>
                      <span className="text-sm font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_name">ชื่อบัญชี</Label>
                <Input
                  id="account_name"
                  name="account_name"
                  placeholder="เช่น KBank เงินเดือน"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial_balance">ยอดเงินปัจจุบัน (บาท)</Label>
                <Input
                  id="initial_balance"
                  name="initial_balance"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Target className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold">ตั้งเป้าหมายแรก (ไม่บังคับ)</h2>
                <p className="text-xs text-muted-foreground">ข้ามไปเพิ่มทีหลังก็ได้</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {GOAL_PRESETS.map((g) => (
                  <button
                    key={g.name}
                    type="button"
                    onClick={() => {
                      setGoalName(g.name);
                      setGoalAmount(String(g.amount));
                    }}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      goalName === g.name
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <span className="text-xl">{g.icon}</span>
                    <p className="mt-1 text-xs font-medium">{g.name}</p>
                    <p className="text-[10px] text-muted-foreground">{g.amount.toLocaleString()} บาท</p>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal_name">ชื่อเป้าหมาย</Label>
                <Input
                  id="goal_name"
                  name="goal_name"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="เช่น ดาวน์บ้าน"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_amount">ยอดเป้าหมาย (บาท)</Label>
                <Input
                  id="target_amount"
                  name="target_amount"
                  type="text"
                  inputMode="decimal"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value)}
                  placeholder="500,000"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        {step > 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep(step - 1)}
            className="flex-1"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            ย้อนกลับ
          </Button>
        )}
        {step < STEP_COUNT - 1 ? (
          <Button
            type="button"
            onClick={() => setStep(step + 1)}
            className="flex-1"
          >
            ถัดไป
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" className="flex-1">
            เสร็จสิ้น 🎉
          </Button>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        formAction={skipOnboarding}
        className="w-full text-muted-foreground"
      >
        ข้ามตอนนี้
      </Button>
    </form>
  );
}
