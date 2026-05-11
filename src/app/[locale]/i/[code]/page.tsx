import { redirect } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight, Sparkles } from 'lucide-react';
import { getAgentByInviteCode } from '@/lib/agents/queries';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function InviteLandingPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;

  // Look up the agent. If invalid → send to public landing.
  let agent: Awaited<ReturnType<typeof getAgentByInviteCode>> = null;
  try {
    agent = await getAgentByInviteCode(code);
  } catch (err) {
    console.warn('[invite] lookup failed:', (err as any)?.message);
  }
  if (!agent) {
    redirect(`/${locale}`);
  }

  // If already signed in: bind to this agent (if not already bound), then go to dashboard.
  // NOTE: we do NOT call cookies().set() here — that's only allowed in server actions
  // or route handlers. Instead we propagate the invite code via ?invite= on the CTAs
  // so /signup + /login can pass it through.
  const supabase = createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
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
      redirect('/dashboard');
    }
  } catch (err) {
    // Swallow — never let auth lookup break the public invite landing.
    // (`redirect` throws an internal NEXT_REDIRECT which we must rethrow.)
    if ((err as any)?.digest?.startsWith?.('NEXT_REDIRECT')) throw err;
    console.warn('[invite] auth check failed:', (err as any)?.message);
  }

  const productLabels: Record<string, string> = {
    life: 'ชีวิต',
    health: 'สุขภาพ',
    ci: 'โรคร้าย',
    retirement: 'บำนาญ',
    savings: 'สะสมทรัพย์',
    accident: 'อุบัติเหตุ',
  };
  const products = (agent.products ?? []).map((p) => productLabels[p] ?? p).join(' · ');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary/5 p-4">
      <div className="mx-auto max-w-md space-y-4 pt-12">
        <div className="text-center">
          <Sparkles className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 text-2xl font-bold">ยินดีต้อนรับสู่ Lumenfi</h1>
          <p className="mt-1 text-sm text-muted-foreground">คุณได้รับคำเชิญจาก</p>
        </div>

        <Card className="border-primary/30">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              {agent.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
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
              <div className="min-w-0 flex-1">
                <p className="font-bold">{agent.agent_name}</p>
                <p className="text-xs text-muted-foreground">{agent.display_name}</p>
                {agent.bio && (
                  <p className="mt-1 text-xs italic text-muted-foreground">"{agent.bio}"</p>
                )}
              </div>
            </div>
            <div className="mt-3 space-y-1 rounded-md border bg-muted/30 p-3 text-xs">
              <p className="text-muted-foreground">
                เลขที่ใบอนุญาต:{' '}
                <span className="font-medium text-foreground">{agent.license_number}</span>
              </p>
              {products && <p className="text-muted-foreground">ผลิตภัณฑ์: {products}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="text-sm font-semibold">📊 Lumenfi คืออะไร</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>✓ จัดการรายรับ-รายจ่าย + ติดตามเงินสด</li>
              <li>✓ วิเคราะห์ Gap ประกัน (ขาดอะไร / ต้องการเท่าไร)</li>
              <li>✓ AI ที่ปรึกษาการเงินส่วนตัว 8 มิติ</li>
              <li>✓ ฟรีตลอดไป · ปลอดภัย (Supabase RLS)</li>
            </ul>
            <div className="rounded-md bg-primary/5 p-3 text-xs">
              <p className="font-medium">💡 เมื่อสมัครผ่านลิงก์นี้</p>
              <p className="mt-1 text-muted-foreground">
                คุณจะได้คำปรึกษาด้านประกันจาก <strong>{agent.agent_name}</strong> ฟรี — ไม่มีค่าใช้จ่ายเพิ่ม
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Button asChild size="lg" className="w-full">
            <Link href={{ pathname: '/signup', query: { invite: code } }}>
              เริ่มใช้งานฟรี <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full">
            <Link href={{ pathname: '/login', query: { invite: code } }}>ผมมีบัญชีอยู่แล้ว</Link>
          </Button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          รหัสตัวแทน: <span className="font-mono font-semibold">{code}</span>
        </p>
      </div>
    </div>
  );
}
