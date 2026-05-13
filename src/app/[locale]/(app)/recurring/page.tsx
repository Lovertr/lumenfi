import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Plus, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { materializeDueRecurring, nextRunDate, getUpcomingNotifications } from '@/lib/recurring';
import { UpcomingBanner } from '@/components/recurring/upcoming-banner';
import { RecurringRow } from '@/components/transactions/recurring-row';

export const dynamic = 'force-dynamic';

interface RecurringWithRefs {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  day_of_month: number;
  is_active: boolean;
  last_run_on: string | null;
  note: string | null;
  account: { name: string; color: string } | null;
  category: { name: string; icon: string; color: string } | null;
  goal: { name: string; icon: string | null } | null;
}

async function getRecurring() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('recurring_transactions')
    .select(`
      id, type, amount, day_of_month, is_active, last_run_on, note,
      account:accounts!recurring_transactions_account_id_fkey(name, color),
      category:categories(name, icon, color),
      goal:goals(name, icon)
    `)
    .eq('user_id', user.id)
    .order('is_active', { ascending: false })
    .order('day_of_month');
  return (data ?? []) as unknown as RecurringWithRefs[];
}

export default async function RecurringPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Materialize any due rows on page load
  await materializeDueRecurring();

  const [t, rows, upcoming] = await Promise.all([
    getTranslations('Recurring'),
    getRecurring(),
    getUpcomingNotifications(),
  ]);

  const active = rows.filter((r) => r.is_active);
  const paused = rows.filter((r) => !r.is_active);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2 lg:hidden">
            <Link href="/more">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <Repeat className="h-5 w-5 text-primary" />
              {t('title')}
            </h1>
            <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href="/transactions/new">
            <Plus className="mr-1 h-4 w-4" /> {t('add')}
          </Link>
        </Button>
      </header>

      {/* Notification toggle moved to /settings/reminder to centralize all
          notification config in one place (was duplicated/confusing here) */}
      {upcoming.length > 0 && <UpcomingBanner items={upcoming as any} />}

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Repeat className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
            <Button asChild size="sm">
              <Link href="/transactions/new">
                <Plus className="mr-1 h-4 w-4" /> {t('add')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('activeSection')} · {active.length}
              </h2>
              <div className="space-y-2">
                {active.map((r) => {
                  const next = nextRunDate(r.day_of_month, r.last_run_on);
                  return <RecurringRow key={r.id} r={r} nextDate={next} />;
                })}
              </div>
            </section>
          )}
          {paused.length > 0 && (
            <section className="space-y-2 pt-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('pausedSection')} · {paused.length}
              </h2>
              <div className="space-y-2 opacity-70">
                {paused.map((r) => {
                  const next = nextRunDate(r.day_of_month, r.last_run_on);
                  return <RecurringRow key={r.id} r={r} nextDate={next} />;
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
