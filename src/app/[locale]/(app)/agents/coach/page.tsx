import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, GraduationCap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { SalesCoachChat } from '@/components/agents/sales-coach-chat';

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

  const products = ((agent as any).products as string[] | null) ?? [];

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
        </CardContent>
      </Card>

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
