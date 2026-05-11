import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, MessageSquare, ExternalLink, CheckCircle2, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/server';
import { saveLineToken, toggleLineNotify, removeLineToken, sendTestNotify } from './actions';

export const dynamic = 'force-dynamic';

export default async function LineSetupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents')
    .select('id, line_notify_token, line_notify_enabled')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!agent) redirect('/agents/signup');

  const hasToken = !!(agent as any).line_notify_token;
  const isEnabled = (agent as any).line_notify_enabled;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/agents/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">เชื่อมต่อ LINE Notify</h1>
          <p className="text-xs text-muted-foreground">รับแจ้งเตือน lead ผ่าน LINE ทันที</p>
        </div>
      </header>

      {hasToken && isEnabled && (
        <Card className="border-emerald-300 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <div className="flex-1">
                <p className="font-semibold text-emerald-700">✓ เชื่อมต่อแล้ว</p>
                <p className="mt-1 text-xs text-emerald-600">
                  จะได้รับ LINE ทันทีเมื่อ: มี lead ใหม่, แพ็คเกจใกล้หมดอายุ, แพ็คเกจหมดอายุ
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasToken && !isEnabled && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-700">
            ⏸️ มีโทเค็นแต่ปิดอยู่ — กดเปิดด้านล่างเพื่อรับการแจ้งเตือน
          </CardContent>
        </Card>
      )}

      {/* Setup guide */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-semibold">📝 วิธีรับ Token</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>
              เปิดเว็บ{' '}
              <a
                href="https://notify-bot.line.me/my/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                notify-bot.line.me/my <ExternalLink className="h-3 w-3" />
              </a>{' '}
              แล้วล็อกอินด้วย LINE
            </li>
            <li>เลื่อนลงไปที่ "ออก Access Token" → กด "ออก Token"</li>
            <li>
              ตั้งชื่อ token: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Lumenfi Lead</code>
            </li>
            <li>
              เลือกห้องส่งข้อความ: <strong>"ส่งข้อความตามตัว 1-1 จาก LINE Notify"</strong>{' '}
              (หรือเลือก group ถ้าอยากให้ทีมเห็นด้วย)
            </li>
            <li>กด "ออก Token" → copy ข้อความที่ได้ (เห็นครั้งเดียว!)</li>
            <li>เอามาวางในกล่องด้านล่าง</li>
          </ol>
          <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-700">
            ⚠️ Token นี้เป็นกุญแจส่วนตัว — อย่าให้คนอื่น เพราะจะสามารถส่งข้อความเข้าห้องนี้ได้
          </p>
        </CardContent>
      </Card>

      {/* Token form */}
      <Card>
        <CardContent className="p-5">
          <form action={saveLineToken} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="token">วาง LINE Notify Token ที่นี่</Label>
              <Input
                id="token"
                name="token"
                type="password"
                placeholder={hasToken ? '••••••••••••' : 'paste your token here'}
                required
              />
              {hasToken && (
                <p className="text-[10px] text-muted-foreground">
                  💾 มี token เก็บอยู่แล้ว — วางใหม่เพื่อเปลี่ยน
                </p>
              )}
            </div>
            <Button type="submit" className="w-full">
              <MessageSquare className="mr-2 h-4 w-4" />
              {hasToken ? 'อัพเดท Token' : 'เชื่อมต่อ LINE'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Controls when connected */}
      {hasToken && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <form action={sendTestNotify}>
              <Button type="submit" variant="outline" className="w-full">
                <Send className="mr-2 h-4 w-4" />
                ส่งข้อความทดสอบ
              </Button>
            </form>

            <form action={toggleLineNotify}>
              <input type="hidden" name="enable" value={String(!isEnabled)} />
              <Button
                type="submit"
                variant={isEnabled ? 'outline' : 'default'}
                className="w-full"
              >
                {isEnabled ? 'ปิดการแจ้งเตือน LINE ชั่วคราว' : 'เปิดการแจ้งเตือน LINE'}
              </Button>
            </form>

            <form action={removeLineToken}>
              <Button
                type="submit"
                variant="ghost"
                className="w-full text-rose-600 hover:bg-rose-50"
              >
                <X className="mr-2 h-4 w-4" />
                ลบ Token (เลิกเชื่อมต่อ)
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
