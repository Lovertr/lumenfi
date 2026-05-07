'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sendBroadcastPush } from '@/app/[locale]/(app)/settings/admin/broadcast/actions';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      ส่ง Broadcast
    </Button>
  );
}

const PRESETS = [
  { label: 'Major release', title: 'Lumenfi · ฟีเจอร์ใหม่!', body: 'มีอะไรใหม่ใน Lumenfi — แตะดูเลย', url: '/whats-new' },
  { label: 'Year-end tax', title: 'Lumenfi · ใกล้สิ้นปีแล้ว', body: 'อย่าลืมเช็คเพดานลดหย่อนภาษี RMF/SSF', url: '/investments/tax-saving' },
  { label: 'Health check', title: 'Lumenfi · ตรวจสุขภาพการเงินเดือนนี้', body: 'AI Advisor พร้อมวิเคราะห์ให้', url: '/advisor' },
];

export function BroadcastForm() {
  const [state, action] = useFormState<any, FormData>(sendBroadcastPush, null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');

  if (state?.ok && state.sent !== undefined) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
        <p className="font-semibold">ส่งเรียบร้อย</p>
        <p className="mt-1 text-xs text-muted-foreground">
          ส่งสำเร็จ {state.sent} / ทั้งหมด {state.totalSubs} subscriptions
          {state.failed > 0 && ` · ล้มเหลว ${state.failed}`}
        </p>
        <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
          ส่งครั้งใหม่
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label className="mb-1.5 block text-xs">เริ่มจาก preset</Label>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => { setTitle(p.title); setBody(p.body); setUrl(p.url); }}
              className="rounded-full border bg-background px-3 py-1 text-xs hover:bg-muted/40"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Lumenfi · ..." />
      </div>

      <div>
        <Label htmlFor="body">Body</Label>
        <Textarea id="body" name="body" required value={body} onChange={(e) => setBody(e.target.value)} maxLength={150} rows={2} />
        <p className="mt-1 text-[11px] text-muted-foreground">{body.length}/150 ตัวอักษร</p>
      </div>

      <div>
        <Label htmlFor="url">URL ปลายทาง (เมื่อกด notification)</Label>
        <Input id="url" name="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/whats-new" />
      </div>

      <input type="hidden" name="tag" value={`broadcast-${Date.now()}`} />

      {state?.error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {state.error === 'forbidden' && 'เฉพาะ admin เท่านั้น'}
            {state.error === 'missing_fields' && 'กรุณากรอก title + body'}
            {state.error === 'vapid_not_configured' && 'VAPID keys ยังไม่ได้ตั้งค่า'}
            {!['forbidden', 'missing_fields', 'vapid_not_configured'].includes(state.error) && state.error}
          </span>
        </div>
      )}

      <SubmitBtn />

      <p className="rounded-md bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
        ⚠️ การกระทำนี้ส่ง push หา users <b>ทุกคน</b>ที่เปิด permission — ส่งแล้วยกเลิกไม่ได้
      </p>
    </form>
  );
}
