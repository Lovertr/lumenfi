import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Plus, Heart, Shield, Activity, AlertTriangle, Car, Home, Plane, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatTHB } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const TYPE_ICONS: Record<string, any> = {
  life: Heart, health: Activity, critical_illness: AlertTriangle, accident: Shield,
  car: Car, home: Home, travel: Plane, other: FileText,
};

const TYPE_LABELS: Record<string, string> = {
  life: 'ประกันชีวิต', health: 'ประกันสุขภาพ', critical_illness: 'โรคร้ายแรง',
  accident: 'อุบัติเหตุ', car: 'ประกันรถ', home: 'ประกันบ้าน', travel: 'ท่องเที่ยว', other: 'อื่นๆ',
};

async function getPolicies() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('insurance_policies')
    .select('*')
    .eq('user_id', user.id)
    .order('renewal_date', { ascending: true, nullsFirst: false });
  return data ?? [];
}

export default async function PoliciesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const policies = await getPolicies();
  const totalCoverage = policies.reduce((s, p) => s + Number(p.sum_insured ?? 0), 0);
  const totalPremium = policies.reduce((s, p) => s + Number(p.annual_premium ?? 0), 0);

  // Find policies with renewal in next 60 days
  const now = Date.now();
  const upcoming = policies.filter((p) => {
    if (!p.renewal_date) return false;
    const r = new Date(p.renewal_date).getTime();
    const days = (r - now) / 86400000;
    return days >= 0 && days <= 60;
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/insurance">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">กรมธรรม์ของฉัน</h1>
            <p className="text-xs text-muted-foreground">บันทึกกรมธรรม์ที่มีอยู่</p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href="/insurance/policies/new">
            <Plus className="mr-1 h-4 w-4" />
            เพิ่ม
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">ทุนคุ้มครองรวม</p>
            <p className="mt-1 text-lg font-bold text-emerald-600">{formatTHB(totalCoverage)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">เบี้ยรวม/ปี</p>
            <p className="mt-1 text-lg font-bold">{formatTHB(totalPremium)}</p>
          </CardContent>
        </Card>
      </div>

      {upcoming.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-amber-900">⚠️ ใกล้ครบกำหนด {upcoming.length} กรมธรรม์</p>
            <p className="mt-1 text-xs text-amber-800">ภายใน 60 วัน — เตรียมต่ออายุไว้</p>
          </CardContent>
        </Card>
      )}

      {policies.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">ยังไม่ได้บันทึกกรมธรรม์</p>
            <p className="mt-1 text-sm text-muted-foreground">
              บันทึกประกันที่มีอยู่ — ระบบช่วยเตือนต่ออายุ
            </p>
            <Button asChild className="mt-4">
              <Link href="/insurance/policies/new">
                <Plus className="mr-1 h-4 w-4" />
                เพิ่มกรมธรรม์
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {policies.map((p) => {
            const Icon = TYPE_ICONS[p.type] ?? FileText;
            const renewalSoon = upcoming.includes(p);
            return (
              <Link key={p.id} href={`/insurance/policies/${p.id}/edit`}>
                <Card className="transition-all hover:border-primary/40 hover:shadow-sm">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{p.carrier}</p>
                        {renewalSoon && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">ใกล้ครบ</span>}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {TYPE_LABELS[p.type]}
                        {p.policy_name ? ` · ${p.policy_name}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatTHB(p.sum_insured)}</p>
                      <p className="text-[10px] text-muted-foreground">{formatTHB(p.annual_premium)}/ปี</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
