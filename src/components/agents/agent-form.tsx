'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createAgent, updateAgent } from '@/app/[locale]/(app)/agents/signup/actions';

type State = { error?: string; success?: boolean } | null;

function Sb({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? 'กำลังบันทึก...' : mode === 'create' ? 'สมัครเป็นตัวแทน' : 'บันทึก'}
    </Button>
  );
}

interface AgentDefaults {
  display_name?: string;
  company?: string | null;
  agent_name?: string;
  email?: string;
  phone?: string | null;
  line_id?: string | null;
  license_number?: string;
  license_valid_from?: string | null;
  license_valid_until?: string;
  bio?: string | null;
  products?: string[];
  booking_url?: string | null;
}

const PRODUCT_OPTIONS = [
  { id: 'life', label: 'ชีวิต' },
  { id: 'health', label: 'สุขภาพ' },
  { id: 'ci', label: 'โรคร้าย' },
  { id: 'retirement', label: 'บำนาญ' },
  { id: 'savings', label: 'สะสมทรัพย์' },
  { id: 'accident', label: 'อุบัติเหตุ' },
];

export function AgentForm({
  mode = 'create',
  defaults,
}: {
  mode?: 'create' | 'edit';
  defaults?: AgentDefaults;
}) {
  const action = mode === 'create' ? createAgent : updateAgent;
  const [state, formAction] = useFormState<State, FormData>(action, null);
  const initialProducts = defaults?.products ?? [];

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="display_name">ชื่อบริษัทประกัน *</Label>
        <Input
          id="display_name"
          name="display_name"
          required
          placeholder="กรุงเทพประกันชีวิต (BLA), เอฟดับบลิวดี (FWD), เอไอเอ (AIA) ฯลฯ"
          defaultValue={defaults?.display_name ?? ''}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="company">รหัสบริษัท (สั้น)</Label>
          <Input
            id="company"
            name="company"
            placeholder="BLA, FWD, AIA, TLI..."
            defaultValue={defaults?.company ?? ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agent_name">ชื่อตัวแทน *</Label>
          <Input
            id="agent_name"
            name="agent_name"
            required
            placeholder="ชื่อ-นามสกุล"
            defaultValue={defaults?.agent_name ?? ''}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">อีเมล (รับ lead) *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="agent@example.com"
          defaultValue={defaults?.email ?? ''}
        />
        <p className="text-[11px] text-muted-foreground">
          เมื่อผู้ใช้กดขอใบเสนอ ระบบจะส่งรายละเอียดลูกค้าให้ที่อีเมลนี้
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="phone">เบอร์โทร</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="08X-XXX-XXXX"
            defaultValue={defaults?.phone ?? ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="line_id">LINE ID</Label>
          <Input
            id="line_id"
            name="line_id"
            placeholder="@yourline"
            defaultValue={defaults?.line_id ?? ''}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
        <div>
          <p className="text-sm font-semibold">📜 ใบอนุญาตตัวแทน</p>
          <p className="text-[11px] text-muted-foreground">
            จำเป็นต้องใช้สำหรับการให้คำปรึกษาประกัน — จะแสดงต่อผู้ใช้
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="license_number">เลขที่ใบอนุญาต *</Label>
          <Input
            id="license_number"
            name="license_number"
            required
            placeholder="6801055107"
            defaultValue={defaults?.license_number ?? ''}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="license_valid_from">วันที่ออก</Label>
            <Input
              id="license_valid_from"
              name="license_valid_from"
              type="date"
              defaultValue={defaults?.license_valid_from ?? ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="license_valid_until">วันหมดอายุ *</Label>
            <Input
              id="license_valid_until"
              name="license_valid_until"
              type="date"
              required
              defaultValue={defaults?.license_valid_until ?? ''}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>ประเภทผลิตภัณฑ์ที่ขาย</Label>
        <div className="grid grid-cols-3 gap-2">
          {PRODUCT_OPTIONS.map((p) => {
            const checked = initialProducts.includes(p.id);
            return (
              <label
                key={p.id}
                className="flex items-center gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  name={`product_${p.id}`}
                  defaultChecked={checked}
                  className="h-4 w-4"
                />
                <span className="text-sm">{p.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">แนะนำตัวสั้นๆ (optional)</Label>
        <Input
          id="bio"
          name="bio"
          placeholder="เช่น ตัวแทน BLA ประสบการณ์ 5 ปี · เน้นวางแผนเกษียณ"
          defaultValue={defaults?.bio ?? ''}
        />
        <p className="text-[11px] text-muted-foreground">
          แสดงในการ์ดที่ปรึกษาประกันของลูกค้า — ใช้เป็น hook สั้นๆ
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking_url">ลิงก์นัดหมาย (Cal.com / Calendly)</Label>
        <Input
          id="booking_url"
          name="booking_url"
          type="url"
          placeholder="https://cal.com/your-name"
          defaultValue={defaults?.booking_url ?? ''}
        />
        <p className="text-[11px] text-muted-foreground">
          ใส่ลิงก์ Cal.com/Calendly ของคุณ — ลูกค้าจะกด "นัดเวลาคุย" ได้จากแอพ
        </p>
      </div>

      {state?.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error === 'missing_required'
            ? 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ (ดอกจัน *)'
            : 'เกิดข้อผิดพลาด — กรุณาลองอีกครั้ง'}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
          ✓ บันทึกแล้ว
        </div>
      )}

      <Sb mode={mode} />

      {mode === 'create' && (
        <p className="text-center text-[11px] text-muted-foreground">
          หลังสมัคร ทีมงานจะตรวจสอบใบอนุญาตและเปิดสิทธิ์ภายใน 1 วันทำการ
        </p>
      )}
    </form>
  );
}
