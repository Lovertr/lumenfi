'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfile } from '@/app/[locale]/(app)/settings/actions';
import { CheckCircle2 } from 'lucide-react';

type State = { error?: string; success?: boolean } | null;

function SubmitBtn() {
  const t = useTranslations('Settings.form');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? '...' : t('submit')}
    </Button>
  );
}

interface Profile {
  email: string;
  full_name: string | null;
  default_currency: string;
  monthly_income_target: number | null;
  monthly_expense_target: number | null;
  date_of_birth: string | null;
  num_dependents: number | null;
  monthly_income: number | null;
  monthly_expense_estimate: number | null;
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations('Settings.form');
  const [state, action] = useFormState<State, FormData>(updateProfile, null);

  return (
    <form action={action} className="space-y-5">
      {/* Basic info */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          ข้อมูลส่วนตัว
        </p>

        <div className="space-y-2">
          <Label htmlFor="full_name">{t('fullName')}</Label>
          <Input id="full_name" name="full_name" defaultValue={profile.full_name ?? ''} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t('email')}</Label>
          <Input id="email" type="email" value={profile.email} disabled />
          <p className="text-xs text-muted-foreground">{t('emailReadonly')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="date_of_birth">วันเกิด</Label>
            <Input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              defaultValue={profile.date_of_birth ?? ''}
            />
            <p className="text-[11px] text-muted-foreground">
              ใช้คำนวณประกันสุขภาพ + เกษียณ
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="num_dependents">จำนวนคนในอุปการะ</Label>
            <Input
              id="num_dependents"
              name="num_dependents"
              type="number"
              min={0}
              max={20}
              defaultValue={profile.num_dependents ?? 0}
            />
            <p className="text-[11px] text-muted-foreground">
              บุตร / คู่สมรส / บุพการี
            </p>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="space-y-3 border-t pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          การตั้งค่าสกุลเงิน
        </p>

        <div className="space-y-2">
          <Label htmlFor="default_currency">{t('defaultCurrency')}</Label>
          <select
            id="default_currency"
            name="default_currency"
            defaultValue={profile.default_currency}
            className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-base"
          >
            <option value="THB">THB (฿) — บาทไทย</option>
            <option value="USD">USD ($) — US Dollar</option>
            <option value="EUR">EUR (€) — Euro</option>
            <option value="JPY">JPY (¥) — Japanese Yen</option>
            <option value="GBP">GBP (£) — British Pound</option>
            <option value="SGD">SGD ($) — Singapore Dollar</option>
          </select>
        </div>
      </div>

      {/* Estimates — used by AI advisor + insurance gap analyzer */}
      <div className="space-y-3 border-t pt-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            ประมาณการรายเดือน
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            ระบบใช้ตัวเลขจริงจากรายการในแอพเป็นหลัก ค่าตรงนี้ใช้เป็น fallback ถ้ายังไม่มีข้อมูล
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="monthly_income">รายได้/เดือน (ประมาณ)</Label>
            <Input
              id="monthly_income"
              name="monthly_income"
              type="text"
              inputMode="decimal"
              defaultValue={profile.monthly_income ?? ''}
              placeholder="30,000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly_expense_estimate">รายจ่ายเฉลี่ย/เดือน</Label>
            <Input
              id="monthly_expense_estimate"
              name="monthly_expense_estimate"
              type="text"
              inputMode="decimal"
              defaultValue={profile.monthly_expense_estimate ?? ''}
              placeholder="20,000"
            />
          </div>
        </div>
      </div>

      {/* Targets */}
      <div className="space-y-3 border-t pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          เป้าหมายงบประมาณ
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="monthly_income_target">{t('monthlyIncomeTarget')}</Label>
            <Input
              id="monthly_income_target"
              name="monthly_income_target"
              type="text"
              inputMode="decimal"
              defaultValue={profile.monthly_income_target ?? ''}
              placeholder="50,000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly_expense_target">{t('monthlyExpenseTarget')}</Label>
            <Input
              id="monthly_expense_target"
              name="monthly_expense_target"
              type="text"
              inputMode="decimal"
              defaultValue={profile.monthly_expense_target ?? ''}
              placeholder="30,000"
            />
          </div>
        </div>
      </div>

      {state?.success && (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          {t('saved')}
        </div>
      )}

      <SubmitBtn />
    </form>
  );
}
