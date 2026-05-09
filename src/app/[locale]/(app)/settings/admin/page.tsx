import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, CheckCircle2, AlertCircle, Database, Megaphone, Wrench, Sparkles } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { checkMigrations } from '@/lib/queries/migration-health';
import { checkEnvVars, envHealthScore, type EnvCheck } from '@/lib/queries/env-health';
import { Key } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const migrations = await checkMigrations();
  const envChecks = checkEnvVars();
  const envScore = envHealthScore(envChecks);
  const envByCategory = envChecks.reduce<Record<string, EnvCheck[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});
  const allApplied = migrations.every((m) => m.applied);
  const pendingCount = migrations.filter((m) => !m.applied).length;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Wrench className="h-5 w-5 text-primary" />
            Admin · System Health
          </h1>
          <p className="text-xs text-muted-foreground">ตรวจสอบสถานะระบบ + เครื่องมือ admin</p>
        </div>
      </header>

      {/* Migration health */}
      <Card className={allApplied ? 'border-success/30 bg-success/5' : 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20'}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {allApplied ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {allApplied
                  ? '✅ Database — applied ครบทุก migration'
                  : `⚠️ มี ${pendingCount} migration ที่ยังไม่ apply`}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                ระบบจะตรวจ tables + columns ที่จำเป็นจาก migrations 12-16
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {migrations.map((m) => (
              <div
                key={m.migration}
                className={`rounded-md border p-3 text-xs ${
                  m.applied ? 'bg-background/60' : 'border-amber-300 bg-amber-100/40 dark:bg-amber-950/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  {m.applied ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  )}
                  <div className="flex-1">
                    <p className="font-mono text-[11px] font-semibold">{m.migration}</p>
                    <p className="mt-0.5 text-muted-foreground">{m.description}</p>
                    {!m.applied && m.missing.length > 0 && (
                      <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                        ⚠️ ขาด: {m.missing.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!allApplied && (
            <div className="mt-3 rounded-md bg-background/80 p-3 text-xs">
              <p className="font-semibold">วิธี apply migration:</p>
              <ol className="mt-1 ml-4 list-decimal space-y-0.5 text-muted-foreground">
                <li>เปิด Supabase Studio → SQL Editor</li>
                <li>เปิดไฟล์ <code>supabase/migrations/[ชื่อ migration].sql</code></li>
                <li>Copy → paste ใน SQL Editor → กด Run</li>
                <li>กลับมาหน้านี้ refresh เพื่อตรวจ</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Env Vars Health */}
      <Card className={envScore >= 90 ? 'border-success/30 bg-success/5' : envScore >= 60 ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20' : 'border-destructive/30 bg-destructive/5'}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Key className={`h-5 w-5 shrink-0 ${envScore >= 90 ? 'text-success' : envScore >= 60 ? 'text-amber-600' : 'text-destructive'}`} />
            <div className="flex-1">
              <p className="text-sm font-semibold">
                Environment Variables — {envScore}/100
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                ตั้งค่าใน Vercel Dashboard → Settings → Environment Variables
              </p>
            </div>
          </div>

          {Object.entries(envByCategory).map(([cat, items]) => {
            const labels: Record<string, string> = {
              core: '🔧 Core (Required)',
              ai: '🤖 AI (Lumenfi Pro/Free)',
              payment: '💳 Payment (Omise)',
              push: '🔔 Push Notifications',
              optional: '✨ Optional',
            };
            return (
              <div key={cat} className="mt-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {labels[cat] ?? cat}
                </p>
                <div className="space-y-1">
                  {items.map((c) => (
                    <div
                      key={c.key}
                      className={`rounded-md border p-2.5 text-xs ${
                        c.set
                          ? 'bg-background/60'
                          : c.required
                          ? 'border-destructive/40 bg-destructive/10'
                          : 'border-amber-300 bg-amber-100/40 dark:bg-amber-950/30'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {c.set ? (
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                        ) : c.required ? (
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                        ) : (
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[11px] font-semibold">{c.key}</p>
                          <p className="mt-0.5 text-muted-foreground">{c.description}</p>
                          {!c.set && c.setupHint && (
                            <p className="mt-1 text-[10px] italic text-muted-foreground">
                              💡 {c.setupHint}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Tools quick links */}
      <Card>
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" />
            เครื่องมือ Admin
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href="/settings/admin/setup-ai"
              className="flex items-start gap-2 rounded-md border bg-background/50 p-3 text-sm transition-colors hover:bg-muted/40"
            >
              <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="font-medium">Setup Lumenfi AI</p>
                <p className="text-[11px] text-muted-foreground">ตั้ง LUMENFI_AI_KEY</p>
              </div>
            </Link>
            <Link
              href="/settings/admin/seed-demo"
              className="flex items-start gap-2 rounded-md border bg-background/50 p-3 text-sm transition-colors hover:bg-muted/40"
            >
              <Database className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="font-medium">Seed Demo Accounts</p>
                <p className="text-[11px] text-muted-foreground">3 personas สำหรับ marketing</p>
              </div>
            </Link>
            <Link
              href="/settings/admin/broadcast"
              className="flex items-start gap-2 rounded-md border bg-background/50 p-3 text-sm transition-colors hover:bg-muted/40"
            >
              <Megaphone className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="font-medium">Broadcast Push</p>
                <p className="text-[11px] text-muted-foreground">ส่ง push หา users ทั้งหมด</p>
              </div>
            </Link>
            <Link
              href="/whats-new"
              className="flex items-start gap-2 rounded-md border bg-background/50 p-3 text-sm transition-colors hover:bg-muted/40"
            >
              <Database className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="font-medium">What's New</p>
                <p className="text-[11px] text-muted-foreground">ดูรายการอัพเดต</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
