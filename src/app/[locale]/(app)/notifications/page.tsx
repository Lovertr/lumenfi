import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Bell, Check, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { markAllRead, deleteAllRead, deleteNotification } from './actions';

export const dynamic = 'force-dynamic';

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

const TYPE_LABELS: Record<string, string> = {
  recurring: 'รายการประจำ',
  budget: 'งบประมาณ',
  watchlist: 'Watchlist',
  secretary: 'AI Secretary',
  reminder: 'เตือนบันทึก',
  system: 'ระบบ',
  broadcast: 'ประกาศ',
};

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, severity, title, body, url, icon, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const list = notifications ?? [];
  const unreadCount = list.filter((n: any) => !n.read_at).length;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <Bell className="h-5 w-5 text-primary" />
              แจ้งเตือนทั้งหมด
            </h1>
            <p className="text-xs text-muted-foreground">
              {list.length} รายการ · {unreadCount > 0 ? `${unreadCount} ใหม่` : 'อ่านครบแล้ว'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <form action={markAllRead}>
              <Button type="submit" size="sm" variant="outline">
                <Check className="mr-1 h-3.5 w-3.5" />
                อ่านแล้วทั้งหมด
              </Button>
            </form>
          )}
          {list.some((n: any) => n.read_at) && (
            <form action={deleteAllRead}>
              <Button type="submit" size="sm" variant="ghost" className="text-muted-foreground">
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                ลบที่อ่านแล้ว
              </Button>
            </form>
          )}
        </div>
      </header>

      {list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">ยังไม่มีแจ้งเตือน</p>
            <p className="mt-1 text-xs text-muted-foreground">
              ระบบจะส่งแจ้งเตือนเมื่อมีเรื่องสำคัญ
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((n: any) => {
            const isUnread = !n.read_at;
            const bg = SEVERITY_BG[n.severity] ?? 'bg-muted/30';
            const dot = SEVERITY_DOT[n.severity] ?? 'bg-muted-foreground';
            const date = new Date(n.created_at).toLocaleString('th-TH', {
              dateStyle: 'medium',
              timeStyle: 'short',
            });
            const inner = (
              <>
                <div className="mt-1 flex flex-col items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${isUnread ? dot : 'bg-transparent'}`} />
                  {n.icon && <span className="text-lg">{n.icon}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${isUnread ? 'font-bold' : 'font-medium'}`}>{n.title}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                      {TYPE_LABELS[n.type] ?? n.type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{date}</p>
                </div>
                {n.url && <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
              </>
            );
            const className = `flex items-start gap-3 rounded-lg border p-4 transition-all ${
              isUnread ? bg + ' border-transparent' : 'border-border bg-background hover:bg-muted/30'
            }`;
            return (
              <div key={n.id} className="group relative">
                {n.url ? (
                  <Link href={n.url} className={className}>
                    {inner}
                  </Link>
                ) : (
                  <div className={className}>{inner}</div>
                )}
                <form action={deleteNotification} className="absolute right-2 top-2 hidden group-hover:block">
                  <input type="hidden" name="id" value={n.id} />
                  <button type="submit" aria-label="ลบ" className="rounded-md p-1 text-muted-foreground hover:bg-muted/40 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
