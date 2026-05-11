import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { AgentForm } from '@/components/agents/agent-form';

export const dynamic = 'force-dynamic';

export default async function AgentSignupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/agents/signup');

  // If user already has an agent record, send them to dashboard
  const { data: existing } = await supabase
    .from('agents')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) redirect('/agents/dashboard');

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">สมัครเป็นตัวแทนประกัน</h1>
          <p className="text-xs text-muted-foreground">เปลี่ยน Lumenfi ให้เป็นเครื่องมือหา lead ของคุณ</p>
        </div>
      </header>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 shrink-0 text-primary" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold">ตัวแทนได้อะไร</p>
              <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground text-xs">
                <li>ลิงก์เชิญส่วนตัว — แชร์ให้ผู้สนใจ จะมาเป็นลูกค้าคุณอัตโนมัติ</li>
                <li>รับใบเสนอประกันที่ลูกค้าขอ → email ส่งถึงคุณทันที</li>
                <li>โปรไฟล์คุณแสดงในแอพ — license, contact, LINE</li>
                <li>ทดลองฟรี 14 วัน · รับได้ 3 leads</li>
              </ul>
              <p className="mt-2 text-xs">
                <Link href="/pricing#agents" className="text-primary underline">
                  ดูราคาแพ็คเกจ →
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <AgentForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
