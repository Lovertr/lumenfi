import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ProfileForm } from '@/components/settings/profile-form';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProfileSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Settings');

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, default_currency, monthly_income_target, monthly_expense_target, date_of_birth, num_dependents, monthly_income, monthly_expense_estimate')
    .eq('id', user.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">{t('profile')}</h1>
      </header>

      <Card>
        <CardContent className="p-5">
          <ProfileForm
            profile={
              profile ?? {
                email: user.email ?? '',
                full_name: null,
                default_currency: 'THB',
                monthly_income_target: null,
                monthly_expense_target: null,
                date_of_birth: null,
                num_dependents: 0,
                monthly_income: null,
                monthly_expense_estimate: null,
              }
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
