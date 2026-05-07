import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { InvestmentForm } from '@/components/investments/investment-form';
import { deleteInvestment } from '@/app/[locale]/(app)/investments/actions';

export const dynamic = 'force-dynamic';

async function getActiveGoals() {
  const supabase = createClient();
  const { data } = await supabase
    .from('goals')
    .select('id, name, icon')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export default async function EditInvestmentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const [{ data: inv }, goals] = await Promise.all([
    supabase.from('investments').select('*').eq('id', id).maybeSingle(),
    getActiveGoals(),
  ]);

  if (!inv) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/investments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">แก้ไขการลงทุน</h1>
          <p className="text-xs text-muted-foreground">{inv.name}</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <InvestmentForm
            mode="edit"
            goals={goals as any}
            defaults={{
              id: inv.id,
              name: inv.name,
              symbol: inv.symbol,
              type: inv.type,
              broker_account: inv.broker_account,
              quantity: Number(inv.quantity),
              avg_cost: Number(inv.avg_cost),
              current_price: inv.current_price !== null ? Number(inv.current_price) : null,
              currency: inv.currency,
              goal_id: inv.goal_id,
              is_tax_saving: inv.is_tax_saving ?? false,
              tax_fund_type: inv.tax_fund_type,
              lock_in_until: inv.lock_in_until,
            }}
          />
        </CardContent>
      </Card>

      <form action={deleteInvestment}>
        <input type="hidden" name="id" value={inv.id} />
        <Button type="submit" variant="ghost" size="lg" className="w-full text-destructive hover:bg-destructive/10">
          <Trash2 className="mr-2 h-4 w-4" />
          ลบการลงทุน
        </Button>
      </form>
    </div>
  );
}
