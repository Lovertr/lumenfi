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

      <Card className="border-muted bg-muted/30">
        <CardContent className="space-y-2 p-4 text-xs">
          <p className="font-semibold">💡 ข้อมูล</p>
          <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
            <li>เลือกเวลาใดก็ได้ (0-23) — ระบบเตือนวันละ 1 ครั้งตามที่ตั้ง</li>
            <li>"ข้ามถ้าวันนี้บันทึกแล้ว" — ไม่กวนถ้าคุณบันทึกไปแล้ว</li>
            <li>ใช้ได้บน mobile PWA + browser ที่อนุญาต push (Chrome, Edge, Safari iOS 16.4+)</li>
            <li>iOS Safari: ต้อง "Add to Home Screen" ก่อนถึงรับ push ได้</li>
            <li>⚙️ Admin only: ต้องตั้ง Supabase pg_cron เพื่อให้เช็คทุกชั่วโมง — ดู supabase/one-time/setup-hourly-notify.sql</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
