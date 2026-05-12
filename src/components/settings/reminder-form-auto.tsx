'use client';

import { useState, useTransition } from 'react';
import { Clock, Check, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { saveReminderSettings } from '@/app/[locale]/(app)/settings/reminder/actions';

interface Props {
  initialEnabled: boolean;
  initialHour: number;
  initialSkipIfLogged: boolean;
  isTh: boolean;
  hourOptions: { value: number; label: string; hint?: string }[];
}

type SavedState = 'idle' | 'saving' | 'saved';

/**
 * Auto-save reminder settings. Every input change triggers an immediate
 * server-action call (debounced lightly). No 'Save settings' button —
 * the moment user ticks the checkbox the reminder is active.
 */
export function ReminderFormAuto({
  initialEnabled,
  initialHour,
  initialSkipIfLogged,
  isTh,
  hourOptions,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [hour, setHour] = useState(initialHour);
  const [skipIfLogged, setSkipIfLogged] = useState(initialSkipIfLogged);
  const [saved, setSaved] = useState<SavedState>('idle');
  const [pending, startTransition] = useTransition();

  function persist(next: { enabled: boolean; hour: number; skip: boolean }) {
    setSaved('saving');
    const fd = new FormData();
    if (next.enabled) fd.set('reminder_enabled', 'on');
    fd.set('reminder_hour', String(next.hour));
    if (next.skip) fd.set('reminder_skip_if_logged', 'on');
    startTransition(async () => {
      try {
        await saveReminderSettings(fd);
        setSaved('saved');
        setTimeout(() => setSaved('idle'), 1500);
      } catch {
        setSaved('idle');
      }
    });
  }

  const onToggleEnabled = (v: boolean) => {
    setEnabled(v);
    persist({ enabled: v, hour, skip: skipIfLogged });
  };
  const onChangeHour = (v: number) => {
    setHour(v);
    persist({ enabled, hour: v, skip: skipIfLogged });
  };
  const onToggleSkip = (v: boolean) => {
    setSkipIfLogged(v);
    persist({ enabled, hour, skip: v });
  };

  return (
    <div className="space-y-4">
      {/* Live save status */}
      <div className="flex items-center justify-end">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-opacity ${
            saved === 'idle' ? 'opacity-0' : 'opacity-100'
          } ${
            saved === 'saving'
              ? 'bg-amber-50 text-amber-700'
              : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {saved === 'saving' ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              {isTh ? 'กำลังบันทึก…' : 'Saving…'}
            </>
          ) : saved === 'saved' ? (
            <>
              <Check className="h-3 w-3" />
              {isTh ? 'บันทึกแล้ว' : 'Saved'}
            </>
          ) : null}
        </span>
      </div>

      {/* Enable toggle (instant) */}
      <label
        htmlFor="reminder_enabled"
        className="flex cursor-pointer items-center justify-between rounded-lg border bg-muted/30 px-4 py-3"
      >
        <div>
          <p className="text-sm font-medium">
            {isTh ? 'เปิดการแจ้งเตือนรายวัน' : 'Enable daily reminder'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isTh
              ? 'ติ๊กที่นี่ — บันทึกอัตโนมัติ ไม่ต้องกดปุ่ม'
              : 'Tick to enable — auto-saves, no button needed'}
          </p>
        </div>
        <input
          id="reminder_enabled"
          name="reminder_enabled"
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggleEnabled(e.target.checked)}
          disabled={pending}
          className="h-5 w-5 rounded border-input accent-primary"
        />
      </label>

      {/* Hour picker — only relevant if enabled */}
      <div className={`space-y-2 transition-opacity ${enabled ? 'opacity-100' : 'opacity-50'}`}>
        <Label htmlFor="reminder_hour" className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {isTh ? 'เวลาแจ้งเตือน (เวลาไทย)' : 'Reminder time (Bangkok TZ)'}
        </Label>
        <select
          id="reminder_hour"
          name="reminder_hour"
          value={String(hour)}
          onChange={(e) => onChangeHour(parseInt(e.target.value, 10))}
          disabled={!enabled || pending}
          className="block w-full rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed"
        >
          {hourOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
              {o.hint ? ` — ${o.hint}` : ''}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">
          {isTh
            ? '💡 แนะนำ 20:00-22:00 ก่อนนอน — ทบทวนรายจ่ายของวันได้ครบถ้วน'
            : '💡 Tip: 20:00-22:00 works best for end-of-day review'}
        </p>
      </div>

      {/* Skip if logged */}
      <label
        htmlFor="reminder_skip_if_logged"
        className={`flex cursor-pointer items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 transition-opacity ${
          enabled ? 'opacity-100' : 'opacity-50'
        }`}
      >
        <div>
          <p className="text-sm font-medium">
            {isTh ? 'ข้ามถ้าวันนี้บันทึกแล้ว' : 'Skip if already logged today'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isTh ? 'ไม่เตือนถ้ามีรายการของวันนี้แล้ว' : "Don't notify if today's transactions exist"}
          </p>
        </div>
        <input
          id="reminder_skip_if_logged"
          name="reminder_skip_if_logged"
          type="checkbox"
          checked={skipIfLogged}
          onChange={(e) => onToggleSkip(e.target.checked)}
          disabled={!enabled || pending}
          className="h-5 w-5 rounded border-input accent-primary"
        />
      </label>
    </div>
  );
}
