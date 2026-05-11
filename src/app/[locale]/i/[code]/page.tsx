import { redirect } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { cookies } from 'next/headers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight, Sparkles } from 'lucide-react';
import { getAgentByInviteCode } from '@/lib/agents/queries';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const INVITE_COOKIE = 'lumenfi_invite_agent';

export default async function InviteLandingPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;

  const agent = await getAgentByInviteCode(code);
  if (!agent) {
    // Invalid code — redirect to landing page
    redirect(`/${locale}`);
  }

  // Set cookie so when user signs up, we know which agent invited them
  const cookieStore = await cookies();
  cookieStore.set(INVITE_COOKIE, agent.id!, {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  // If already signed in, assign agent immediately and redirect to dashboard
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    try {
      // Only assign if no agent assigned yet (don't overwrite existing)
      const { data: prof } = await supabase
        .from('profiles')
        .select('assigned_agent_id')
        .eq('id', user.id)
        .maybeSingle();
      if (!(prof as any)?.assigned_agent_id) {
        await supabase
          .from('profiles')
          .update({ assigned_agent_id: agent.id })
          .eq('id', user.id);
      }
    } catch {}
    redirect('/dashboard');
  }

  const productLabels: Record<string, string> = {
    life: 'ชีวิต',
    health: 'สุขภาพ',
    ci: 'โรคร้าย',
    retirement: 'บำนาญ',
    savings: 'สะสมทรัพย์',
    accident: 'อุบัติเหตุ',
  };
  const products = agent.products.map((p) => productLabels[p] ?? p).join(' · ');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary/5 p-4">
      <div className="mx-auto max-w-md space-y-4 pt-12">
        <div className="text-center">
          <Sparkles className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 text-2xl font-bold">ยินดีต้อนรับสู่ Lumenfi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            คุณได้รับคำเชิญจาก
          </p>
        </div>

        <Card className="border-primary/30">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              {agent.photo_url ? (
                <img
                  src={agent.photo_url}
                  alt={agent.agent_name}
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Shield className="h-7 w-7" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold">{agent.agent_name}</p>
                <p className="text-xs text-muted-foreground">{agent.display_name}</p>
                {agent.bio && (
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    "{agent.bio}"
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 space-y-1 rounded-md border bg-muted/30 p-3 text-xs">
              <p className="text-muted-foreground">
                เลขที่ใบอนุญาต: <span className="font-medium text-foreground">{agent.license_number}</span>
              </p>
              {products && (
                <p className="text-muted-foreground">ผลิตภัณฑ์: {products}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold">📊 Lumenfi คืออะไร</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>✓ จัดการรายรับ-รายจ่าย + ติดตามเงินสด</li>
              <li>✓ วิเคราะห์ช่องว่างประกัน (ขาดอะไร / ต้องการเท่าไหร่)</li>
              <li>✓ AI ที่ปรึกษาการเงินส่วนตัว</li>
              <li>✓ ฟรีไม่จำกัด · ปลอดภัย · ข้อมูลของคุณ</li>
            </ul>
            <div className="rounded-md bg-primary/5 p-3 text-xs">
              <p className="font-medium">💡 เมื่อสมัครผ่านลิงก์นี้</p>
              <p className="mt-1 text-muted-foreground">
                คุณจะได้คำปรึกษาด้านประกันจาก{' '}
                <strong>{agent.agent_name}</strong> ฟรี — ไม่มีค่าใช้จ่ายเพิ่ม
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Button asChild size="lg" className="w-full">
            <Link href="/signup">
              เริ่มใช้งานฟรี <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full">
            <Link href="/login">ผมมีบัญชีอยู่แล้ว</Link>
          </Button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          รหัสตัวแทน: <span className="font-mono font-semibold">{code}</span>
        </p>
      </div>
    </div>
  );
}
