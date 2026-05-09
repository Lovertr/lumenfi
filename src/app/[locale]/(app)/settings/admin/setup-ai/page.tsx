import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, ExternalLink, CheckCircle2, AlertCircle, Sparkles, Key, Server, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

export default async function SetupAIPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-4 pt-10">
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
            <p className="font-semibold">เฉพาะ admin</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isConfigured =
    !!process.env.LUMENFI_AI_KEY && process.env.LUMENFI_AI_KEY.length > 10;
  const provider = process.env.LUMENFI_AI_PROVIDER ?? 'anthropic';

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
            <Sparkles className="h-5 w-5 text-primary" />
            Setup Lumenfi AI Key
          </h1>
          <p className="text-xs text-muted-foreground">
            ตั้งค่าให้ Free quota + Pay-go + Pro users ได้ใช้ AI
          </p>
        </div>
      </header>

      {/* Status */}
      <Card className={isConfigured ? 'border-success/30 bg-success/5' : 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20'}>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            {isConfigured ? (
              <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
            ) : (
              <AlertCircle className="h-6 w-6 shrink-0 text-amber-600" />
            )}
            <div>
              <p className="font-bold">
                {isConfigured
                  ? '✅ Lumenfi AI Key พร้อมใช้งานแล้ว'
                  : '⚠️ ยังไม่ได้ตั้ง LUMENFI_AI_KEY'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isConfigured
                  ? `Provider: ${provider} · Free + Pay-go + Pro users ใช้ AI ของ Lumenfi ได้แล้ว`
                  : 'Free user, Pay-go credits, และ Pro subscribers จะยังใช้ AI ไม่ได้จนกว่าจะตั้งค่า'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardContent className="p-5">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            แนะนำใช้ Claude Haiku 4.5
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ราคาถูกที่สุด คุณภาพดี — ~฿20-25 ต่อ user/เดือน · Margin ~5x ที่ Pro ฿149
          </p>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-md bg-background/60 p-2">
              <p className="font-semibold">Claude Haiku 4.5</p>
              <p className="text-muted-foreground">$1/M input · $5/M output</p>
              <p className="text-success">~฿18-22/user · margin 5×</p>
            </div>
            <div className="rounded-md bg-background/60 p-2">
              <p className="font-semibold">Gemini 1.5 Pro (alt)</p>
              <p className="text-muted-foreground">$1.25/M input · $5/M output</p>
              <p className="text-success">~฿20-25/user · margin 5×</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step-by-step */}
      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-bold">📋 ขั้นตอนตั้งค่า (~5 นาที)</h2>

          <div className="mt-4 space-y-4">
            {/* Step 1 */}
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">1</span>
                <div className="flex-1">
                  <p className="font-semibold flex items-center gap-1">
                    <Key className="h-3.5 w-3.5" />
                    สมัคร Anthropic Console + เติมเครดิต
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ต้องเติม credit ขั้นต่ำ $5 (~฿180) ใช้ทดสอบได้ ~5,000 advisor reports
                  </p>
                  <div className="mt-2 space-y-1">
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Anthropic Console → API Keys
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">2</span>
                <div className="flex-1">
                  <p className="font-semibold">สร้าง API Key</p>
                  <ul className="mt-1 ml-4 list-disc space-y-0.5 text-xs text-muted-foreground">
                    <li>กด <b>"Create Key"</b></li>
                    <li>ตั้งชื่อ: <code className="rounded bg-muted px-1">Lumenfi Production</code></li>
                    <li>Copy key ที่ขึ้นต้นด้วย <code>sk-ant-...</code> (จะเห็นแค่ครั้งเดียว!)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">3</span>
                <div className="flex-1">
                  <p className="font-semibold flex items-center gap-1">
                    <Server className="h-3.5 w-3.5" />
                    เพิ่มใน Vercel Environment Variables
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Vercel Dashboard → Lumenfi project → Settings → Environment Variables
                  </p>
                  <div className="mt-2 space-y-1.5 rounded-md bg-muted/40 p-3 text-[11px] font-mono">
                    <div>
                      <span className="text-muted-foreground">Name:</span> LUMENFI_AI_KEY
                    </div>
                    <div>
                      <span className="text-muted-foreground">Value:</span> sk-ant-api03-xxxx...xxxx
                    </div>
                    <div>
                      <span className="text-muted-foreground">Environments:</span> Production, Preview, Development
                    </div>
                    <hr className="border-muted" />
                    <div>
                      <span className="text-muted-foreground">Name:</span> LUMENFI_AI_PROVIDER
                    </div>
                    <div>
                      <span className="text-muted-foreground">Value:</span> anthropic
                    </div>
                  </div>
                  <a
                    href="https://vercel.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    เปิด Vercel Dashboard
                  </a>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">4</span>
                <div className="flex-1">
                  <p className="font-semibold">Redeploy Vercel</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    หลังเพิ่ม env เสร็จ → Vercel Dashboard → Deployments → ปุ่ม "..." → Redeploy
                    <br />
                    หรือ git push commit ใหม่ก็ deploy อัตโนมัติ
                  </p>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">5</span>
                <div className="flex-1">
                  <p className="font-semibold">ทดสอบ</p>
                  <ul className="mt-1 ml-4 list-disc space-y-0.5 text-xs text-muted-foreground">
                    <li>Refresh หน้านี้ → ควรเห็น "✅ พร้อมใช้งาน"</li>
                    <li>เปิด <Link href="/advisor" className="text-primary hover:underline">/advisor</Link> ลองกด "วิเคราะห์ทันที"</li>
                    <li>Free user ใช้ได้ 1 รายงาน/เดือน · Pro ใช้ได้ไม่จำกัด</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost monitoring tip */}
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            💰 ตรวจสอบค่าใช้จ่าย
          </p>
          <ul className="mt-1 ml-4 list-disc space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
            <li><a href="https://console.anthropic.com/settings/usage" target="_blank" rel="noopener noreferrer" className="underline">Anthropic Usage</a> — ดู spending แบบ real-time</li>
            <li>ตั้ง <b>Spending limit</b> เพื่อกัน abuse</li>
            <li>Lumenfi tracks ทุก call ใน <code>ai_usage_log</code> table — query ดูได้</li>
            <li>ปกติ Free user ใช้ ~฿2-3/เดือน · Pro user ~฿20-25/เดือน</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
