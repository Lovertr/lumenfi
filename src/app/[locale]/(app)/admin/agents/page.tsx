import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, Mail, Phone, MessageSquare, Star, ShieldOff, ShieldCheck, Check, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { approveAgent, rejectAgent, setDefaultAgent, suspendAgent, reactivateAgent } from './actions';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: '⏳ รอตรวจสอบ', cls: 'bg-amber-100 text-amber-700' },
  active: { label: '✓ เปิดใช้งาน', cls: 'bg-emerald-100 text-emerald-700' },
  suspended: { label: '⛔ พักการใช้งาน', cls: 'bg-rose-100 text-rose-700' },
  expired: { label: '🕒 หมดอายุ', cls: 'bg-slate-200 text-slate-700' },
};

export default async function AdminAgentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-xl font-bold">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="mt-2 text-sm text-muted-foreground">หน้านี้สำหรับ admin เท่านั้น</p>
      </div>
    );
  }

  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .order('status', { ascending: true }) // pending first alphabetically? we'll re-sort below
    .order('created_at', { ascending: false });

  // Re-sort: pending → active → suspended → expired
  const order: Record<string, number> = { pending: 0, active: 1, suspended: 2, expired: 3 };
  const sortedAgents = ((agents as any[]) ?? []).sort(
    (a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9)
  );

  const pendingCount = sortedAgents.filter((a) => a.status === 'pending').length;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/settings/admin">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Admin · ตัวแทนประกัน</h1>
            <p className="text-xs text-muted-foreground">อนุมัติ · ตั้ง default · พักการใช้งาน</p>
          </div>
        </div>
        {pendingCount > 0 && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700">
            {pendingCount} รอตรวจสอบ
          </span>
        )}
      </header>

      {sortedAgents.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium">ยังไม่มีตัวแทนสมัคร</p>
            <p className="mt-1 text-xs text-muted-foreground">
              ตัวแทนสมัครได้ที่ /agents/signup
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {sortedAgents.map((a) => {
          const status = STATUS_META[a.status] ?? STATUS_META.pending;
          const expiredSoon = a.license_valid_until
            ? new Date(a.license_valid_until).getTime() < Date.now() + 30 * 86400000
            : false;
          const expired = a.license_valid_until
            ? new Date(a.license_valid_until).getTime() < Date.now()
            : false;

          return (
            <Card key={a.id} className={a.is_default ? 'border-primary border-2' : ''}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{a.agent_name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.cls}`}>
                        {status.label}
                      </span>
                      {a.is_default && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          <Star className="h-3 w-3 fill-primary" /> Default
                        </span>
                      )}
                      {expired && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                          <AlertTriangle className="h-3 w-3" /> License หมดอายุ
                        </span>
                      )}
                      {!expired && expiredSoon && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          <AlertTriangle className="h-3 w-3" /> ใกล้หมดอายุ
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{a.display_name}</p>
                  </div>
                  <p className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
                    สมัครเมื่อ {new Date(a.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                  </p>
                </div>

                <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
                  <p>
                    <strong>License:</strong> {a.license_number}
                    {a.license_valid_until && (
                      <span className="text-muted-foreground"> · ถึง {a.license_valid_until}</span>
                    )}
                  </p>
                  {a.products?.length > 0 && (
                    <p className="text-muted-foreground">
                      <strong>ผลิตภัณฑ์:</strong> {a.products.join(' · ')}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 pt-1">
                    <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                      <Mail className="h-3 w-3" /> {a.email}
                    </a>
                    {a.phone && (
                      <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                        <Phone className="h-3 w-3" /> {a.phone}
                      </a>
                    )}
                    {a.line_id && (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <MessageSquare className="h-3 w-3" /> {a.line_id}
                      </span>
                    )}
                  </div>
                  {a.bio && (
                    <p className="pt-1 italic text-muted-foreground">"{a.bio}"</p>
                  )}
                  <p className="pt-1 text-muted-foreground">
                    <strong>Invite code:</strong> <span className="font-mono">{a.invite_code}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {a.status === 'pending' && (
                    <>
                      <form action={approveAgent}>
                        <input type="hidden" name="agent_id" value={a.id} />
                        <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                          <Check className="mr-1 h-3.5 w-3.5" /> อนุมัติ
                        </Button>
                      </form>
                      <form action={approveAgent}>
                        <input type="hidden" name="agent_id" value={a.id} />
                        <input type="hidden" name="set_default" value="on" />
                        <Button type="submit" size="sm" variant="outline">
                          <Star className="mr-1 h-3.5 w-3.5" /> อนุมัติ + ตั้ง Default
                        </Button>
                      </form>
                      <form action={rejectAgent}>
                        <input type="hidden" name="agent_id" value={a.id} />
                        <Button type="submit" size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50">
                          <X className="mr-1 h-3.5 w-3.5" /> ปฏิเสธ
                        </Button>
                      </form>
                    </>
                  )}
                  {a.status === 'active' && (
                    <>
                      {!a.is_default && (
                        <form action={setDefaultAgent}>
                          <input type="hidden" name="agent_id" value={a.id} />
                          <Button type="submit" size="sm" variant="outline">
                            <Star className="mr-1 h-3.5 w-3.5" /> ตั้งเป็น Default
                          </Button>
                        </form>
                      )}
                      <form action={suspendAgent}>
                        <input type="hidden" name="agent_id" value={a.id} />
                        <Button type="submit" size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50">
                          <ShieldOff className="mr-1 h-3.5 w-3.5" /> พักการใช้งาน
                        </Button>
                      </form>
                    </>
                  )}
                  {a.status === 'suspended' && (
                    <form action={reactivateAgent}>
                      <input type="hidden" name="agent_id" value={a.id} />
                      <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" /> เปิดใช้งานอีกครั้ง
                      </Button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
