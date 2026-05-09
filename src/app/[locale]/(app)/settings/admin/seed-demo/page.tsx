import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, AlertCircle, Database, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { PERSONAS } from '@/lib/demo/personas';
import { SeedPersonaButton } from '@/components/admin/seed-persona-button';
import { SeedAllButton } from '@/components/admin/seed-all-button';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

export default async function SeedDemoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/' + locale + '/login');
  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="mx-auto max-w-md p-4 pt-10">
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
            <p className="font-semibold">เฉพาะ admin</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/settings/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Database className="h-5 w-5 text-primary" />
            Seed Demo Accounts
          </h1>
          <p className="text-xs text-muted-foreground">
            7 personas ครอบคลุมทุก use case · มี story arc + screenshot-ready data
          </p>
        </div>
      </header>

      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">ℹ️ วิธีใช้</p>
          <ol className="mt-1 ml-4 list-decimal space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
            <li>กด "Seed" ของ persona ที่ต้องการ → ระบบสร้าง user ใหม่ (หรือ wipe + reset)</li>
            <li>Login ด้วย email ของ persona + password: <code className="rounded bg-amber-200/50 px-1">Lumenfi-Demo-2026</code></li>
            <li>แต่ละ persona มี: net worth chart 90 วัน · AI advisor reports 3-4 ฉบับ · notification history · transactions ครบ</li>
            <li>Re-seed ได้ทุกเมื่อ — wipe + ใส่ใหม่ปลอดภัย</li>
          </ol>
          <div className="mt-3">
            <SeedAllButton />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {PERSONAS.map((p) => {
          const totalAssets =
            p.accounts.reduce((s, a) => s + Math.max(0, a.initial_balance), 0) +
            p.investments.reduce((s, i) => s + i.quantity * (i.current_price ?? i.avg_cost), 0);
          const totalLiab =
            p.accounts.reduce((s, a) => s + (a.initial_balance < 0 ? Math.abs(a.initial_balance) : 0), 0) +
            p.debts.reduce((s, d) => s + d.balance, 0);
          const netWorth = totalAssets - totalLiab;
          const startNW = p.snapshotProgression?.startNetWorth ?? 0;
          const change = netWorth - startNW;
          const changePct = startNW !== 0 ? Math.round((change / Math.abs(startNW)) * 100) : 100;

          return (
            <Card key={p.key} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h2 className="text-base font-bold">{p.name}</h2>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                    <p className="mt-2 font-mono text-[11px] text-muted-foreground">📧 {p.email}</p>
                  </div>
                  <SeedPersonaButton personaKey={p.key} />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-800/40 dark:bg-rose-950/20">
                    <p className="flex items-center gap-1 text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300">
                      <TrendingDown className="h-3 w-3" /> Before
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-rose-900 dark:text-rose-100">
                      {p.narrative.before}
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                    <p className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                      <TrendingUp className="h-3 w-3" /> After
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-emerald-900 dark:text-emerald-100">
                      {p.narrative.after}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-md bg-muted/30 p-3">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">ผลลัพธ์ที่จับต้องได้</p>
                  <ul className="mt-1 space-y-0.5 text-[11px]">
                    {p.narrative.improvements.map((win, i) => (
                      <li key={i}>{win}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] font-medium text-primary">🎯 ก้าวต่อไป: {p.narrative.nextStep}</p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-5">
                  <div className="rounded-md bg-muted/30 p-2">
                    <p className="text-muted-foreground">รายได้/เดือน</p>
                    <p className="font-bold">฿{p.profile.monthly_income.toLocaleString()}</p>
                  </div>
                  <div className="rounded-md bg-muted/30 p-2">
                    <p className="text-muted-foreground">Net Worth</p>
                    <p className="font-bold">฿{Math.round(netWorth).toLocaleString()}</p>
                  </div>
                  <div className="rounded-md bg-muted/30 p-2">
                    <p className="text-muted-foreground">90 วันโต</p>
                    <p className={'font-bold ' + (change >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                      {change >= 0 ? '+' : ''}
                      {changePct}%
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/30 p-2">
                    <p className="text-muted-foreground">บัญชี</p>
                    <p className="font-bold">{p.accounts.length}</p>
                  </div>
                  <div className="rounded-md bg-muted/30 p-2">
                    <p className="text-muted-foreground">ลงทุน</p>
                    <p className="font-bold">{p.investments.length}</p>
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-muted-foreground">
                  📊 {p.advisorReports.length} AI reports · 🔔 {p.notificationHistory.length} notifications · 💳 {p.debts.length} หนี้ · 🛡️ {p.insurance.length} กรมธรรม์ · 📝 {p.transactionTemplate.count} รายการ
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardContent className="p-5">
          <p className="text-sm font-bold">💡 ไอเดียคอนเทนท์จาก 7 personas</p>
          <ul className="mt-2 ml-4 list-disc space-y-1 text-xs text-muted-foreground">
            <li>📸 Landing page hero: Net worth chart ขึ้น 90 วันของแต่ละ persona</li>
            <li>🎬 TikTok story arc: "JIB ลดบัตรเครดิต ฿120K → ฿45K ใน 6 เดือน"</li>
            <li>📱 Use case posts: 7 อาชีพต่างกัน 7 dashboard ต่างกัน</li>
            <li>🎯 Case studies blog: ใช้ before/after narrative + screenshots</li>
            <li>📧 Email drip: "เลือก persona ที่ใกล้คุณที่สุด" → segmentation</li>
            <li>🎨 Ad creatives: AI Advisor report (4 ฉบับ/persona) + ผลลัพธ์เป็นตัวเลข</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-950/20">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-rose-900 dark:text-rose-200">⚠️ สำคัญ</p>
          <ul className="mt-1 ml-4 list-disc space-y-0.5 text-[11px] text-rose-800 dark:text-rose-300">
            <li>Demo accounts ใช้ Email โดเมน @lumenfi.app · password: Lumenfi-Demo-2026</li>
            <li>อย่ากด Pro / Pay-go ใน demo accounts (จะกินค่า AI ของจริง)</li>
            <li>Production ลูกค้าจริงไม่เห็นข้อมูลของ demo accounts (RLS)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
