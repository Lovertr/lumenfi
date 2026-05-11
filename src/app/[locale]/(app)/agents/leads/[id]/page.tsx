import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft, Phone, Mail, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { generatePitchAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!agent) redirect('/agents/signup');

  const { data: lead } = await supabase
    .from('insurance_leads')
    .select('*')
    .eq('id', id)
    .eq('agent_id', (agent as any).id)
    .maybeSingle();
  if (!lead) notFound();

  // Check subscription tier
  const { data: sub } = await supabase
    .from('agent_subscriptions')
    .select('plan, status')
    .eq('agent_id', (agent as any).id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const plan = (sub as any)?.plan ?? 'trial';
  const hasAI = ['pro', 'team', 'founder'].includes(plan);

  const L = lead as any;
  const hasPitch = !!L.ai_pitch;
  const pitchAge = L.ai_pitch_generated_at
    ? Math.floor((Date.now() - new Date(L.ai_pitch_generated_at).getTime()) / 86400000)
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/agents/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">{L.name}</h1>
          <p className="text-xs text-muted-foreground">
            สร้างเมื่อ {new Date(L.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </header>

      {/* Lead info */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-semibold">📞 ติดต่อ</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <a href={`tel:${L.phone}`} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-emerald-700 hover:bg-emerald-100">
              <Phone className="h-4 w-4" /> {L.phone}
            </a>
            {L.email && (
              <a href={`mailto:${L.email}`} className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-blue-700 hover:bg-blue-100">
                <Mail className="h-4 w-4" /> {L.email}
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-md bg-muted/30 p-3 text-sm">
            <div>
              <p className="text-[11px] text-muted-foreground">ประเภท</p>
              <p className="font-medium">{L.type}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">สถานะ</p>
              <p className="font-medium capitalize">{L.status}</p>
            </div>
            {L.preferred_carrier && (
              <div>
                <p className="text-[11px] text-muted-foreground">บ.ที่สนใจ</p>
                <p className="font-medium">{L.preferred_carrier}</p>
              </div>
            )}
            {L.estimated_sum_insured && (
              <div>
                <p className="text-[11px] text-muted-foreground">ทุนที่ต้องการ</p>
                <p className="font-medium">฿{Number(L.estimated_sum_insured).toLocaleString('th-TH')}</p>
              </div>
            )}
          </div>
          {L.message && (
            <div className="rounded-md bg-amber-50 p-3 text-sm">
              <p className="text-[11px] text-amber-700">ข้อความจากลูกค้า</p>
              <p className="mt-0.5 italic">"{L.message}"</p>
            </div>
          )}
          {L.agent_notes && (
            <div className="rounded-md border bg-background p-3 text-sm">
              <p className="text-[11px] text-muted-foreground">บันทึกของฉัน</p>
              <p className="mt-0.5 whitespace-pre-wrap">{L.agent_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Sales Assistant */}
      <Card className="border-violet-300 bg-gradient-to-br from-violet-50 to-background">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Sparkles className="h-6 w-6 shrink-0 text-violet-600" />
            <div className="flex-1">
              <p className="font-semibold">🤖 AI Sales Assistant</p>
              <p className="mt-1 text-xs text-muted-foreground">
                วิเคราะห์โปรไฟล์การเงินลูกค้า → แนะนำ product + script + objection handling
              </p>
            </div>
          </div>

          {!hasAI ? (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
              ⭐ ฟีเจอร์นี้สำหรับแพ็คเกจ <strong>Pro/Team</strong> เท่านั้น
              <Link href="/agents/pricing" className="ml-1 font-semibold underline">
                อัพเกรด →
              </Link>
            </div>
          ) : (
            <>
              <form action={generatePitchAction}>
                <input type="hidden" name="lead_id" value={L.id} />
                <Button type="submit" className="w-full" variant={hasPitch ? 'outline' : 'default'}>
                  {hasPitch ? (
                    <><RefreshCw className="mr-2 h-4 w-4" /> สร้างคำแนะนำใหม่</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" /> ✨ สร้างคำแนะนำ AI</>
                  )}
                </Button>
              </form>

              {hasPitch && (
                <div className="rounded-lg border bg-background p-4 text-sm">
                  {pitchAge !== null && (
                    <p className="mb-2 text-[10px] text-muted-foreground">
                      สร้างเมื่อ {pitchAge === 0 ? 'วันนี้' : `${pitchAge} วันก่อน`}
                    </p>
                  )}
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {L.ai_pitch}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
