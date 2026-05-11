import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { chat } from '@/lib/ai';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

const KNOWN_PROVIDERS = new Set(['anthropic', 'openai', 'openrouter', 'gemini']);

function inferProviderFromKey(key: string | undefined): string | null {
  if (!key) return null;
  if (/^AIza[\w-]{30,}/.test(key)) return 'gemini';
  if (key.startsWith('sk-ant-')) return 'anthropic';
  if (key.startsWith('sk-or-')) return 'openrouter';
  if (key.startsWith('sk-')) return 'openai';
  return null;
}

function maskKey(key: string | undefined): string {
  if (!key) return '(empty)';
  if (key.length < 8) return '(too short: ' + key.length + ' chars)';
  return key.slice(0, 6) + '...' + key.slice(-4) + ' (' + key.length + ' chars)';
}

function checkValue(envVar: string | undefined, label: string) {
  if (!envVar) return { kind: 'missing', label, value: '(not set)', inferred: null };
  if (KNOWN_PROVIDERS.has(envVar)) {
    return { kind: 'valid', label, value: envVar, inferred: null };
  }
  // Looks like a key value?
  const inferred = inferProviderFromKey(envVar);
  if (inferred) {
    return {
      kind: 'wrong_value_is_key',
      label,
      value: maskKey(envVar),
      inferred,
    };
  }
  return { kind: 'unknown', label, value: envVar.slice(0, 30), inferred: null };
}

export default async function AIDiagnosticPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="p-6 text-center">
        <p>Admin only</p>
      </div>
    );
  }

  // Read env
  const aiKey = process.env.LUMENFI_AI_KEY;
  const aiProvider = process.env.LUMENFI_AI_PROVIDER;
  const freeKey = process.env.LUMENFI_FREE_AI_KEY;
  const freeProvider = process.env.LUMENFI_FREE_AI_PROVIDER;

  const providerCheck = checkValue(aiProvider, 'LUMENFI_AI_PROVIDER');
  const freeProviderCheck = checkValue(freeProvider, 'LUMENFI_FREE_AI_PROVIDER');

  const aiKeyInferred = inferProviderFromKey(aiKey);
  const freeKeyInferred = inferProviderFromKey(freeKey);

  // Try a live AI call
  let liveTest: { ok: boolean; provider?: string; message: string } = { ok: false, message: 'not tested' };
  try {
    // Determine final provider via the same logic as access.ts
    let finalProvider: string;
    if (aiProvider && KNOWN_PROVIDERS.has(aiProvider)) {
      finalProvider = aiProvider;
    } else if (aiKeyInferred) {
      finalProvider = aiKeyInferred;
    } else {
      finalProvider = 'anthropic';
    }

    if (!aiKey) {
      liveTest = { ok: false, message: 'LUMENFI_AI_KEY is not set' };
    } else {
      const result = await chat(
        finalProvider as any,
        aiKey,
        [{ role: 'user', content: 'reply with just the word OK' }],
        'You are a test bot.'
      );
      liveTest = {
        ok: true,
        provider: finalProvider,
        message: 'Response: ' + (result.text?.slice(0, 100) ?? '(empty)'),
      };
    }
  } catch (e: any) {
    liveTest = { ok: false, message: e?.message?.slice(0, 300) ?? 'unknown error' };
  }

  const rows = [
    { label: 'LUMENFI_AI_KEY', value: maskKey(aiKey), kind: aiKey ? 'valid' : 'missing', inferred: aiKeyInferred },
    providerCheck,
    { label: 'LUMENFI_FREE_AI_KEY', value: maskKey(freeKey), kind: freeKey ? 'valid' : 'missing', inferred: freeKeyInferred },
    freeProviderCheck,
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/settings/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">AI Diagnostic</h1>
          <p className="text-xs text-muted-foreground">เช็คว่า env config ของ AI ถูกต้อง</p>
        </div>
      </header>

      {/* Env table */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-semibold">📋 Environment Variables</p>
          <div className="divide-y rounded-md border">
            {rows.map((r) => (
              <div key={r.label} className="flex items-start gap-3 p-3">
                {r.kind === 'valid' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
                {r.kind === 'missing' && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
                {r.kind === 'wrong_value_is_key' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
                {r.kind === 'unknown' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs font-medium">{r.label}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{r.value}</p>
                  {r.kind === 'wrong_value_is_key' && (
                    <p className="mt-1 text-xs text-amber-700">
                      ⚠️ ค่านี้ดูเหมือนเป็น API key — ควรเป็นชื่อ provider เช่น <code className="rounded bg-muted px-1">{r.inferred}</code>
                    </p>
                  )}
                  {r.kind === 'missing' && (
                    <p className="mt-1 text-xs text-rose-700">❌ ยังไม่ได้ตั้งค่าใน Vercel env</p>
                  )}
                  {r.inferred && r.kind === 'valid' && r.label.includes('_KEY') && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Key shape suggests provider: <strong>{r.inferred}</strong>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live test */}
      <Card className={liveTest.ok ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}>
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center gap-2">
            {liveTest.ok ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-600" />
            )}
            <p className="font-semibold">
              {liveTest.ok ? '✓ Live test passed' : '✗ Live test failed'}
            </p>
          </div>
          {liveTest.provider && (
            <p className="text-xs">
              Provider used: <code className="rounded bg-background px-1.5 py-0.5">{liveTest.provider}</code>
            </p>
          )}
          <p className="text-xs font-mono break-all">{liveTest.message}</p>
        </CardContent>
      </Card>

      {/* How to fix */}
      <Card>
        <CardContent className="p-5 space-y-3 text-sm">
          <p className="font-semibold">🔧 วิธีแก้</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>เข้า Vercel Dashboard → Lumenfi project → Settings → Environment Variables</li>
            <li>
              ค่าที่ถูกต้องของ <code className="rounded bg-muted px-1">LUMENFI_AI_PROVIDER</code> ต้องเป็น{' '}
              <strong>กลุ่ม known</strong>: <code>anthropic</code> · <code>openai</code> · <code>openrouter</code> · <code>gemini</code>
            </li>
            <li>
              ค่าที่ถูกต้องของ <code className="rounded bg-muted px-1">LUMENFI_AI_KEY</code> ต้องเป็น API key:
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                <li>Gemini: <code>AIzaSy...</code></li>
                <li>Anthropic: <code>sk-ant-...</code></li>
                <li>OpenAI: <code>sk-...</code></li>
              </ul>
            </li>
            <li>หลังแก้ → กด Save → รอ Vercel redeploy (ประมาณ 1 นาที) → รีโหลด /advisor</li>
          </ol>
          <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-700">
            💡 ข้อมูลที่เห็นถูก mask (เห็นแค่ 6 หลักแรก + 4 หลักสุดท้าย) — ส่งหน้านี้ให้ผมดูได้เพื่อ debug
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
