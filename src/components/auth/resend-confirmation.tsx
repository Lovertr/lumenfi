'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Mail, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resendConfirmationEmail } from '@/app/[locale]/(auth)/actions';

type State = { ok?: boolean; error?: string } | null;

const ERR_MAP: Record<string, string> = {
  invalid_email: 'อีเมลไม่ถูกต้อง',
  rate_limited: 'ส่งซ้ำได้ใน 60 วินาที — รอสักครู่',
  send_failed: 'ส่งไม่ได้ — ลองใหม่ในอีกสักครู่',
};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm" className="shrink-0">
      {pending ? (
        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Mail className="mr-1 h-3.5 w-3.5" />
      )}
      ส่งอีเมลใหม่
    </Button>
  );
}

export function ResendConfirmation({ defaultEmail = '' }: { defaultEmail?: string }) {
  const [state, action] = useFormState<State, FormData>(resendConfirmationEmail, null);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
      <p className="text-sm font-semibold text-amber-900">
        📧 ไม่ได้รับอีเมลยืนยัน?
      </p>
      <p className="mt-1 text-xs text-amber-800">
        เช็คโฟลเดอร์ <b>Spam / Junk</b> ของอีเมลคุณ — บางครั้งอีเมลยืนยันถูกกรองเข้าไป
      </p>
      <form action={action} className="mt-3 flex gap-2">
        <Input
          type="email"
          name="email"
          required
          defaultValue={defaultEmail}
          placeholder="อีเมลของคุณ"
          className="flex-1"
        />
        <Submit />
      </form>
      {state?.ok && (
        <p className="mt-2 flex items-center gap-1 text-xs text-emerald-700">
          <Check className="h-3 w-3" />
          ส่งอีเมลใหม่แล้ว — เช็คกล่องจดหมายภายใน 2 นาที (รวมถึง Spam)
        </p>
      )}
      {state?.error && (
        <p className="mt-2 flex items-center gap-1 text-xs text-rose-700">
          <AlertCircle className="h-3 w-3" />
          {ERR_MAP[state.error] ?? state.error}
        </p>
      )}
    </div>
  );
}
