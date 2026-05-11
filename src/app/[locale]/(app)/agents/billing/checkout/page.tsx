import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { getPlanInfo } from '@/lib/agents/plans';
import { AgentCheckoutForm } from '@/components/agents/agent-checkout-form';

export const dynamic = 'force-dynamic';

export default async function AgentCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = searchParams ? await searchParams : {};

  const planId = sp.plan as 'starter' | 'pro' | 'team' | undefined;
  const cycle: 'monthly' | 'annual' = sp.cycle === 'annual' ? 'annual' : 'monthly';

  const plan = planId ? getPlanInfo(planId) : null;
  if (!plan) redirect('/agents/pricing');

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: agent } = await supabase
    .from('agents')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!agent || (agent as any).status !== 'active') {
    redirect('/agents/pricing');
  }

  const amount = cycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;

  return (
    <div className="mx-auto max-w-md space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/agents/pricing">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">ชำระเงิน</h1>
          <p className="text-xs text-muted-foreground">{plan.name} · {cycle === 'annual' ? 'รายปี' : 'รายเดือน'}</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <AgentCheckoutForm
            plan={plan.id}
            cycle={cycle}
            amountThb={amount}
            planName={plan.name}
          />
        </CardContent>
      </Card>
    </div>
  );
}
