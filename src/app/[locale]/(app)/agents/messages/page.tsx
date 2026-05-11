import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/server';
import { createMessage, toggleMessage, deleteMessage } from './actions';

export const dynamic = 'force-dynamic';

export default async function AgentMessagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!agent) redirect('/agents/signup');

  const { data: messages } = await supabase
    .from('agent_messages')
    .select('*')
    .eq('agent_id', (agent as any).id)
    .order('created_at', { ascending: false });

  // Count assigned prospects (for context)
  const { count: prospectCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_agent_id', (agent as any).id);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/agents/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">ข้อความถึงลูกค้า</h1>
          <p className="text-xs text-muted-foreground">
            broadcast card ไปยังลูกค้าที่ผูกกับคุณ ({prospectCount ?? 0} คน)
          </p>
        </div>
      </header>

      {/* New message form */}
      <Card>
        <CardContent className="p-5">
          <p className="mb-3 text-sm font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            สร้างข้อความใหม่
          </p>
          <form action={createMessage} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="title">หัวข้อ *</Label>
              <Input id="title" name="title" required placeholder="เช่น โปรโมชั่นประกันสุขภาพ TLT" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">เนื้อหา *</Label>
              <textarea
                id="body"
                name="body"
                required
                rows={3}
                className="w-full rounded-md border bg-background p-2 text-sm"
                placeholder="รายละเอียดสั้นๆ พร้อมเหตุผลที่ลูกค้าควรคุยกับคุณตอนนี้"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cta_label">ปุ่ม CTA (optional)</Label>
                <Input id="cta_label" name="cta_label" placeholder="คุยกับฉัน" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cta_url">URL ปุ่ม</Label>
                <Input id="cta_url" name="cta_url" placeholder="https://lin.ee/abc" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expires_at">วันหมดอายุ (optional)</Label>
              <Input id="expires_at" name="expires_at" type="datetime-local" />
              <p className="text-[10px] text-muted-foreground">เว้นว่าง = แสดงไปเรื่อยๆ จนปิดเอง</p>
            </div>
            <Button type="submit" className="w-full">
              <Plus className="mr-2 h-4 w-4" /> โพสต์ข้อความ
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Messages list */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold">ข้อความทั้งหมด</h2>
          {!messages || messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              ยังไม่มีข้อความ — สร้างอันแรกข้างบน
            </p>
          ) : (
            <div className="divide-y">
              {(messages as any[]).map((m) => {
                const expired = m.expires_at && new Date(m.expires_at) < new Date();
                return (
                  <div key={m.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{m.title}</p>
                          {!m.active && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                              ปิดอยู่
                            </span>
                          )}
                          {expired && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">
                              หมดอายุแล้ว
                            </span>
                          )}
                          {m.active && !expired && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
                              แสดงอยู่
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{m.body}</p>
                        {m.cta_label && (
                          <p className="mt-1 text-[11px] text-primary">
                            ปุ่ม: {m.cta_label} → {m.cta_url}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          สร้าง {new Date(m.created_at).toLocaleDateString('th-TH')}
                          {m.expires_at && (
                            <> · หมดอายุ {new Date(m.expires_at).toLocaleDateString('th-TH')}</>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <form action={toggleMessage}>
                          <input type="hidden" name="id" value={m.id} />
                          <input type="hidden" name="active" value={String(m.active)} />
                          <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0">
                            {m.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        </form>
                        <form action={deleteMessage}>
                          <input type="hidden" name="id" value={m.id} />
                          <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
