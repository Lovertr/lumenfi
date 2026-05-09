import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, AlertCircle, Database, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { PERSONAS } from '@/lib/demo/personas';
import { SeedPersonaButton } from '@/components/admin/seed-persona-button';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

export default async function SeedDemoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
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
            สร้าง demo users เพื่อใช้ทำ marketing content + screenshots
          </p>
        </div>
      </header>

      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            ℹ️ วิธีใช้
          </p>
          <ol className="mt-1 ml-4 list-decimal space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
            <li>กด "Seed" ของ persona ที่ต้องการ → ระบบจะสร้าง user ใหม่ (หรือ wipe + reset ถ้ามีแล้ว)</li>
            <li>Login ด้วย email ของ persona + password: <code className="rounded bg-amber-200/50 px-1">Lumenfi-Demo-2026</code></li>
            <li>ถ่าย screenshot, อัด video, ทำ landing page content ตามใจ</li>
            <li>กด Seed ใหม่ตอนไหนก็ได้ → ข้อมูลรีเซ็ตกลับสถานะเริ่มต้น</li>
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {PERSONAS.map((p) => (
          <Card key={p.key} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h2 className="text-base font-bold">{p.name}</h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    📧 {p.email}
                  </p>
                </div>
                <SeedPersonaButton personaKey={p.key} />
              </div>

              {/* Stats preview */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                <div className="rounded-md bg-muted/30 p-2">
                  <p className="text-muted-foreground">รายได้/เดือน</p>
                  <p className="font-bold">฿{p.profile.monthly_income.toLocaleString()}</p>
                </div>
                <div className="rounded-md bg-muted/30 p-2">
                  <p className="text-muted-foreground">บัญชี</p>
                  <p className="font-bold">{p.accounts.length} บัญชี</p>
                </div>
                <div className="rounded-md bg-muted/30 p-2">
                  <p className="text-muted-foreground">เป้าหมาย</p>
                  <p className="font-bold">{p.goals.length} เป้า</p>
                </div>
                <div className="rounded-md bg-muted/30 p-2">
                  <p className="text-muted-foreground">ลงทุน</p>
                  <p className="font-bold">{p.investments.length} รายการ</p>
                </div>
              </div>

              <p className="mt-3 text-[11px] text-muted-foreground">
                {p.investments.length > 0 && '📊 หุ้นไทย/ETF/Crypto · '}
                {p.debts.length > 0 && `💳 ${p.debts.length} หนี้ · `}
                {p.insurance.length > 0 && `🛡️ ${p.insurance.length} กรมธรรม์ · `}
                {`📝 ${p.transactionTemplate.count} รายการ 90 วัน`}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Marketing content tips */}
      <Card className="border-dashed">
        <CardContent className="p-5">
          <p className="text-sm font-bold">💡 ไอเดียคอนเทนท์ทำการตลาด</p>
          <ul className="mt-2 ml-4 list-disc space-y-1 text-xs text-muted-foreground">
            <li>📸 <b>Landing page screenshots:</b> Dashboard ของแต่ละ persona — แสดง "users ใช้แล้วได้อะไร"</li>
            <li>🎬 <b>วิดีโอ TikTok/Reels:</b> "AI Advisor วิเคราะห์ portfolio ฉัน 30 วินาที" จาก demo account</li>
            <li>📱 <b>Social media posts:</b> "คุณ Pat อายุ 38 ผ่อนบ้าน + ส่งลูกเรียน — Lumenfi ช่วยยังไง"</li>
            <li>🎯 <b>Case studies:</b> เขียน blog "3 personas ใช้ Lumenfi อย่างไร" linked from /help</li>
            <li>📧 <b>Email marketing:</b> "TRIN ออมได้ 50% / รายได้ ใน 6 เดือน — ดูยังไง"</li>
            <li>🎨 <b>Ad creatives:</b> ภาพ dashboard เต็ม + before/after คะแนนสุขภาพการเงิน</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-950/20">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-rose-900 dark:text-rose-200">
            ⚠️ สำคัญ
          </p>
          <ul className="mt-1 ml-4 list-disc space-y-0.5 text-[11px] text-rose-800 dark:text-rose-300">
            <li>Demo accounts ใช้ Email โดเมน @lumenfi.app (ต้อง verify ผ่าน admin → email_confirm: true ทำให้ใช้ได้เลย)</li>
            <li>อย่าเปิด Free trial กับ demo accounts (จะกินค่า AI ของจริง)</li>
            <li>ใช้ดูเฉยๆ ไม่กด Pro / Pay-go ใน demo accounts</li>
            <li>Production ลูกค้าจริงไม่เห็นข้อมูลของ demo accounts (RLS)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
