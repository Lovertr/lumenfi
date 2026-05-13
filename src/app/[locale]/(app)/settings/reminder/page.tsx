import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Bell, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/server';
import { saveReminderSettings } from './actions';
import { TestReminderButton } from '@/components/settings/test-reminder-button';
import { ReminderFormAuto } from '@/components/settings/reminder-form-auto';
import { ReminderDiagnose } from '@/components/settings/reminder-diagnose';
import { NotificationToggle } from '@/components/recurring/notification-toggle';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

async function isAdminUser(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user && user.email === ADMIN_EMAIL;
}

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
  const isAdmin = await isAdminUser();

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

      {/* Device status + permission toggle — all-in-one */}
      <Card>
        <CardContent className="space-y-3 p-4 text-sm">
          <div>
            <p className="font-semibold">📱 อุปกรณ์ที่จะได้รับแจ้งเตือน</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              เปิด/ปิดสิทธิ์ push บนเครื่องนี้ — สถานะอัปเดตทันทีที่กด
            </p>
          </div>
          <NotificationToggle />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <ReminderFormAuto
            initialEnabled={enabled}
            initialHour={hour}
            initialSkipIfLogged={skipIfLogged}
            isTh={isTh}
            hourOptions={HOUR_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
              hint: HOUR_HINTS[o.value],
            }))}
          />
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

      {/* Diagnostic — admin-only: contains CRON_SECRET in the fix SQL */}
      {isAdmin && <ReminderDiagnose />}

      <Card className="border-muted bg-muted/30">
        <CardContent className="space-y-2 p-4 text-xs">
          <p className="font-semibold">💡 ข้อมูล</p>
          <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
            <li>เลือกเวลาใดก็ได้ (0-23) — ระบบเตือนวันละ 1 ครั้งตามที่ตั้ง</li>
            <li>"ข้ามถ้าวันนี้บันทึกแล้ว" — ไม่กวนถ้าคุณบันทึกไปแล้ว</li>
            <li>ใช้ได้บน mobile PWA + browser ที่อนุญาต push (Chrome, Edge, Safari iOS 16.4+)</li>
            <li>iOS Safari: ต้อง "Add to Home Screen" ก่อนถึงรับ push ได้</li>
            <li>หากเตือนไม่มาตามเวลา ลองปิด-เปิดสิทธิ์ใหม่ในการ์ด "อุปกรณ์ที่จะได้รับแจ้งเตือน" ข้างบน แล้วกด "ส่งทดสอบ"</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
