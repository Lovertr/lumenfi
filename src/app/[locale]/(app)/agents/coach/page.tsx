import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, GraduationCap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { SalesCoachChat } from '@/components/agents/sales-coach-chat';
import { CoachHistoryBar } from '@/components/agents/coach-history-bar';
import { listCoachConversations } from './actions';
import { findCompanyForAgent, getProductsForCompany, formatFreshness } from '@/lib/agents/products-db';

export const dynamic = 'force-dynamic';

const PRODUCT_LABELS: Record<string, string> = {
  life: 'ประกันชีวิต',
  health: 'ประกันสุขภาพ',
  ci: 'โรคร้าย (CI)',
  retirement: 'บำนาญ',
  savings: 'สะสมทรัพย์',
  accident: 'อุบัติเหตุ',
};

export default async function AgentCoachPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/' + locale + '/login');

  const { data: agent } = await supabase
    .from('agents')
    .select('id, status, agent_name, display_name, company, products')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!agent) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-6 text-sm text-amber-900">
            ⏳ คุณต้องสมัครเป็นตัวแทนก่อนถึงจะใช้ Sales Coach ได้ —{' '}
            <Link href="/agents/signup" className="font-semibold underline">
              สมัครที่นี่ →
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if ((agent as any).status !== 'active') {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-6 text-sm text-amber-900">
            ⏳ บัญชีตัวแทนของคุณยังรอ admin อนุมัติ — ใช้งาน Sales Coach ได้เมื่อสถานะ active
          </CardContent>
        </Card>
      </div>
    );
  }

  // Paywall: Sales Coach AI is for paid plans only (Starter+)
  const { data: sub } = await supabase
    .from('agent_subscriptions')
    .select('plan, status')
    .eq('agent_id', (agent as any).id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const paidPlans = ['starter', 'pro', 'team', 'founder'];
  const onPaidPlan =
    !!sub &&
    (sub as any).status === 'active' &&
    paidPlans.includes(((sub as any).plan ?? '').toLowerCase());

  if (!onPaidPlan) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
        <header className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/agents/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <GraduationCap className="h-5 w-5 text-amber-600" />
              Sales Coach AI
            </h1>
            <p className="text-xs text-muted-foreground">โค้ชนักขาย — สำหรับแพ็คเกจที่ชำระแล้ว</p>
          </div>
        </header>

        <Card className="relative overflow-hidden border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-amber-300/40 blur-3xl" />
          <CardContent className="relative space-y-4 p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-2xl text-white shadow-md">
                🎓
              </div>
              <div>
                <h2 className="text-lg font-bold text-amber-900">
                  Sales Coach AI เป็นฟีเจอร์ของแพ็คเกจ Starter ขึ้นไป
                </h2>
                <p className="mt-1 text-sm text-amber-800">
                  อัพเกรดเพื่อใช้ AI โค้ชนักขายที่ถูกเทรนเฉพาะคุณ — เทคนิคเปิด-ปิดดีล · objection handling · pitch ตาม persona · content marketing · follow-up cadence
                </p>
              </div>
            </div>

            <div className="grid gap-2 rounded-lg border border-amber-200 bg-white/60 p-4 text-sm sm:grid-cols-3">
              <div className="space-y-0.5">
                <p className="font-semibold">Starter</p>
                <p className="text-xs text-muted-foreground">฿299/เดือน · 25 leads</p>
              </div>
              <div className="space-y-0.5 rounded-md bg-amber-100 px-2 py-1">
                <p className="font-semibold text-amber-900">Pro ⭐ แนะนำ</p>
                <p className="text-xs text-amber-800">฿699/เดือน · leads ไม่จำกัด</p>
              </div>
              <div className="space-y-0.5">
                <p className="font-semibold">Team</p>
                <p className="text-xs text-muted-foreground">฿1,990/เดือน · 5 ตัวแทน</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="bg-amber-600 text-white hover:bg-amber-700">
                <Link href="/agents/pricing">ดูแพ็คเกจ + อัพเกรด</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/agents/dashboard">กลับ Dashboard</Link>
              </Button>
            </div>

            <p className="rounded-md bg-white/50 p-3 text-[11px] text-amber-900">
              💡 ระหว่าง trial (3 leads ฟรี 14 วัน) Sales Coach AI ยังไม่เปิด — แต่ฟีเจอร์อื่นใช้ได้ครบ:
              รับ lead · INA Report PDF · จัดการ pipeline · ดู analytics
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const products = ((agent as any).products as string[] | null) ?? [];
  const conversations = await listCoachConversations();
  const company = await findCompanyForAgent(
    supabase as any,
    (agent as any).company,
    (agent as any).display_name,
  );
  const catalogProducts = company
    ? await getProductsForCompany(supabase as any, company.id, products)
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/agents/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <GraduationCap className="h-5 w-5 text-amber-600" />
            Sales Coach AI
          </h1>
          <p className="text-xs text-muted-foreground">
            โค้ชนักขายส่วนตัว · ใช้ผลิตภัณฑ์ของคุณเป็น context
          </p>
        </div>
      </header>

      {/* Context strip */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-amber-50/40 to-orange-50/40">
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 text-xs">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold">{(agent as any).agent_name}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {(agent as any).display_name ?? (agent as any).company ?? '—'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">ผลิตภัณฑ์:</span>
            {products.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {products.map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900"
                  >
                    {PRODUCT_LABELS[p] ?? p}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          {company && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100">✓</span>
              <span>
                ฐานข้อมูลผลิตภัณฑ์ {company.name}: <b>{catalogProducts.length}</b> ตัว ·{' '}
                {formatFreshness(company.last_synced_at)}
              </span>
            </div>
          )}
          {!company && (
            <div className="text-[11px] text-amber-700">
              ⚠️ ยังไม่มีฐานข้อมูลผลิตภัณฑ์สำหรับบริษัทนี้ — AI จะแนะนำเป็นประเภททั่วไป
            </div>
          )}
        </CardContent>
      </Card>

      <CoachHistoryBar conversations={conversations} />

      <SalesCoachChat />

      <Card className="border-dashed">
        <CardContent className="space-y-1 p-4 text-[11px] text-muted-foreground">
          <p>
            💡 <b>เคล็ดลับ:</b> Sales Coach AI ตอบโดยอ้างอิงผลิตภัณฑ์ที่คุณขายจริง — ถ้ายังไม่ครบ ไปแก้ที่{' '}
            <Link href="/agents/dashboard" className="font-semibold underline">
              Dashboard → แก้ไขโปรไฟล์ตัวแทน
            </Link>
          </p>
          <p>
            🔒 ข้อมูลบทสนทนาไม่ถูกแชร์กับผู้ใช้คนอื่น · ไม่ถูกเก็บที่ AI provider ปลายทาง (ตาม privacy mode ใน /ai/settings)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
