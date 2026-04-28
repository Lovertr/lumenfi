'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AccountType } from './account-type-config';

const THAI_BANKS = [
  'กสิกรไทย (KBank)',
  'ไทยพาณิชย์ (SCB)',
  'กรุงเทพ (BBL)',
  'กรุงไทย (KTB)',
  'กรุงศรีอยุธยา (BAY)',
  'ทหารไทยธนชาต (ttb)',
  'ออมสิน (GSB)',
  'ธ.ก.ส. (BAAC)',
  'ซีไอเอ็มบีไทย (CIMB)',
  'ยูโอบี (UOB)',
  'แลนด์ แอนด์ เฮ้าส์ (LH Bank)',
  'อาคารสงเคราะห์ (GHB)',
  'อิสลามแห่งประเทศไทย (IBank)',
  'อื่นๆ',
];

const CC_ISSUERS = [
  'KTC',
  'Citi',
  'KBank',
  'SCB',
  'Krungsri',
  'BBL',
  'KTB',
  'AEON',
  'TTB',
  'UOB',
  'CIMB',
  'อื่นๆ',
];

const E_WALLETS = ['TrueMoney Wallet', 'ShopeePay', 'Rabbit LINE Pay', 'PromptPay', 'AirPay', 'อื่นๆ'];

interface Props {
  type: AccountType;
  defaults?: {
    bank_name?: string | null;
    account_number?: string | null;
    account_holder?: string | null;
    note?: string | null;
    statement_day?: number | null;
    due_day?: number | null;
  };
}

export function AccountFormFields({ type, defaults = {} }: Props) {
  // Show different fields based on type
  if (type === 'bank' || type === 'savings') {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="bank_name">ธนาคาร</Label>
          <select
            id="bank_name"
            name="bank_name"
            defaultValue={defaults.bank_name ?? ''}
            className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-base"
          >
            <option value="">— เลือกธนาคาร —</option>
            {THAI_BANKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="account_number">เลขที่บัญชี (ไม่บังคับ)</Label>
          <Input
            id="account_number"
            name="account_number"
            inputMode="numeric"
            placeholder="123-4-56789-0"
            defaultValue={defaults.account_number ?? ''}
            maxLength={30}
          />
          <p className="text-xs text-muted-foreground">
            เก็บไว้ดูเอง — ข้อมูลเข้ารหัสด้วย RLS เห็นแค่คุณ
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="account_holder">ชื่อบัญชี (ไม่บังคับ)</Label>
          <Input
            id="account_holder"
            name="account_holder"
            placeholder="ชื่อ-นามสกุล ตามหน้าสมุดบัญชี"
            defaultValue={defaults.account_holder ?? ''}
            maxLength={100}
          />
        </div>
      </>
    );
  }

  if (type === 'credit_card') {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="bank_name">ผู้ออกบัตร</Label>
          <select
            id="bank_name"
            name="bank_name"
            defaultValue={defaults.bank_name ?? ''}
            className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-base"
          >
            <option value="">— เลือกผู้ออกบัตร —</option>
            {CC_ISSUERS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="account_number">เลขบัตร 4 ตัวท้าย (ไม่บังคับ)</Label>
          <Input
            id="account_number"
            name="account_number"
            inputMode="numeric"
            placeholder="1234"
            defaultValue={defaults.account_number ?? ''}
            maxLength={4}
          />
          <p className="text-xs text-muted-foreground">
            อย่ากรอกเลขบัตรเต็ม — ใช้แค่ 4 ตัวท้ายเพื่อจำว่าใบไหน
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="statement_day">วันสรุปยอด</Label>
            <Input
              id="statement_day"
              name="statement_day"
              type="number"
              min="1"
              max="31"
              placeholder="25"
              defaultValue={defaults.statement_day ?? ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="due_day">วันครบกำหนด</Label>
            <Input
              id="due_day"
              name="due_day"
              type="number"
              min="1"
              max="31"
              placeholder="15"
              defaultValue={defaults.due_day ?? ''}
            />
          </div>
        </div>
      </>
    );
  }

  if (type === 'e_wallet') {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="bank_name">ผู้ให้บริการ</Label>
          <select
            id="bank_name"
            name="bank_name"
            defaultValue={defaults.bank_name ?? ''}
            className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-base"
          >
            <option value="">— เลือกบริการ —</option>
            {E_WALLETS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="account_number">เบอร์ / Username (ไม่บังคับ)</Label>
          <Input
            id="account_number"
            name="account_number"
            placeholder="08X-XXX-XXXX"
            defaultValue={defaults.account_number ?? ''}
            maxLength={50}
          />
        </div>
      </>
    );
  }

  // Cash / other — no extra fields
  return null;
}

export function AccountNoteField({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="note">หมายเหตุ (ไม่บังคับ)</Label>
      <textarea
        id="note"
        name="note"
        rows={2}
        placeholder="โน้ต เช่น 'เงินเดือนหลัก', 'บัญชีออมก้อนแรก'"
        defaultValue={defaultValue ?? ''}
        maxLength={500}
        className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-base"
      />
    </div>
  );
}
