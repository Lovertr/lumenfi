import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Globe,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatFreshness } from '@/lib/agents/products-db';
import {
  syncCompanyNow,
  toggleProductActive,
  updateCompanyResearchUrl,
} from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = searchParams ? await searchParams : {};
  const activeCompanyCode = (sp.c as string | undefined) || '';

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!(profile as any)?.is_admin) redirect('/dashboard');

  const { data: companies } = await supabase
    .from('insurance_companies')
    .select('*')
    .order('code');

  const active = (companies ?? []).find((c: any) => c.code === activeCompanyCode) ?? null;

  let products: any[] = [];
  let recentRuns: any[] = [];
  if (active) {
    const { data: ps } = await supabase
      .from('insurance_products')
      .select('id, name, alt_name, category, tagline, active, last_seen_at, updated_at')
      .eq('company_id', (active as any).id)
      .order('active', { ascending: false })
      .order('category')
      .order('name');
    products = ps ?? [];

    const { data: rs } = await supabase
      .from('product_sync_runs')
      .select('id, started_at, finished_at, status, products_added, products_updated, products_marked_inactive, error_message, triggered_by')
      .eq('company_id', (active as any).id)
      .order('started_at', { ascending: false })
      .limit(10);
    recentRuns = rs ?? [];
  }

  const totalProducts = (companies ?? []).reduce((sum, _) => sum, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/admin/agents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Globe className="h-5 w-5 text-indigo-600" />
            Product Catalog · AI Sync
          </h1>
          <p className="text-xs text-muted-foreground">
            AI ดึงข้อมูลผลิตภัณฑ์จากเว็บไซต์บริษัทประกันมาเอง · กด "Sync now" เพื่อ refresh
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        {/* Companies sidebar */}
        <Card>
          <CardContent className="p-3">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              บริษัทประกัน ({companies?.length ?? 0})
            </p>
            <ul className="space-y-1">
              {(companies ?? []).map((c: any) => {
                const isActive = c.code === activeCompanyCode;
                return (
                  <li key={c.id}>
                    <Link
                      href={{ pathname: '/admin/products', query: { c: c.code } }}
                      className={`flex items-start gap-2 rounded-md p-2 text-sm transition-colors ${
                        isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted/40'
                      }`}
                    >
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-muted/60 text-[10px] font-mono font-bold">
                        {c.code}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {formatFreshness(c.last_synced_at)}
                          {c.last_sync_status === 'error' && (
                            <span className="ml-1 text-destructive">· error</span>
                          )}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Detail panel */}
        <div className="space-y-4">
          {active ? (
            <>
              <Card>
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold">{(active as any).name}</h2>
                      <p className="text-xs text-muted-foreground">
                        Code: <span className="font-mono font-semibold">{(active as any).code}</span>{' '}
                        · {formatFreshness((active as any).last_synced_at)}
                      </p>
                      {(active as any).last_sync_status === 'error' && (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          ครั้งสุดท้าย: {(active as any).last_sync_error ?? 'error'}
                        </p>
                      )}
                    </div>
                    <form action={syncCompanyNow}>
                      <input type="hidden" name="company_id" value={(active as any).id} />
                      <Button type="submit" size="sm">
                        <RefreshCw className="mr-1 h-3.5 w-3.5" />
                        Sync now
                      </Button>
                    </form>
                  </div>

                  <form action={updateCompanyResearchUrl} className="space-y-1">
                    <label className="text-xs font-medium">Research URL (หน้าผลิตภัณฑ์)</label>
                    <div className="flex gap-2">
                      <input
                        type="hidden"
                        name="id"
                        value={(active as any).id}
                      />
                      <input
                        type="url"
                        name="research_url"
                        defaultValue={(active as any).research_url ?? ''}
                        placeholder="https://www.example.com/products"
                        className="flex-1 rounded-md border bg-background px-3 py-1.5 text-xs"
                      />
                      <Button type="submit" size="sm" variant="outline">
                        Save URL
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Products list */}
              <Card>
                <CardContent className="p-0">
                  <div className="border-b p-4">
                    <p className="text-sm font-semibold">
                      ผลิตภัณฑ์ ({products.filter((p: any) => p.active).length} active /{' '}
                      {products.length} total)
                    </p>
                  </div>
                  {products.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">
                      ยังไม่มีผลิตภัณฑ์ — กด Sync now เพื่อให้ AI ดึงจากเว็บไซต์
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {products.map((p: any) => (
                        <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span
                            className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[10px] font-bold ${
                              p.active
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {p.category.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-sm ${
                                p.active ? 'font-medium' : 'text-muted-foreground line-through'
                              }`}
                            >
                              {p.name}
                              {p.alt_name && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({p.alt_name})
                                </span>
                              )}
                            </p>
                            {p.tagline && (
                              <p className="truncate text-[11px] text-muted-foreground">
                                {p.tagline}
                              </p>
                            )}
                          </div>
                          <form action={toggleProductActive}>
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="next" value={p.active ? 'false' : 'true'} />
                            <Button
                              type="submit"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title={p.active ? 'ปิดการใช้งาน' : 'เปิดใช้งาน'}
                            >
                              {p.active ? (
                                <Eye className="h-3.5 w-3.5" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Sync history */}
              <Card>
                <CardContent className="p-4">
                  <p className="mb-3 text-sm font-semibold">ประวัติการ sync</p>
                  {recentRuns.length === 0 ? (
                    <p className="text-xs text-muted-foreground">ยังไม่มีประวัติ</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs">
                      {recentRuns.map((r: any) => (
                        <li key={r.id} className="flex items-center gap-2">
                          {r.status === 'success' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 flex-none text-emerald-600" />
                          ) : r.status === 'error' ? (
                            <AlertCircle className="h-3.5 w-3.5 flex-none text-destructive" />
                          ) : (
                            <Loader2 className="h-3.5 w-3.5 flex-none animate-spin text-muted-foreground" />
                          )}
                          <span className="text-muted-foreground">
                            {new Date(r.started_at).toLocaleString('th-TH')}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{r.triggered_by}</span>
                          {r.status === 'success' && (
                            <span className="text-emerald-700">
                              +{r.products_added} · ~{r.products_updated} · −
                              {r.products_marked_inactive}
                            </span>
                          )}
                          {r.error_message && (
                            <span className="truncate text-destructive">
                              {r.error_message}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-sm text-muted-foreground">
                เลือกบริษัทจากด้านซ้ายเพื่อดูผลิตภัณฑ์
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
