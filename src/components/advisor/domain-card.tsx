'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Loader2, ChevronRight, Sparkles } from 'lucide-react';
import { generateAndSaveReport } from '@/app/[locale]/(app)/advisor/actions';
import type { AdvisorDomain } from '@/lib/advisor/prompts';

interface Props {
  domain: AdvisorDomain;
  title: string;
  description: string;
  icon: string;
  color: string;
  hero?: boolean;
}

export function DomainCard({ domain, title, description, icon, color, hero = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const errorText: Record<string, string> = {
    no_ai_key: 'ยังไม่ได้ตั้งค่า AI key — ไปที่ /ai/settings',
    no_byo_key: 'ยังไม่ได้ตั้งค่า AI key — ไปที่ /ai/settings',
    no_advisor_quota: 'หมดโควต้าแล้ว — ดูแพลนได้ที่ /pricing',
    no_ai_access: 'ต้องสมัคร subscription หรือใช้ AI key ของตัวเอง',
    monthly_limit_exceeded: 'ใช้ครบ quota เดือนนี้แล้ว — รอเดือนหน้าหรืออัพเกรด',
    daily_limit_exceeded: 'ใช้ครบ quota วันนี้แล้ว — รอพรุ่งนี้หรืออัพเกรด',
    decryption_failed: 'ถอดรหัส API key ไม่สำเร็จ',
    no_snapshot: 'ดึงข้อมูลไม่ได้',
    invalid_api_key: 'API key ไม่ถูกต้อง',
    rate_limited: 'ใช้บ่อยเกิน รอสักครู่',
    ai_error: 'AI ตอบไม่ได้',
    save_failed: 'บันทึกไม่ได้ — ตรวจสอบ migration 14',
  };

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const r = await generateAndSaveReport(domain);
      if (r.ok && r.reportId) {
        router.push(`/advisor/r/${r.reportId}`);
      } else if ((r as any).upgradeUrl) {
        // Paywall — redirect to pricing
        router.push((r as any).upgradeUrl);
      } else {
        setError(r.error ?? 'unknown');
      }
    });
  };

  if (hero) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={`relative w-full overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-5 text-left text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.99] disabled:opacity-60 lg:p-7`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-3xl">{icon}</div>
            <p className="text-lg font-bold lg:text-xl">{title}</p>
            <p className="mt-1 text-xs opacity-90 lg:text-sm">{description}</p>
          </div>
          {pending ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Sparkles className="h-6 w-6 opacity-80" />
          )}
        </div>
        <div className="mt-3 flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium backdrop-blur w-fit">
          {pending ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ทันที'}
          {!pending && <ChevronRight className="h-3.5 w-3.5" />}
        </div>
        {error && (
          <p className="mt-3 rounded-md bg-white/20 px-3 py-1.5 text-xs">
            {errorText[error] ?? 'เกิดข้อผิดพลาด'}
          </p>
        )}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm disabled:opacity-60"
      >
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-xl`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="truncate text-[11px] text-muted-foreground">{description}</p>
        </div>
        {pending ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {error && (
        <p className="mt-1 rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
          {errorText[error] ?? 'เกิดข้อผิดพลาด'}
        </p>
      )}
    </div>
  );
}
