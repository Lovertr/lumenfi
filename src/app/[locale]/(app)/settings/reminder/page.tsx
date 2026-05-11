import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Bell, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/server';
import { saveReminderSettings } from './actions';
import { TestReminderButton } from '@/components/settings/test-reminder-button';

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

async function getPushCount(): Promise<number> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  return count ?? 0;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: h,
  label: `${String(h).padStart(2, '0')}:00`,
}));

const HOUR_HINTS: Record<number, string> = {
  7: 'เริ่มต้นวัน — บันทึกค่ารถ/ค่ากาแฟ',
  8: 'เริ่มต้นวัน — บันทึกค่ารถ/ค่ากาแฟ',
  12: 'พักเที่ยง — บันทึกค่าอาหาร',
  18: 'หลังเลิกงาน — สรุปรายจ่าย',
  20: 'หลังอาหารเย็น — ทบทวนทั้งวัน',
  21: 'ก่อนนอน — รีวิวรายจ่ายวันนี้',
  22: 'ก่อนนอน — รีวิวรายจ่ายวันนี้',
};

export default async function ReminderSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isTh = locale === 'th';

  const profile = await getReminderProfile();
  const enabled = profile?.reminder_enabled ?? false;
  const hour = profile?.reminder_hour ?? 21;
  const skipIfLogged = profile?.reminder_skip_if_logged ?? true;
  const pushCount = await getPushCount();

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

      {/* Device status */}
      <Card className={pushCount > 0 ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}>
        <CardContent className="p-4 text-sm">
          {pushCount > 0 ? (
            <p className="text-emerald-700">
              ✓ เชื่อมต่อ {pushCount} อุปกรณ์ — พร้อมรับการแจ้งเตือน
            </p>
          ) : (
            <p className="text-amber-700">
              ⚠️ ยังไม่ได้เปิดสิทธิ์แจ้งเตือนบนอุปกรณ์นี้ —{' '}
              <Link href="/recurring" className="font-semibold underline">
                ไปที่ /recurring แล้วกด Enable notifications
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

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

            {/* Time — now picker */}
            <div className="space-y-2">
              <Label htmlFor="reminder_hour" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {isTh ? 'เวลาแจ้งเตือน (เวลาไทย)' : 'Reminder time (Bangkok TZ)'}
              </Label>
              <select
                id="reminder_hour"
                name="reminder_hour"
                defaultValue={String(hour)}
                className="block w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {HOUR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                    {HOUR_HINTS[o.value] ? ` — ${HOUR_HINTS[o.value]}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                {isTh
                  ? '💡 แนะนำ 20:00-22:00 ก่อนนอน — ทบทวนรายจ่ายของวันได้ครบถ้วน'
                  : '💡 Tip: 20:00-22:00 works best for end-of-day review'}
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

      {/* Test button */}
      {pushCount > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div>
              <p className="text-sm font-semibold">🧪 ทดสอบเลย</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                ส่ง push ทดสอบไปยังอุปกรณ์ที่เชื่อมต่อ — ใช้เช็คว่าระบบทำงานก่อนรอเวลาจริง
              </p>
            </div>
            <TestReminderButton />
          </CardContent>
        </Card>
      )}

      <Card className="border-muted bg-muted/30">
        <CardContent className="space-y-2 p-4 text-xs">
          <p className="font-semibold">💡 ข้อมูล</p>
          <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
            <li>ระบบเช็คทุกชั่วโมง → ส่งแจ้งเตือนแค่ใน "ชั่วโมงที่ตั้งไว้" เท่านั้น (1 ครั้ง/วัน)</li>
            <li>"ข้ามถ้าวันนี้บันทึกแล้ว" — ระบบจะเช็คก่อนส่ง ไม่กวนถ้าคุณบันทึกไปแล้ว</li>
            <li>ใช้ได้บน mobile PWA + browser ที่อนุญาต push (Chrome, Edge, Safari iOS 16.4+)</li>
            <li>iOS Safari: ต้อง "Add to Home Screen" ก่อนถึงรับ push ได้</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
