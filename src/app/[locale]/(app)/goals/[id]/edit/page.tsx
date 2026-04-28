import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GoalForm } from '@/components/goals/goal-form';
import { createClient } from '@/lib/supabase/server';

async function getGoal(id: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('goals')
    .select('id, name, target_amount, current_amount, deadline, color, icon, is_emergency_fund')
    .eq('id', id)
    .maybeSingle();
  return data;
}

export default async function EditGoalPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Goals');

  const goal = await getGoal(id);
  if (!goal) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/goals">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">{t('editTitle')}</h1>
          <p className="text-xs text-muted-foreground">{goal.name}</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <GoalForm
            mode="edit"
            defaults={{
              id: goal.id,
              name: goal.name,
              target_amount: Number(goal.target_amount),
              current_amount: Number(goal.current_amount),
              deadline: goal.deadline,
              color: goal.color,
              icon: goal.icon,
              is_emergency_fund: goal.is_emergency_fund,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
