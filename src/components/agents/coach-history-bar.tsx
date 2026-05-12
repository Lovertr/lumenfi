'use client';

import { useState, useTransition } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { Trash2, History, MessageSquare, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteCoachConversation } from '@/app/[locale]/(app)/agents/coach/actions';

interface ConversationRow {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'เพิ่งพิมพ์';
  if (m < 60) return `${m} นาที`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมง`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day} วัน`;
  return d.toLocaleDateString('th-TH');
}

export function CoachHistoryBar({
  conversations,
  activeId,
}: {
  conversations: ConversationRow[];
  activeId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const router = useRouter();

  const onDelete = (id: string) => {
    setConfirmId(null);
    const form = new FormData();
    form.set('id', id);
    startTransition(async () => {
      await deleteCoachConversation(form);
      // If we deleted the active conversation, go back to the coach home
      if (activeId === id) router.push('/agents/coach');
      else router.refresh();
    });
  };

  return (
    <>
      {/* Toggle button (sticks to the top of the chat area) */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <History className="h-3.5 w-3.5" />
          ประวัติ ({conversations.length})
        </button>
        <Button asChild size="sm" variant="ghost" className="text-xs">
          <Link href="/agents/coach">
            <Plus className="mr-1 h-3.5 w-3.5" />
            ใหม่
          </Link>
        </Button>
      </div>

      {open && (
        <div className="rounded-lg border bg-background shadow-sm">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="text-xs font-semibold text-muted-foreground">ประวัติการแชท</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {conversations.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              ยังไม่มีประวัติ — เริ่มแชทแรกได้เลย
            </p>
          ) : (
            <ul className="max-h-[50vh] divide-y overflow-y-auto">
              {conversations.map((c) => {
                const isActive = c.id === activeId;
                const isConfirm = c.id === confirmId;
                return (
                  <li
                    key={c.id}
                    className={`group flex items-center gap-2 px-3 py-2.5 transition-colors ${
                      isActive ? 'bg-primary/5' : 'hover:bg-muted/40'
                    }`}
                  >
                    <Link
                      href={`/agents/coach/c/${c.id}`}
                      className="flex flex-1 items-center gap-2 overflow-hidden"
                      onClick={() => setOpen(false)}
                    >
                      <MessageSquare
                        className={`h-3.5 w-3.5 flex-none ${
                          isActive ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      />
                      <span className="flex-1 truncate text-sm">
                        {c.title || 'แชทไม่มีหัวข้อ'}
                      </span>
                      <span className="flex-none text-[10px] text-muted-foreground">
                        {timeAgo(c.updated_at)}
                      </span>
                    </Link>
                    {isConfirm ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onDelete(c.id)}
                          disabled={pending}
                          className="rounded-md bg-destructive px-2 py-1 text-[10px] font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                        >
                          ลบจริง
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          className="rounded-md border px-2 py-1 text-[10px] hover:bg-muted"
                        >
                          ยก
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmId(c.id)}
                        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
