'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2 } from 'lucide-react';
import { submitInsuranceLead } from '@/app/[locale]/(app)/insurance/quote/actions';

const TYPE_OPTIONS = [
  { value: 'review', label: 'ทบทวนความคุ้มครองทั้งหมด' },
  { value: 'life', label: 'ประกันชีวิต' },
  { value: 'health', label: 'ประกันสุขภาพ' },
  { value: 'critical_illness', label: 'ประกันโรคร้ายแรง' },
  { value: 'accident', label: 'ประกันอุบัติเหตุ' },
];

const CARRIER_OPTIONS = [
  { value: 'Allianz', label: 'Allianz Ayudhya' },
];

type State = { error?: string; success?: boolean } | null;

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? 'กำลังส่ง...' : 'ส่งคำขอ'}
    </Button>
  );
}

export function QuoteRequestForm({
  defaultType,
  defaultGap,
  defaultName,
  defaultEmail,
}: {
  defaultType: string;
  defaultGap: number | null;
  defaultName: string;
  defaultEmail: string;
}) {
  const [state, action] = useFormState<State, FormData>(submitInsuranceLead, null);
  const [type, setType] = useState(defaultType);

  if (state?.success) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        <div>
          <p className="text-lg font-semibold">ส่งคำขอเรียบร้อย ✅</p>
          <p className="mt-1 text-sm text-muted-foreground">
            ตัวแทน Lumenfi จะติดต่อกลับภายใน 1 วันทำการ
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          ข้อมูลนี้ไม่ใช่การซื้อทันที — ตัวแทนจะอธิบายเงื่อนไขก่อน
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="source_event" value="gap_analyzer" />
      {defaultGap !== null && (
        <input type="hidden" name="estimated_sum_insured" value={defaultGap} />
      )}

      <div className="space-y-2">
        <Label>สนใจประเภท</Label>
        <input type="hidden" name="type" value={type} />
        <div className="grid grid-cols-1 gap-2">
          {TYPE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setType(o.value)}
              className={`rounded-lg border-2 px-3 py-2 text-left text-sm transition-all ${
                type === o.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="preferred_carrier">บริษัทที่สนใจ</Label>
        <select
          id="preferred_carrier"
          name="preferred_carrier"
          defaultValue="either"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {CARRIER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">ชื่อ-นามสกุล *</Label>
        <Input id="name" name="name" defaultValue={defaultName} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">เบอร์โทร *</Label>
        <Input id="phone" name="phone" type="tel" placeholder="08X-XXX-XXXX" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email (ไม่บังคับ)</Label>
        <Input id="email" name="email" type="email" defaultValue={defaultEmail} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">ข้อความเพิ่มเติม (ไม่บังคับ)</Label>
        <textarea
          id="message"
          name="message"
          rows={3}
          maxLength={500}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="เช่น ต้องการประกันสุขภาพคุ้มครอง 3 ล้าน เน้น OPD"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error === 'missing_required' ? 'กรุณากรอกชื่อและเบอร์โทร' : 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง'}
        </p>
      )}

      <SubmitBtn />

      <p className="text-center text-[11px] text-muted-foreground">
        การส่งข้อมูลถือว่ายินยอมให้ตัวแทนติดต่อกลับ — ข้อมูลถูกเก็บเป็นความลับ
      </p>
    </form>
  );
}
