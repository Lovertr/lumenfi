import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { ArrowLeft, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { ADVISOR_LABELS, type AdvisorDomain } from '@/lib/advisor/prompts';
import { MarkdownRender } from '@/components/advisor/markdown-render';
import { deleteAdvisorReport } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function AdvisorReportPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: report } = await supabase
    .from('advisor_reports')
    .select('id, domain, title, content, summary, created_at, provider')
    .eq('id', id)
    .maybeSingle();

  if (!report) notFound();

  const cfg = ADVISOR_LABELS[report.domain as AdvisorDomain];

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/advisor">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">รายงาน</h1>
            <p className="text-xs text-muted-foreground">
              {new Date(report.created_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
              {report.provider && ` · ${report.provider}`}
            </p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className={`overflow-hidden rounded-2xl bg-gradient-to-br ${cfg?.color ?? 'from-gray-700 to-gray-900'} p-5 text-white`}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-2xl backdrop-blur">
            {cfg?.icon ?? '📄'}
          </div>
          <div>
            <p className="text-xs opacity-80 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI Analysis
            </p>
            <p className="text-lg font-bold lg:text-xl">{cfg?.title ?? report.title}</p>
            <p className="text-[11px] opacity-80">{cfg?.description ?? ''}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <Card>
        <CardContent className="p-5 lg:p-6">
          <MarkdownRender content={report.content} />
        </CardContent>
      </Card>

      <form action={deleteAdvisorReport}>
        <input type="hidden" name="id" value={report.id} />
        <Button
          type="submit"
          variant="ghost"
          size="lg"
          className="w-full text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          ลบรายงานนี้
        </Button>
      </form>
    </div>
  );
}
