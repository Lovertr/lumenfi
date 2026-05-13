'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { diagnoseReminderHealth, fireCronNow } from '@/app/[locale]/(app)/settings/reminder/actions';

type Report = Awaited<ReturnType<typeof diagnoseReminderHealth>>;
type Check = { name: string; ok: boolean; detail: string };
type FireResult = Awaited<ReturnType<typeof fireCronNow>>;

export function ReminderDiagnose() {
  const [pending, start] = useTransition();
  const [firing, startFire] = useTransition();
  const [report, setReport] = useState<Report | null>(null);
  const [fire, setFire] = useState<FireResult | null>(null);

  function run() {
    start(async () => {
      setReport(await diagnoseReminderHealth());
      setFire(null);
    });
  }

  function trigger() {
    startFire(async () => {
      setFire(await fireCronNow());
    });
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-blue-600" />
              ตรวจสุขภาพระบบเตือน
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              เช็คทุกองค์ประกอบที่ทำให้ push delivery ทำงาน
            </p>
          </div>
          <Button onClick={run} disabled={pending} size="sm" variant="outline">
            {pending ? 'กำลังตรวจ...' : 'ตรวจสอบ'}
          </Button>
        </div>

        {report && (
          <div className="space-y-2 pt-2">
            <ul className="space-y-2 text-sm">
              {report.checks.map((c: Check, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  {c.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground break-words">{c.detail}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-purple-900">⚡ ยิง cron ตอนนี้</p>
                <Button onClick={trigger} disabled={firing} size="sm" variant="outline" className="h-7 gap-1">
                  <Zap className="h-3 w-3" />
                  {firing ? 'กำลังยิง...' : 'ยิงตอนนี้'}
                </Button>
              </div>
              <p className="text-xs text-purple-800">
                ทดสอบ pipeline จริงโดยไม่ต้องรอชั่วโมงถัดไป
              </p>
              {fire && (
                <div className={fire.ok ? 'rounded border border-emerald-300 bg-white p-2 text-xs text-emerald-900' : 'rounded border border-red-300 bg-white p-2 text-xs text-red-900'}>
                  <p className="font-medium">
                    {fire.ok ? `✓ HTTP ${fire.status} — endpoint ตอบกลับ` : `✗ ${fire.error ?? 'failed'}`}
                  </p>
                  {fire.body && (
                    <pre className="mt-1 overflow-auto text-[10px] leading-tight text-slate-700">{JSON.stringify(fire.body, null, 2)}</pre>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
