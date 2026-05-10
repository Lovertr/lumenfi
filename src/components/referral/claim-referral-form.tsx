'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { claimReferralCode } from '@/app/[locale]/(app)/settings/referral/actions';

type State = { ok?: boolean; error?: string; reward?: string } | null;

const ERR_MAP: Record<string, string> = {
  invalid_code: 'รหัสต้องเป็น 6 ตัวอักษร',
  code_not_found: 'ไม่พบรหัสนี้ — เช็คกับเพื่อนอีกที',
  self_referral: 'ใช้รหัสตัวเองไม่ได้ 😅',
  already_used: 'คุณใช้รหัสไปแล้ว 1 ครั้ง',
  unauthorized: 'กรุณา login ก่อน',
};

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="shrink-0">
      {pending ? (
        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Check className="mr-1 h-3.5 w-3.5" />
      )}
      ยืนยัน
    </Button>
  );
}

export function ClaimReferralForm() {
  const [state, action] = useFormState<State, FormData>(claimReferralCode, null);

  if (state?.ok) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-800/40 dark:bg-emerald-950/30">
        <p className="flex items-center gap-1 font-semibold text-emerald-900 dark:text-emerald-200">
          <Check className="h-4 w-4" />
          ใช้รหัสสำเร็จ!
        </p>
        <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
          {state.reward ?? 'รางวัลเพิ่มเข้าบัญชีแล้ว'}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <Input
          name="code"
          required
          placeholder="ABC123"
          maxLength={6}
          className="flex-1 font-mono uppercase tracking-[0.2em]"
          autoComplete="off"
          autoCapitalize="characters"
        />
        <SubmitBtn />
      </div>
      {state?.error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {ERR_MAP[state.error] ?? 'ลองใหม่อีกครั้ง'}
        </p>
      )}
    </form>
  );
}
