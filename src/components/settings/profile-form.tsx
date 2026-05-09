'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateProfile } from '@/app/[locale]/(app)/settings/actions';
import { CheckCircle2, ChevronDown, ChevronRight, Sparkles, Briefcase, MapPin, TrendingUp } from 'lucide-react';

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
  // Income breakdown
  income_salary_monthly: number | null;
  income_side_monthly: number | null;
  income_investment_monthly: number | null;
  income_other_monthly: number | null;
  // Expense breakdown
  expense_food_monthly: number | null;
  expense_utilities_monthly: number | null;
  expense_phone_internet_monthly: number | null;
  expense_transport_monthly: number | null;
  expense_housing_monthly: number | null;
  expense_debt_payment_monthly: number | null;
  expense_insurance_monthly: number | null;
  expense_subscription_monthly: number | null;
  expense_other_monthly: number | null;
  // Demographic
  occupation: string | null;
  employment_type: string | null;
  province: string | null;
  risk_tolerance: string | null;
  investment_experience: string | null;
  financial_goal_summary: string | null;
}

function NumberField({ id, label, value, placeholder, hint }: {
  id: string;
  label: string;
  value: number | null;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">฿</span>
        <Input
          id={id}
          name={id}
          type="text"
          inputMode="decimal"
          defaultValue={value ?? ''}
          placeholder={placeholder ?? '0'}
          className="pl-7"
        />
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function CollapsibleSection({
  title,
  description,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-3 border-t pt-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            {description && <p className="mt-0.5 text-[11px] text-muted-foreground/80">{description}</p>}
          </div>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </div>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations('Settings.form');
  const [state, action] = useFormState<State, FormData>(updateProfile, null);

  // Compute auto-totals
  const incomeTotal =
    (Number(profile.income_salary_monthly) || 0) +
    (Number(profile.income_side_monthly) || 0) +
    (Number(profile.income_investment_monthly) || 0) +
    (Number(profile.income_other_monthly) || 0);
  const expenseTotal =
    (Number(profile.expense_food_monthly) || 0) +
    (Number(profile.expense_utilities_monthly) || 0) +
    (Number(profile.expense_phone_internet_monthly) || 0) +
    (Number(profile.expense_transport_monthly) || 0) +
    (Number(profile.expense_housing_monthly) || 0) +
    (Number(profile.expense_debt_payment_monthly) || 0) +
    (Number(profile.expense_insurance_monthly) || 0) +
    (Number(profile.expense_subscription_monthly) || 0) +
    (Number(profile.expense_other_monthly) || 0);

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
            <Input id="date_of_birth" name="date_of_birth" type="date" defaultValue={profile.date_of_birth ?? ''} />
            <p className="text-[11px] text-muted-foreground">ใช้คำนวณประกันสุขภาพ + เกษียณ</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="num_dependents">จำนวนคนในอุปการะ</Label>
            <Input id="num_dependents" name="num_dependents" type="number" min={0} max={20} defaultValue={profile.num_dependents ?? 0} />
            <p className="text-[11px] text-muted-foreground">บุตร / คู่สมรส / บุพการี</p>
          </div>
        </div>
      </div>

      {/* Currency */}
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

      {/* Demographic — for personalized AI advice */}
      <CollapsibleSection
        title="ข้อมูลส่วนตัวเพิ่มเติม"
        description="ช่วยให้ AI Advisor วิเคราะห์เหมาะกับคุณมากขึ้น"
        icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
        defaultOpen={!profile.occupation}
      >
        <div className="space-y-2">
          <Label htmlFor="occupation" className="text-xs">อาชีพ</Label>
          <Input id="occupation" name="occupation" defaultValue={profile.occupation ?? ''} placeholder="เช่น Software Engineer, ครู, เจ้าของธุรกิจ" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="employment_type" className="text-xs">ประเภทการจ้างงาน</Label>
            <select
              id="employment_type"
              name="employment_type"
              defaultValue={profile.employment_type ?? ''}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">— ไม่ระบุ —</option>
              <option value="employee">พนักงานประจำ</option>
              <option value="freelance">ฟรีแลนซ์</option>
              <option value="business_owner">เจ้าของธุรกิจ</option>
              <option value="student">นักเรียน/นักศึกษา</option>
              <option value="retired">เกษียณ</option>
              <option value="unemployed">ว่างงาน</option>
              <option value="other">อื่นๆ</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="province" className="text-xs">
              <MapPin className="mr-1 inline h-3 w-3" />
              จังหวัด
            </Label>
            <Input id="province" name="province" defaultValue={profile.province ?? ''} placeholder="กรุงเทพฯ" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="risk_tolerance" className="text-xs">
              <TrendingUp className="mr-1 inline h-3 w-3" />
              ความเสี่ยงรับได้
            </Label>
            <select
              id="risk_tolerance"
              name="risk_tolerance"
              defaultValue={profile.risk_tolerance ?? ''}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">— ไม่ระบุ —</option>
              <option value="conservative">ปลอดภัยสูง (Conservative)</option>
              <option value="moderate">ปานกลาง (Moderate)</option>
              <option value="aggressive">เสี่ยงสูง (Aggressive)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="investment_experience" className="text-xs">ประสบการณ์ลงทุน</Label>
            <select
              id="investment_experience"
              name="investment_experience"
              defaultValue={profile.investment_experience ?? ''}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">— ไม่ระบุ —</option>
              <option value="beginner">มือใหม่</option>
              <option value="intermediate">ปานกลาง</option>
              <option value="expert">เชี่ยวชาญ</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="financial_goal_summary" className="text-xs">
            <Sparkles className="mr-1 inline h-3 w-3" />
            เป้าหมายชีวิตด้านการเงิน
          </Label>
          <Textarea
            id="financial_goal_summary"
            name="financial_goal_summary"
            rows={3}
            defaultValue={profile.financial_goal_summary ?? ''}
            placeholder="เช่น เกษียณตอน 55 / ซื้อคอนโดในปี 2570 / ออมส่งลูกเรียนต่างประเทศ"
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground">เขียนให้ AI เข้าใจสิ่งที่คุณอยากบรรลุ</p>
        </div>
      </CollapsibleSection>

      {/* Income breakdown */}
      <CollapsibleSection
        title="รายได้ต่อเดือน (แยกประเภท)"
        description="กรอกเพื่อให้ AI เห็นภาพรายได้ — ใช้เป็น fallback เมื่อไม่มี transactions"
        icon={<span className="text-base">💰</span>}
        defaultOpen={false}
      >
        <NumberField
          id="income_salary_monthly"
          label="เงินเดือน (รับสุทธิ)"
          value={profile.income_salary_monthly}
          placeholder="30,000"
          hint="หลังหักภาษี + ประกันสังคม"
        />
        <NumberField
          id="income_side_monthly"
          label="รายได้เสริม / Freelance"
          value={profile.income_side_monthly}
          placeholder="5,000"
        />
        <NumberField
          id="income_investment_monthly"
          label="รายได้จากการลงทุน"
          value={profile.income_investment_monthly}
          placeholder="2,000"
          hint="ดอกเบี้ย ปันผล ค่าเช่า"
        />
        <NumberField
          id="income_other_monthly"
          label="รายได้อื่นๆ"
          value={profile.income_other_monthly}
          placeholder="0"
        />
        {incomeTotal > 0 && (
          <div className="rounded-md bg-success/10 p-2 text-xs">
            <span className="text-muted-foreground">รวม: </span>
            <span className="font-bold text-success">฿{incomeTotal.toLocaleString()}/เดือน</span>
          </div>
        )}
      </CollapsibleSection>

      {/* Expense breakdown */}
      <CollapsibleSection
        title="รายจ่ายต่อเดือน (แยกหมวด)"
        description="ใช้เป็น baseline ก่อนมีข้อมูลจริง — ระบบจะใช้ transactions เมื่อมีพอ"
        icon={<span className="text-base">💸</span>}
        defaultOpen={false}
      >
        <div className="grid grid-cols-2 gap-3">
          <NumberField id="expense_housing_monthly" label="ค่าเช่า / ผ่อนบ้าน" value={profile.expense_housing_monthly} />
          <NumberField id="expense_food_monthly" label="ค่าอาหาร" value={profile.expense_food_monthly} />
          <NumberField id="expense_utilities_monthly" label="ค่าน้ำ + ค่าไฟ" value={profile.expense_utilities_monthly} />
          <NumberField id="expense_phone_internet_monthly" label="โทรศัพท์ + เน็ต" value={profile.expense_phone_internet_monthly} />
          <NumberField id="expense_transport_monthly" label="เดินทาง / น้ำมัน" value={profile.expense_transport_monthly} />
          <NumberField id="expense_debt_payment_monthly" label="หนี้สินรวม/เดือน" value={profile.expense_debt_payment_monthly} hint="บัตรเครดิต+กู้+ผ่อนรถ" />
          <NumberField id="expense_insurance_monthly" label="เบี้ยประกัน" value={profile.expense_insurance_monthly} hint="เฉลี่ยต่อเดือน" />
          <NumberField id="expense_subscription_monthly" label="Subscription" value={profile.expense_subscription_monthly} hint="Netflix Spotify ฯลฯ" />
        </div>
        <NumberField id="expense_other_monthly" label="รายจ่ายอื่นๆ" value={profile.expense_other_monthly} placeholder="0" />
        {expenseTotal > 0 && (
          <div className="rounded-md bg-destructive/10 p-2 text-xs">
            <span className="text-muted-foreground">รวม: </span>
            <span className="font-bold text-destructive">฿{expenseTotal.toLocaleString()}/เดือน</span>
            {incomeTotal > 0 && (
              <span className="ml-2 text-muted-foreground">
                · เหลือ <b className={incomeTotal - expenseTotal >= 0 ? 'text-success' : 'text-destructive'}>
                  ฿{(incomeTotal - expenseTotal).toLocaleString()}
                </b>
              </span>
            )}
          </div>
        )}
      </CollapsibleSection>

      {/* Old "simple" estimates kept for backward compat */}
      <CollapsibleSection
        title="ประมาณการรายเดือน (รวม)"
        description="ใช้ถ้าไม่อยากกรอกแยกหมวด — ระบบจะใช้ตัวนี้เป็น fallback"
        defaultOpen={false}
      >
        <div className="grid grid-cols-2 gap-3">
          <NumberField id="monthly_income" label="รายได้/เดือน (รวม)" value={profile.monthly_income} placeholder="30,000" />
          <NumberField id="monthly_expense_estimate" label="รายจ่าย/เดือน (รวม)" value={profile.monthly_expense_estimate} placeholder="20,000" />
        </div>
      </CollapsibleSection>

      {/* Targets */}
      <CollapsibleSection
        title="เป้าหมายงบประมาณ"
        description="ใช้คำนวณ savings rate vs target"
        defaultOpen={false}
      >
        <div className="grid grid-cols-2 gap-3">
          <NumberField id="monthly_income_target" label={t('monthlyIncomeTarget')} value={profile.monthly_income_target} placeholder="50,000" />
          <NumberField id="monthly_expense_target" label={t('monthlyExpenseTarget')} value={profile.monthly_expense_target} placeholder="30,000" />
        </div>
      </CollapsibleSection>

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
