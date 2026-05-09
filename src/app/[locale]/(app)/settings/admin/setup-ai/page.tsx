import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, ExternalLink, CheckCircle2, AlertCircle, Sparkles, Key, Server, Zap, DollarSign } from 'lucide-react';
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

  const proConfigured = !!process.env.LUMENFI_AI_KEY && process.env.LUMENFI_AI_KEY.length > 10;
  const freeConfigured =
    !!process.env.LUMENFI_FREE_AI_KEY && process.env.LUMENFI_FREE_AI_KEY.length > 10;
  const proProvider = process.env.LUMENFI_AI_PROVIDER ?? 'anthropic';
  const freeProvider = process.env.LUMENFI_FREE_AI_PROVIDER ?? proProvider;

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
            Setup Lumenfi AI Keys
          </h1>
          <p className="text-xs text-muted-foreground">
            ใช้ 2 keys: Free tier (ถูก) + Pro tier (คุณภาพ) → ลด cost 10-15×
          </p>
        </div>
      </header>

      {/* Status */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className={freeConfigured ? 'border-success/30 bg-success/5' : 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20'}>
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              {freeConfigured ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
              )}
              <div>
                <p className="text-sm font-bold">Free Tier</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {freeConfigured ? `ตั้งแล้ว · ${freeProvider}` : 'ยังไม่ได้ตั้ง'}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {freeConfigured
                    ? 'Free users + Pay-go (chat ฟรี)'
                    : 'จะ fallback ไปใช้ Pro key'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={proConfigured ? 'border-success/30 bg-success/5' : 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20'}>
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              {proConfigured ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
              )}
              <div>
                <p className="text-sm font-bold">Pro Tier</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {proConfigured ? `ตั้งแล้ว · ${proProvider}` : 'ยังไม่ได้ตั้ง'}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Pro subscribers + Credit pack
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Analysis */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardContent className="p-5">
          <p className="text-sm font-bold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            เปรียบเทียบต้นทุน Free Tier (1 user/เดือน)
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            สมมติ user ใช้เต็ม quota: 5 chat/วัน × 30 + 1 advisor/เดือน
            (~600K input + 150K output tokens)
          </p>

          <div className="mt-3 space-y-2">
            <div className="rounded-md border-2 border-emerald-300 bg-emerald-50/50 p-3 text-xs dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  ⭐⭐ Gemini 1.5 Flash (แนะนำ)
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">฿3.5/user</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                $0.075/M in · $0.30/M out · 1000 users = ฿3,500/เดือน · คุณภาพดี
              </p>
            </div>

            <div className="rounded-md border-2 border-emerald-200 bg-emerald-50/30 p-3 text-xs dark:bg-emerald-950/15">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  ⭐ GPT-4o-mini (ทางเลือก)
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">฿6.5/user</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                $0.15/M in · $0.60/M out · 1000 users = ฿6,500/เดือน
              </p>
            </div>

            <div className="rounded-md border bg-background p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium">DeepSeek-V3 (via OpenRouter)</span>
                <span>฿4/user</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                $0.14/M in · $0.28/M out · open-source · ภาษาไทยพอใช้
              </p>
            </div>

            <div className="rounded-md border bg-background p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium">Claude Haiku 4.5</span>
                <span>฿49/user</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                ดีสำหรับ Pro tier · 1000 free users = ฿49,000/เดือน ❌
              </p>
            </div>

            <div className="rounded-md border border-rose-300 bg-rose-50/50 p-3 text-xs dark:bg-rose-950/20">
              <div className="flex items-center justify-between">
                <span className="font-medium">Claude Sonnet 4</span>
                <span>฿140/user</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                คุณภาพสูงสุด · 1000 free users = ฿140,000/เดือน 🚨
              </p>
            </div>
          </div>

          <p className="mt-3 rounded-md bg-amber-50 p-2 text-[11px] text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
            💡 <b>กลยุทธ์ที่แนะนำ:</b> Free → Gemini Flash (ฟรี $300 credit ครั้งแรก!) ·
            Pro → Claude Haiku (คุ้ม margin)
          </p>
        </CardContent>
      </Card>

      {/* Setup steps */}
      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-bold">📋 ขั้นตอนตั้งค่า (10 นาที)</h2>

          <div className="mt-4 space-y-4">
            {/* Step 1: Free tier — Gemini */}
            <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/30 p-4 dark:bg-emerald-950/10">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                ⭐⭐ FREE TIER — Gemini Flash (แนะนำ)
              </p>
              <ol className="mt-2 ml-4 list-decimal space-y-1 text-xs text-muted-foreground">
                <li>
                  ไป{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline hover:no-underline"
                  >
                    Google AI Studio <ExternalLink className="inline h-3 w-3" />
                  </a>{' '}
                  · ฟรีไม่ต้องบัตร
                </li>
                <li>กด "Create API key" → เลือก "Create API key in new project"</li>
                <li>
                  Vercel → Add env: <code className="rounded bg-muted px-1">LUMENFI_FREE_AI_KEY</code> = <code>AIza...</code>
                </li>
                <li>
                  Vercel → Add env: <code className="rounded bg-muted px-1">LUMENFI_FREE_AI_PROVIDER</code> = <code>gemini</code>
                </li>
              </ol>
              <p className="mt-2 rounded bg-background/60 p-2 text-[10px] text-muted-foreground">
                💰 Free tier บน Google: ฟรี 60 RPM · จ่ายเฉพาะถ้าเกิน · 1000 users ใช้เต็ม quota = ~฿3,500/เดือน
              </p>
            </div>

            {/* Step 2: Pro tier — Claude */}
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs font-bold">PRO TIER — Claude Haiku 4.5</p>
              <ol className="mt-2 ml-4 list-decimal space-y-1 text-xs text-muted-foreground">
                <li>
                  ไป{' '}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline hover:no-underline"
                  >
                    Anthropic Console <ExternalLink className="inline h-3 w-3" />
                  </a>
                </li>
                <li>เติม credit ขั้นต่ำ $5 (~฿180)</li>
                <li>กด "Create Key" → ตั้งชื่อ <code>Lumenfi Pro</code></li>
                <li>
                  Vercel → Add env: <code className="rounded bg-muted px-1">LUMENFI_AI_KEY</code> = <code>sk-ant-api03-...</code>
                </li>
                <li>
                  Vercel → Add env: <code className="rounded bg-muted px-1">LUMENFI_AI_PROVIDER</code> = <code>anthropic</code>
                </li>
              </ol>
              <p className="mt-2 rounded bg-muted/30 p-2 text-[10px] text-muted-foreground">
                Pro user ใช้ ~฿20-25/เดือน · margin ที่ ฿149 = ~฿110 (74%)
              </p>
            </div>

            {/* Step 3: Redeploy */}
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs font-bold">FINAL — Redeploy</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Vercel Dashboard → Deployments → "..." → <b>Redeploy</b>
                <br />
                หรือ git push commit ใหม่ก็ deploy อัตโนมัติ
              </p>
              <p className="mt-2 rounded bg-background/60 p-2 text-[10px] text-muted-foreground">
                หลัง redeploy → กลับมาหน้านี้ refresh → ดู status ทั้ง 2 tier เป็น ✅
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safety tips */}
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            🛡️ ป้องกัน abuse + cost spike
          </p>
          <ul className="mt-1 ml-4 list-disc space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
            <li>
              ตั้ง <b>Spending limit</b> ที่ Anthropic + Google ทั้งคู่
            </li>
            <li>
              ตรวจ <code>ai_usage_log</code> ใน Supabase หาผู้ใช้ที่ใช้ผิดปกติ
            </li>
            <li>
              ลด Free quota ถ้าจำเป็น (แก้ใน <code>FREE_QUOTAS</code> ใน access.ts)
            </li>
            <li>
              พิจารณา rate limiting per IP (เพิ่ม middleware)
            </li>
            <li>
              Reset quota รายเดือน + ตัด accounts ที่ไม่ active 90+ วัน
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
