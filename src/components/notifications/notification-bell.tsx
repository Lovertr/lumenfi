'use client';

import { useState, useTransition } from 'react';
import { Link } from '@/i18n/routing';
import { Bell, X, Check, ChevronRight } from 'lucide-react';
import { markAllRead, markRead } from '@/app/[locale]/(app)/notifications/actions';

interface Notification {
  id: string;
  type: string;
  severity: string;
  title: string;
  body: string;
  url: string | null;
  icon: string | null;
  read_at: string | null;
  created_at: string;
}

const SEVERITY_BG: Record<string, string> = {
  info: 'bg-sky-500/10',
  success: 'bg-emerald-500/10',
  warn: 'bg-amber-500/10',
  critical: 'bg-rose-500/10',
};
const SEVERITY_DOT: Record<string, string> = {
  info: 'bg-sky-500',
  success: 'bg-emerald-500',
  warn: 'bg-amber-500',
  critical: 'bg-rose-500',
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'เมื่อสักครู่';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} นาทีก่อน`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ชม.ก่อน`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} วันก่อน`;
  return new Date(iso).toLocaleDateString('th-TH', { dateStyle: 'short' });
}

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="แจ้งเตือน"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto bg-background shadow-2xl sm:max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold">แจ้งเตือน</h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                    {unreadCount} ใหม่
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => startTransition(() => markAllRead())}
                    disabled={pending}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" />
                    อ่านแล้วทั้งหมด
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)} aria-label="ปิด" className="rounded-md p-1 hover:bg-muted/50">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1 p-3">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="font-semibold">ยังไม่มีแจ้งเตือน</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ระบบจะแจ้งเตือนเรื่องสำคัญที่นี่<br />— Budget เกิน, ราคาหุ้นถึงเป้า, AI Secretary
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const isUnread = !n.read_at;
                  const bg = SEVERITY_BG[n.severity] ?? 'bg-muted/30';
                  const dot = SEVERITY_DOT[n.severity] ?? 'bg-muted-foreground';
                  const inner = (
                    <>
                      <div className="mt-1 flex flex-col items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${isUnread ? dot : 'bg-transparent'}`} />
                        {n.icon && <span className="text-base">{n.icon}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{n.body}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                      </div>
                      {n.url && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    </>
                  );
                  const className = `flex items-start gap-3 rounded-lg border p-3 transition-all ${
                    isUnread ? bg + ' border-transparent' : 'border-border bg-background hover:bg-muted/30'
                  } ${n.url ? 'cursor-pointer' : ''}`;
                  return (
                    <div key={n.id} className="group relative">
                      {n.url ? (
                        <Link href={n.url} onClick={() => setOpen(false)} className={className}>
                          {inner}
                        </Link>
                      ) : (
                        <div className={className}>{inner}</div>
                      )}
                      {isUnread && (
                        <form
                          action={(fd) => startTransition(() => markRead(fd))}
                          className="absolute right-2 top-2 hidden group-hover:block"
                        >
                          <input type="hidden" name="id" value={n.id} />
                          <button type="submit" className="rounded-md p-1 text-muted-foreground hover:bg-muted/40">
                            <Check className="h-3 w-3" />
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {notifications.length > 0 && (
              <div className="sticky bottom-0 border-t bg-background p-3">
                <Link
                  href="/notifications"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1 rounded-md py-2 text-xs font-medium text-primary hover:bg-primary/5"
                >
                  ดูทั้งหมด
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
