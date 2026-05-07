'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPolicy, updatePolicy } from '@/app/[locale]/(app)/insurance/policies/actions';
import { Heart, Activity, AlertTriangle, Shield, Car, Home, Plane, FileText } from 'lucide-react';

const TYPES = [
  { v: 'life', label: 'ชีวิต', icon: Heart },
  { v: 'health', label: 'สุขภาพ', icon: Activity },
  { v: 'critical_illness', label: 'โรคร้าย', icon: AlertTriangle },
  { v: 'accident', label: 'อุบัติเหตุ', icon: Shield },
  { v: 'car', label: 'รถ', icon: Car },
  { v: 'home', label: 'บ้าน', icon: Home },
  { v: 'travel', label: 'ท่องเที่ยว', icon: Plane },
  { v: 'other', label: 'อื่นๆ', icon: FileText },
] as const;

type State = { error?: string } | null;

function SubmitBtn({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? 'กำลังบันทึก...' : mode === 'create' ? 'บันทึกกรมธรรม์' : 'อัปเดต'}
    </Button>
  );
}

interface Defaults {
  id?: string;
  type?: string;
  carrier?: string;
  policy_name?: string | null;
  policy_number?: string | null;
  sum_insured?: number;
  annual_premium?: number;
  start_date?: string | null;
  renewal_date?: string | null;
  beneficiary?: string | null;
  notes?: string | null;
}

export function PolicyForm({ mode = 'create', defaults }: { mode?: 'create' | 'edit'; defaults?: Defaults }) {
  const action_fn = mode === 'edit' ? updatePolicy : createPolicy;
  const [state, action] = useFormState<State, FormData>(action_fn, null);
  const [type, setType] = useState(defaults?.type ?? 'life');

  return (
    <form action={action} className="space-y-4">
      {mode === 'edit' && defaults?.id && <input type="hidden" name="id" value={defaults.id} />}
      <input type="hidden" name="type" value={type} />

      <div className="space-y-2">
        <Label>ประเภท</Label>
        <div className="grid grid-cols-4 gap-2">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const active = type === t.v;
            return (
              <button
                key={t.v}
                type="button"
                onClick={() => setType(t.v)}
                className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 transition-all ${
                  active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="carrier">บริษัทประกัน *</Label>
        <Input id="carrier" name="carrier" defaultValue={defaults?.carrier ?? ''} placeholder="เช่น Allianz, AIA, FWD" required />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="policy_name">ชื่อแผน</Label>
          <Input id="policy_name" name="policy_name" defaultValue={defaults?.policy_name ?? ''} placeholder="เช่น Smart Health" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="policy_number">เลขกรมธรรม์</Label>
          <Input id="policy_number" name="policy_number" defaultValue={defaults?.policy_number ?? ''} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sum_insured">ทุนคุ้มครอง (฿)</Label>
          <Input id="sum_insured" name="sum_insured" type="text" inputMode="decimal" defaultValue={defaults?.sum_insured ?? ''} placeholder="1,000,000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="annual_premium">เบี้ย/ปี (฿)</Label>
          <Input id="annual_premium" name="annual_premium" type="text" inputMode="decimal" defaultValue={defaults?.annual_premium ?? ''} placeholder="15,000" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start_date">วันเริ่ม</Label>
          <Input id="start_date" name="start_date" type="date" defaultValue={defaults?.start_date ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="renewal_date">วันต่ออายุ</Label>
          <Input id="renewal_date" name="renewal_date" type="date" defaultValue={defaults?.renewal_date ?? ''} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="beneficiary">ผู้รับผลประโยชน์</Label>
        <Input id="beneficiary" name="beneficiary" defaultValue={defaults?.beneficiary ?? ''} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">หมายเหตุ</Label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={defaults?.notes ?? ''}
          maxLength={500}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error === 'carrier_required' ? 'กรุณากรอกชื่อบริษัทประกัน' : 'เกิดข้อผิดพลาด'}
        </p>
      )}

      <SubmitBtn mode={mode} />
    </form>
  );
}
