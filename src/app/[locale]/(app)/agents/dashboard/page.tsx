import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, Shield, Copy, Users, Mail, Phone, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { AgentForm } from '@/components/agents/agent-form';
import { LeadRow } from '@/components/agents/lead-row';
import { CopyInviteLink } from '@/components/agents/copy-invite-link';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'รอตรวจสอบ', className: 'bg-amber-100 text-amber-700' },
  active: { label: 'เปิดใช้งาน', className: 'bg-emerald-100 text-emerald-700' },
  suspended: { label: 'พักการใช้งาน', className: 'bg-rose-100 text-rose-700' },
  expired: { label: 'ใบอนุญาตหมดอายุ', className: 'bg-slate-100 text-slate-700' },
};

const LEAD_STATUS: Record<string, string> = {
  new: '🆕 ใหม่',
  contacted: '📞 ติดต่อแล้ว',
  meeting: '📅 นัดหมาย',
  won: '✓ ปิดได้',
  lost: '✗ ไม่ปิด',
};

export default async function AgentDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = searchParams ? await searchParams : {};

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!agent) redirect('/agents/signup');

  // Subscription
  const { data: sub } = await supabase
    .from('agent_subscriptions')
    .select('*')
    .eq('agent_id', (agent as any).id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Leads (most recent 50)
  const { data: leads } = await supabase
    .from('insurance_leads')
    .select('id, name, phone, email, type, status, message, agent_notes, source_event, created_at, preferred_carrier, estimated_sum_insured')
    .eq('agent_id', (agent as any).id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Assigned users count
  const { count: assignedCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_agent_id', (agent as any).id);

  const inviteUrl =
    (process.env.NEXT_PUBLIC_APP_URL ?? 'https://lumenfi.app').replace(/\/$/, '') +
    `/i/${(agent as any).invite_code}`;

  const status = STATUS_LABELS[(agent as any).status] ?? STATUS_LABELS.pending;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Agent Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              {(agent as any).display_name}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${status.className}`}>
          {status.label}
        </span>
      </header>

      {sp.signup === 'ok' && (
        <Card className="border-emerald-300 bg-emerald-50">
          <CardContent className="p-3 text-sm text-emerald-700">
            ✓ สมัครเรียบร้อย — รอทีมงานตรวจสอบใบอนุญาตภายใน 1 วันทำการ จากนั้น
            invite link จะใช้งานได้
          </CardContent>
        </Card>
      )}

      {(agent as any).status === 'pending' && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-3 text-sm text-amber-700">
            ⏳ บัญชีกำลังรอการตรวจสอบ — สามารถ test ระบบและกรอกโปรไฟล์ได้
            แต่จะรับ lead ได้หลัง approve
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">ผู้ใช้ที่ผูกกับคุณ</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{assignedCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Lead ทั้งหมด</p>
            <p className="mt-1 text-2xl font-bold">{leads?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="transition-colors hover:bg-muted/30">
          <Link href="/agents/billing">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">แพลน →</p>
              <p className="mt-1 text-base font-bold capitalize">{(sub as any)?.plan ?? '—'}</p>
              {sub && (sub as any).plan === 'trial' && (
                <p className="text-[10px] text-muted-foreground">
                  {(sub as any).trial_leads_used}/{(sub as any).trial_leads_cap} leads
                </p>
              )}
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          href="/agents/analytics"
          className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            📈
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Analytics</p>
            <p className="text-[11px] text-muted-foreground">conversion · trend</p>
          </div>
        </Link>
        <Link
          href="/agents/coach"
          className="relative flex items-center gap-3 rounded-lg border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-4 transition-all hover:shadow-md"
        >
          <span className="absolute -top-2 right-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
            PAID
          </span>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 text-lg">
            🎓
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Sales Coach AI</p>
            <p className="text-[11px] text-muted-foreground">Starter+ · objection · pitch · content</p>
          </div>
        </Link>
        <Link
          href="/agents/line"
          className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            📱
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">LINE Notify</p>
            <p className="text-[11px] text-muted-foreground">รับ lead ผ่าน LINE</p>
          </div>
        </Link>
        <Link
          href="/agents/messages"
          className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            💬
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">ข้อความถึงลูกค้า</p>
            <p className="text-[11px] text-muted-foreground">broadcast card</p>
          </div>
        </Link>
        <Link
          href="/agents/billing"
          className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            💳
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">แพ็คเกจของฉัน</p>
            <p className="text-[11px] text-muted-foreground">อัพเกรด · ดูบิล</p>
          </div>
        </Link>
      </div>

      {/* Invite link */}
      <Card className="border-primary/30">
        <CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            🔗 ลิงก์เชิญลูกค้า
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            แชร์ลิงก์นี้ผ่าน LINE, Facebook, นามบัตร — ผู้สนใจคลิกเข้ามาสมัคร
            จะกลายเป็นลูกค้าคุณอัตโนมัติ
          </p>
          <div className="mt-3">
            <CopyInviteLink url={inviteUrl} />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            รหัสตัวแทน: <span className="font-mono font-semibold">{(agent as any).invite_code}</span>{' '}
            (ลูกค้าใส่ตอน signup ก็ได้)
          </p>
        </CardContent>
      </Card>

      {/* Leads list */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">📥 Lead ที่เข้ามา</h2>
            <p className="text-xs text-muted-foreground">50 รายล่าสุด</p>
          </div>
          {!leads || leads.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center">
              <p className="text-sm font-medium">ยังไม่มี lead เข้ามา</p>
              <p className="mt-1 text-xs text-muted-foreground">
                แชร์ invite link ด้านบนให้ผู้สนใจ
              </p>
            </div>
          ) : (
            <div>
              {(leads as any[]).map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit profile */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 text-sm font-semibold">✏️ แก้ไขโปรไฟล์ตัวแทน</h2>
          <AgentForm
            mode="edit"
            defaults={{
              display_name: (agent as any).display_name,
              company: (agent as any).company,
              agent_name: (agent as any).agent_name,
              email: (agent as any).email,
              phone: (agent as any).phone,
              line_id: (agent as any).line_id,
              license_number: (agent as any).license_number,
              license_valid_from: (agent as any).license_valid_from,
              license_valid_until: (agent as any).license_valid_until,
              bio: (agent as any).bio,
              products: (agent as any).products ?? [],
              booking_url: (agent as any).booking_url,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
