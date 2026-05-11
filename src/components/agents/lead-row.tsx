'use client';

import { useState } from 'react';
import { Phone, Mail, MessageSquare, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { updateLeadStatus, updateLeadNotes } from '@/app/[locale]/(app)/agents/dashboard/actions';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  type: string;
  status: string;
  message: string | null;
  agent_notes: string | null;
  source_event: string | null;
  preferred_carrier: string | null;
  estimated_sum_insured: number | null;
  created_at: string;
}

const STATUS_OPTIONS: { value: string; label: string; cls: string }[] = [
  { value: 'new', label: '🆕 ใหม่', cls: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', label: '📞 ติดต่อแล้ว', cls: 'bg-amber-100 text-amber-700' },
  { value: 'meeting', label: '📅 นัดหมาย', cls: 'bg-violet-100 text-violet-700' },
  { value: 'won', label: '✓ ปิดได้', cls: 'bg-emerald-100 text-emerald-700' },
  { value: 'lost', label: '✗ ไม่ปิด', cls: 'bg-slate-100 text-slate-600' },
];

export function LeadRow({ lead }: { lead: Lead }) {
  const [expanded, setExpanded] = useState(false);
  const current = STATUS_OPTIONS.find((s) => s.value === lead.status) ?? STATUS_OPTIONS[0];

  return (
    <div className="border-b py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/agents/leads/${lead.id}`} className="font-semibold hover:underline">
              {lead.name}
            </Link>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${current.cls}`}>
              {current.label}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                <Phone className="h-3 w-3" /> {lead.phone}
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 hover:text-primary">
                <Mail className="h-3 w-3" /> {lead.email}
              </a>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span>ประเภท: <strong>{lead.type}</strong></span>
            {lead.preferred_carrier && <span>· บ.: {lead.preferred_carrier}</span>}
            {lead.estimated_sum_insured && (
              <span>· ทุน: ฿{Number(lead.estimated_sum_insured).toLocaleString('th-TH')}</span>
            )}
          </div>
          {lead.message && (
            <p className="mt-1 text-[11px] italic text-muted-foreground">"{lead.message}"</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="whitespace-nowrap text-[11px] text-muted-foreground">
            {new Date(lead.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            {expanded ? <><ChevronUp className="h-3 w-3" /> ซ่อน</> : <><ChevronDown className="h-3 w-3" /> จัดการ</>}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 rounded-md border bg-muted/20 p-3">
          {/* Status update — buttons row */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">เปลี่ยนสถานะ</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <form key={s.value} action={updateLeadStatus}>
                  <input type="hidden" name="lead_id" value={lead.id} />
                  <input type="hidden" name="status" value={s.value} />
                  <button
                    type="submit"
                    disabled={lead.status === s.value}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-opacity ${s.cls} ${
                      lead.status === s.value
                        ? 'ring-2 ring-foreground/30 cursor-default'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {s.label}
                  </button>
                </form>
              ))}
            </div>
          </div>

          {/* Agent notes */}
          <form action={updateLeadNotes} className="space-y-1.5">
            <input type="hidden" name="lead_id" value={lead.id} />
            <label className="text-[11px] font-medium text-muted-foreground" htmlFor={`notes-${lead.id}`}>
              บันทึกของฉัน (ลูกค้ามองไม่เห็น)
            </label>
            <textarea
              id={`notes-${lead.id}`}
              name="agent_notes"
              rows={2}
              defaultValue={lead.agent_notes ?? ''}
              placeholder="เช่น โทรแล้ววันที่ X, สนใจ TLI Health, ขอเสนอราคาภายในศุกร์"
              className="w-full rounded-md border bg-background p-2 text-xs"
            />
            <Button type="submit" size="sm" variant="outline" className="h-7 text-[11px]">
              <Save className="mr-1 h-3 w-3" /> บันทึกโน้ต
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
