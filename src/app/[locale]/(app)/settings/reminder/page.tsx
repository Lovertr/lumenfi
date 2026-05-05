import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/server';
import { saveReminderSettings } from './actions';

export const dynamic = 'force-dynamic';

async function getReminderProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('reminder_enabled, reminder_hour, reminder_skip_if_logged')
    .eq('id', user.id)
    .single();
  return data;
}

export default async function ReminderSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isTh = locale === 'th';

  const profile = await getReminderProfile();
  const enabled = profile?.reminder_enabled ?? false;
  const hour = profile?.reminder_hour ?? 21;
  const skipIfLogged = profile?.reminder_skip_if_logged ?? true;

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
            <Bell className="h-5 w-5 text-amber-600" />
            {isTh ? 'แจ้งเตือนบันทึกค่าใช้จ่าย' : 'Daily Expense Reminder'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isTh ? 'เตือนทุกวันให้บันทึกรายรับ-รายจ่าย' : 'Daily nudge to log income & expenses'}
          </p>
        </div>
      </header>

      <Card>
        <CardContent className="space-y-4 p-5">
          <form action={saveReminderSettings} className="space-y-4">
            {/* Enable toggle */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div>
                <Label htmlFor="reminder_enabled" className="cursor-pointer text-sm font-medium">
                  {isTh ? 'เปิดการแจ้งเตือนรายวัน' : 'Enable daily reminder'}
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isTh ? 'ส่ง push notification ตามเวลาที่ตั้งไว้' : 'Send push notification at set time'}
                </p>
              </div>
              <input
                id="reminder_enabled"
                name="reminder_enabled"
                type="checkbox"
                defaultChecked={enabled}
                className="h-5 w-5 rounded border-input accent-primary"
              />
            </div>

            {/* Time picker */}
            <div className="space-y-2">
              <Label htmlFor="reminder_hour">
                {isTh ? 'เวลาแจ้งเตือน' : 'Reminder time'}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="reminder_hour"
                  name="reminder_hour"
                  type="number"
                  min={0}
                  max={23}
                  defaultValue={String(hour)}
                  className="h-10 w-24 text-center"
                />
                <span className="text-sm text-muted-foreground">
                  {isTh ? ': 00 น. (เวลาไทย)' : ':00 (Bangkok time)'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isTh ? 'แนะนำ: 21:00 (3 ทุ่ม) — ก่อนนอนทบทวนค่าใช้จ่าย' : 'Suggested: 21:00 — review expenses before bed'}
              </p>
            </div>

            {/* Skip if logged */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div>
                <Label htmlFor="reminder_skip_if_logged" className="cursor-pointer text-sm font-medium">
                  {isTh ? 'ข้ามถ้าวันนี้บันทึกแล้ว' : 'Skip if already logged today'}
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isTh ? 'ไม่เตือนถ้ามีรายการของวันนี้แล้ว' : "Don't notify if today's transactions exist"}
                </p>
              </div>
              <input
                id="reminder_skip_if_logged"
                name="reminder_skip_if_logged"
                type="checkbox"
                defaultChecked={skipIfLogged}
                className="h-5 w-5 rounded border-input accent-primary"
              />
            </div>

            <Button type="submit" size="lg" className="w-full">
              {isTh ? 'บันทึกการตั้งค่า' : 'Save settings'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="space-y-2 p-4 text-xs text-amber-900">
          <p className="font-semibold">
            ⚠️ {isTh ? 'เพิ่มเติม' : 'Note'}
          </p>
          <ul className="list-disc space-y-1 pl-4">
            <li>{isTh ? 'ต้องเปิดสิทธิ์ "การแจ้งเตือน" ใน /recurring ก่อน' : 'You must grant notification permission first (in /recurring)'}</li>
            <li>{isTh ? 'การแจ้งเตือนมาทุกวันตามเวลาที่ตั้ง (เวลาไทย)' : 'Reminder fires daily at the set hour (Bangkok time)'}</li>
            <li>{isTh ? 'ใช้ได้บน mobile PWA + browser ที่อนุญาต push' : 'Works on mobile PWA + push-enabled browsers'}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
