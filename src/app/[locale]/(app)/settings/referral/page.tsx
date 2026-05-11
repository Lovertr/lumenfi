import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, Gift, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { ensureMyReferralCode } from './actions';
import { ReferralShare } from '@/components/referral/referral-share';
import { ClaimReferralForm } from '@/components/referral/claim-referral-form';

export const dynamic = 'force-dynamic';

async function getReferralStats(userId: string) {
  const supabase = createClient();
  const { count: invitedCount } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', userId);

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('referred_by, assigned_agent_id')
    .eq('id', userId)
    .maybeSingle();

  let boundAgentCode: string | null = null;
  let boundAgentName: string | null = null;
  const assignedAgentId = (myProfile as any)?.assigned_agent_id ?? null;
  if (assignedAgentId) {
    const { data: agent } = await supabase
      .from('agents')
      .select('invite_code, agent_name')
      .eq('id', assignedAgentId)
      .maybeSingle();
    boundAgentCode = (agent as any)?.invite_code ?? null;
    boundAgentName = (agent as any)?.agent_name ?? null;
  }

  return {
    invitedCount: invitedCount ?? 0,
    alreadyClaimed: !!(myProfile as any)?.referred_by,
    boundAgentCode,
    boundAgentName,
  };
}

export default async function ReferralPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = searchParams ? await searchParams : {};
  const presetFromUrl = typeof sp.invite === 'string' ? sp.invite.trim() : '';

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/' + locale + '/login');

  const code = await ensureMyReferralCode();
  const stats = await getReferralStats(user.id);
  const totalRewardDays = stats.invitedCount * 30;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Gift className="h-5 w-5 text-primary" />
            ชวนเพื่อน — รับ Pro ฟรี
          </h1>
          <p className="text-xs text-muted-foreground">
            เพื่อนสมัครแล้วใส่โค้ด → ทั้งคู่ได้ Pro 30 วัน
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> เพื่อนที่ใช้โค้ดของคุณ
            </p>
            <p className="mt-1 text-2xl font-bold">{stats.invitedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Pro ที่ได้แล้ว
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{totalRewardDays} วัน</p>
          </CardContent>
        </Card>
      </div>

      {/* Code share */}
      {code ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">โค้ดเชิญของคุณ</p>
            <ReferralShare code={code} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5 text-center text-sm">
            ไม่สามารถสร้างโค้ดได้ ลองรีเฟรชหน้านี้
          </CardContent>
        </Card>
      )}

      {/* Claim section */}
      {stats.boundAgentCode ? (
        <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20">
          <CardContent className="p-5">
            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
              🛡️ คุณผูกกับตัวแทนแล้ว
            </p>
            <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
              ตัวแทน: <b>{stats.boundAgentName ?? '—'}</b> · ขอที่ปรึกษาประกันจากหน้าวิเคราะห์ Gap ได้
            </p>
            <div className="mt-3">
              <ClaimReferralForm
                presetCode={stats.boundAgentCode}
                locked
                lockedLabel="ผูกกับตัวแทนแล้ว — เปลี่ยนได้ผ่าน admin เท่านั้น"
              />
            </div>
          </CardContent>
        </Card>
      ) : !stats.alreadyClaimed ? (
        <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-800/40 dark:bg-amber-950/20">
          <CardContent className="p-5">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
              💌 มีคนชวนคุณมา? ใส่โค้ดที่นี่
            </p>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
              {presetFromUrl
                ? 'ระบบใส่โค้ดที่คุณตามมาให้แล้ว — กดยืนยันเพื่อใช้ได้เลย'
                : 'ใส่โค้ดเพื่อน → ทั้งคู่ได้ Pro 30 วัน · ใส่โค้ดตัวแทน → ผูกกับตัวแทน'}
            </p>
            <div className="mt-3">
              <ClaimReferralForm
                presetCode={presetFromUrl || undefined}
                locked={!!presetFromUrl}
                lockedLabel={presetFromUrl ? 'โค้ดจากลิงก์ที่คุณเปิด — เปลี่ยนไม่ได้' : undefined}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* How it works */}
      <Card className="border-dashed">
        <CardContent className="p-5">
          <p className="text-sm font-bold">📋 วิธีใช้งาน</p>
          <ol className="mt-2 ml-4 list-decimal space-y-1 text-xs text-muted-foreground">
            <li>แชร์โค้ดของคุณให้เพื่อน หรือส่ง link พร้อมโค้ดข้างใน</li>
            <li>เพื่อนสมัคร Lumenfi → ไปที่ Settings → ชวนเพื่อน → ใส่โค้ดของคุณ</li>
            <li>ทั้งคุณและเพื่อนได้ Pro **30 วันฟรี** ทันที</li>
            <li>ชวนได้ไม่จำกัด — ยิ่งชวนเยอะ ยิ่งได้ Pro นาน</li>
          </ol>
          <p className="mt-3 rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
            💡 รางวัลจะต่อเข้ากับ trial หรือ subscription ที่มีอยู่ — ใช้คุ้มที่สุดเมื่อยังไม่ได้ใส่บัตรเครดิต
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
