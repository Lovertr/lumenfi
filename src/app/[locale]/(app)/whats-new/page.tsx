import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Sparkles, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getVersions, markVersionSeen } from '@/lib/queries/versions';

export const dynamic = 'force-dynamic';

export default async function WhatsNewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const versions = await getVersions(30);

  // Mark the latest as seen
  if (versions[0]) {
    await markVersionSeen(versions[0].version).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-primary" />
            มีอะไรใหม่ใน Lumenfi
          </h1>
          <p className="text-xs text-muted-foreground">รายการอัพเดตล่าสุด · {versions.length} รุ่น</p>
        </div>
      </header>

      {versions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลรุ่น — apply migration 15 ก่อน</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {versions.map((v, idx) => {
            const isLatest = idx === 0;
            const dateTH = new Date(v.released_on).toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            return (
              <Card
                key={v.version}
                className={isLatest ? 'border-primary/40 ring-1 ring-primary/20' : ''}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {isLatest && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            ล่าสุด
                          </span>
                        )}
                        {v.is_major && (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-0.5">
                            <Star className="h-2.5 w-2.5" /> Major
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-muted-foreground">v{v.version}</span>
                      </div>
                      <h2 className="mt-1 text-base font-bold">{v.title}</h2>
                      <p className="text-[11px] text-muted-foreground">{dateTH}</p>
                    </div>
                  </div>

                  {v.summary && <p className="mt-2 text-sm text-foreground/85">{v.summary}</p>}

                  {v.highlights && v.highlights.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {v.highlights.map((h, i) => (
                        <li key={i}>
                          {h.url ? (
                            <Link
                              href={h.url}
                              className="flex items-start gap-2 rounded-md border bg-background/50 p-2.5 text-sm transition-colors hover:bg-muted/40"
                            >
                              <span className="text-base leading-tight">{h.icon}</span>
                              <span className="flex-1">{h.text}</span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </Link>
                          ) : (
                            <div className="flex items-start gap-2 rounded-md border bg-background/50 p-2.5 text-sm">
                              <span className="text-base leading-tight">{h.icon}</span>
                              <span className="flex-1">{h.text}</span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
