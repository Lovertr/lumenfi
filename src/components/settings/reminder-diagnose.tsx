'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, CheckCircle2, XCircle, Copy, Check } from 'lucide-react';
import { diagnoseReminderHealth } from '@/app/[locale]/(app)/settings/reminder/actions';

type Report = Awaited<ReturnType<typeof diagnoseReminderHealth>>;
type Check = { name: string; ok: boolean; detail: string };

export function ReminderDiagnose() {
  const [pending, start] = useTransition();
  const [report, setReport] = useState<Report | null>(null);
  const [copied, setCopied] = useState(false);

  function run() {
    start(async () => {
      const r = await diagnoseReminderHealth();
      setReport(r);
    });
  }

  async function copySql() {
    if (!report?.fixSql) return;
    await navigator.clipboard.writeText(report.fixSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <div
              className={
                report.ok
                  ? 'rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900'
                  : 'rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900'
              }
            >
              {report.ok
                ? '✓ ทุกอย่างพร้อม — ถ้ายังไม่ได้รับ ลองกดปุ่ม "ส่งทดสอบ" ข้างบน'
                : '⚠️ พบจุดที่ต้องแก้ — ดูรายการด้านล่าง'}
            </div>

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

            {report.fixSql && (
              <div className="mt-3 space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-blue-900">
                    🔧 วิธีแก้: ตั้ง Supabase pg_cron (ฟรี, ใช้เวลา 30 วินาที)
                  </p>
                  <Button onClick={copySql} size="sm" variant="outline" className="h-7 gap-1">
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" /> คัดลอกแล้ว
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> คัดลอก SQL
                      </>
                    )}
                  </Button>
                </div>
                <ol className="ml-4 list-decimal space-y-1 text-xs text-blue-900">
                  <li>เปิด Supabase Dashboard → SQL Editor</li>
                  <li>วาง SQL ที่คัดลอกไปด้านล่าง แล้วกด Run</li>
                  <li>กลับมาที่หน้านี้แล้วกดตรวจสอบใหม่ — ผลควรเป็น "ตรง" หมด</li>
                  <li>รอถึงเวลาที่ตั้ง (top of the hour) — push ควรมาถึงเอง</li>
                </ol>
                <pre className="mt-2 max-h-48 overflow-auto rounded bg-white p-2 text-[10px] leading-tight text-slate-700">
                  {report.fixSql}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
