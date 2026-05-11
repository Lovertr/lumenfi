'use client';

import { useState, useTransition } from 'react';
import { Bell, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sendTestReminder } from '@/app/[locale]/(app)/settings/reminder/actions';

export function TestReminderButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ kind: 'ok' | 'fail'; msg: string } | null>(null);

  function onClick() {
    setResult(null);
    startTransition(async () => {
      const r = await sendTestReminder();
      if (r.sent > 0) {
        setResult({
          kind: 'ok',
          msg: `✓ ส่งแล้ว ${r.sent}/${r.total} อุปกรณ์ — เช็คมือถือ/บราวเซอร์`,
        });
        return;
      }
      const reasons: Record<string, string> = {
        no_subscriptions:
          'ยังไม่ได้เปิดสิทธิ์แจ้งเตือนบนอุปกรณ์นี้ — ไปที่ /recurring แล้วกด "Enable notifications"',
        vapid_not_configured: 'Admin ตั้ง VAPID keys ใน Vercel env ยังไม่ครบ',
        unauthorized: 'กรุณาเข้าสู่ระบบใหม่',
      };
      setResult({
        kind: 'fail',
        msg: reasons[r.reason ?? ''] ?? `ส่งไม่สำเร็จ (${r.reason ?? 'unknown'})`,
      });
    });
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={onClick}
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            กำลังส่ง...
          </>
        ) : (
          <>
            <Bell className="mr-2 h-4 w-4" />
            🔔 ส่งทดสอบไปยังอุปกรณ์ของฉัน
          </>
        )}
      </Button>
      {result && (
        <div
          className={`flex items-start gap-2 rounded-md border p-3 text-xs ${
            result.kind === 'ok'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-rose-300 bg-rose-50 text-rose-700'
          }`}
        >
          {result.kind === 'ok' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{result.msg}</span>
        </div>
      )}
    </div>
  );
}
