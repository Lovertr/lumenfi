'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Check, AlertCircle, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { claimReferralCode } from '@/app/[locale]/(app)/settings/referral/actions';

type State = { ok?: boolean; error?: string; reward?: string } | null;

const ERR_MAP: Record<string, string> = {
  invalid_code: 'รหัสต้องเป็น 4-12 ตัวอักษร',
  code_not_found: 'ไม่พบรหัสนี้ — เช็คอีกที',
  self_referral: 'ใช้รหัสตัวเองไม่ได้ 😅',
  already_used: 'คุณใช้รหัสผู้ใช้ไปแล้ว 1 ครั้ง',
  already_bound_to_agent: 'คุณมีตัวแทนที่ผูกอยู่แล้ว — ติดต่อ admin ถ้าอยากเปลี่ยน',
  bind_failed: 'ผูกตัวแทนไม่สำเร็จ ลองใหม่',
  unauthorized: 'กรุณา login ก่อน',
};

function SubmitBtn({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className="shrink-0">
      {pending ? (
        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Check className="mr-1 h-3.5 w-3.5" />
      )}
      ยืนยัน
    </Button>
  );
}

export function ClaimReferralForm({
  /** Pre-fill the input. Comes from ?invite= URL param via the page. */
  presetCode,
  /** When true → code came from a trusted source (URL/cookie) or user is already bound → input is read-only. */
  locked,
  /** Optional human label explaining why locked. */
  lockedLabel,
}: {
  presetCode?: string;
  locked?: boolean;
  lockedLabel?: string;
}) {
  const [state, action] = useFormState<State, FormData>(claimReferralCode, null);

  // If already bound on first render, show that state.
  // No useEffect needed — the parent decides whether to render this form at all.

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
        <div className="relative flex-1">
          <Input
            name="code"
            required
            placeholder="ABC123"
            maxLength={12}
            defaultValue={presetCode ?? ''}
            readOnly={!!locked}
            className={`w-full font-mono uppercase tracking-[0.2em] ${
              locked ? 'cursor-not-allowed bg-muted/40 pr-9' : ''
            }`}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          {locked && (
            <Lock className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
        </div>
        <SubmitBtn disabled={!!locked && !presetCode} />
      </div>
      {locked && lockedLabel && (
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3" />
          {lockedLabel}
        </p>
      )}
      {state?.error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {ERR_MAP[state.error] ?? 'ลองใหม่อีกครั้ง'}
        </p>
      )}
    </form>
  );
}
