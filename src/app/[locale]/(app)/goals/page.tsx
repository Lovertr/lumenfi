import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/auth/logout-button';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { formatTHB } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { Plus, Target, ArrowLeft, Trash2 } from 'lucide-react';
import { deleteGoal } from './actions';

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  color: string;
  icon: string;
  is_emergency_fund: boolean;
}

async function getGoals(): Promise<Goal[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goals')
      .select('id, name, target_amount, current_amount, deadline, color, icon, is_emergency_fund')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data as Goal[]) ?? [];
  } catch {
    return [];
  }
}

function monthsBetween(deadline: string | null): number | null {
  if (!deadline) return null;
  const now = new Date();
  const end = new Date(deadline);
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  return Math.max(0, months);
}

export default async function GoalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Goals');

  const goals = await getGoals();

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{t('title')}</h1>
            <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      {goals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Target className="h-6 w-6" />
            </div>
            <p className="font-semibold">{t('noGoals')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('noGoalsHint')}</p>
            <Button asChild className="mt-4">
              <Link href="/goals/new">
                <Plus className="h-4 w-4" />
                {t('addGoal')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {goals.map((goal) => {
            const target = Number(goal.target_amount);
            const current = Number(goal.current_amount);
            const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
            const remaining = Math.max(0, target - current);
            const months = monthsBetween(goal.deadline);
            const monthlyRequired = months && months > 0 ? remaining / months : null;
            const achieved = current >= target;

            return (
              <Card key={goal.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
                      style={{ backgroundColor: `${goal.color}1A` }}
                    >
                      {goal.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold truncate">{goal.name}</p>
                        <form action={deleteGoal}>
                          <input type="hidden" name="id" value={goal.id} />
                          <button
                            type="submit"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                      <div className="mt-2 flex items-baseline justify-between text-sm">
                        <span className="font-bold">{formatTHB(current, { compact: true })}</span>
                        <span className="text-xs text-muted-foreground">
                          / {formatTHB(target, { compact: true })}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${percent}%`, backgroundColor: goal.color }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{percent.toFixed(0)}%</span>
                        {achieved ? (
                          <span className="font-medium text-success">✓ {t('achieved')}</span>
                        ) : monthlyRequired ? (
                          <span className="text-muted-foreground">
                            {t('monthlyRequired')}: {formatTHB(monthlyRequired, { compact: true })}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Button asChild size="lg" className="fixed bottom-24 right-4 h-14 rounded-full shadow-lg sm:right-[calc(50%-208px)] lg:bottom-8 lg:right-8">
            <Link href="/goals/new">
              <Plus className="h-5 w-5" />
              {t('addGoal')}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
