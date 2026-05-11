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
    .select('email, full_name, default_currency, monthly_income_target, monthly_expense_target, date_of_birth, num_dependents, monthly_income, monthly_expense_estimate, income_salary_monthly, income_side_monthly, income_investment_monthly, income_other_monthly, expense_food_monthly, expense_utilities_monthly, expense_phone_internet_monthly, expense_transport_monthly, expense_housing_monthly, expense_debt_payment_monthly, expense_insurance_monthly, expense_subscription_monthly, expense_other_monthly, occupation, employment_type, province, risk_tolerance, investment_experience, financial_goal_summary, pay_cycle_day')
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
                pay_cycle_day: null,
                monthly_income: null,
                monthly_expense_estimate: null,
                income_salary_monthly: null,
                income_side_monthly: null,
                income_investment_monthly: null,
                income_other_monthly: null,
                expense_food_monthly: null,
                expense_utilities_monthly: null,
                expense_phone_internet_monthly: null,
                expense_transport_monthly: null,
                expense_housing_monthly: null,
                expense_debt_payment_monthly: null,
                expense_insurance_monthly: null,
                expense_subscription_monthly: null,
                expense_other_monthly: null,
                occupation: null,
                employment_type: null,
                province: null,
                risk_tolerance: null,
                investment_experience: null,
                financial_goal_summary: null,
              }
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
