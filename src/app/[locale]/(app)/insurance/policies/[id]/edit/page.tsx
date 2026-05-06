import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { PolicyForm } from '@/components/insurance/policy-form';
import { deletePolicy } from '@/app/[locale]/(app)/insurance/policies/actions';

export const dynamic = 'force-dynamic';

export default async function EditPolicyPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: policy } = await supabase
    .from('insurance_policies')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!policy) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/insurance/policies">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">แก้ไขกรมธรรม์</h1>
          <p className="text-xs text-muted-foreground">{policy.carrier}</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-5">
          <PolicyForm
            mode="edit"
            defaults={{
              id: policy.id,
              type: policy.type,
              carrier: policy.carrier,
              policy_name: policy.policy_name,
              policy_number: policy.policy_number,
              sum_insured: Number(policy.sum_insured),
              annual_premium: Number(policy.annual_premium),
              start_date: policy.start_date,
              renewal_date: policy.renewal_date,
              beneficiary: policy.beneficiary,
              notes: policy.notes,
            }}
          />
        </CardContent>
      </Card>

      <form action={deletePolicy}>
        <input type="hidden" name="id" value={policy.id} />
        <Button type="submit" variant="ghost" size="lg" className="w-full text-destructive hover:bg-destructive/10">
          <Trash2 className="mr-2 h-4 w-4" />
          ลบกรมธรรม์
        </Button>
      </form>
    </div>
  );
}
