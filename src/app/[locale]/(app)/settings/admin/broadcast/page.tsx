import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft, Megaphone, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { BroadcastForm } from '@/components/admin/broadcast-form';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

export default async function BroadcastPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-4 pt-6 lg:pt-10">
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
            <p className="font-semibold">เฉพาะผู้ดูแลระบบเท่านั้น</p>
            <p className="mt-1 text-xs text-muted-foreground">
              หน้านี้สำหรับ {ADMIN_EMAIL}
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard">กลับ Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Count current subscriptions
  const { count: subsCount } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true });

  const { count: usersCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/settings/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Megaphone className="h-5 w-5 text-primary" />
            Broadcast Push
          </h1>
          <p className="text-xs text-muted-foreground">ส่ง push notification หา users ทั้งหมดที่เปิด permission</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Users ทั้งหมด</p>
            <p className="text-lg font-bold">{usersCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Push subscribers</p>
            <p className="text-lg font-bold">{subsCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <BroadcastForm />
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">⚠️ ใช้ด้วยความระมัดระวัง</p>
          <ul className="mt-1 ml-4 list-disc space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
            <li>ส่งบ่อยจะทำให้ users กดปิด permission</li>
            <li>เหมาะใช้กับ major release / urgent announcement เท่านั้น</li>
            <li>ไม่ควรส่งเกินเดือนละ 1-2 ครั้ง</li>
            <li>เขียนให้กระชับ ไม่เกิน 100 ตัวอักษร</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
