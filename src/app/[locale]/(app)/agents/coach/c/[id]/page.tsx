import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft, GraduationCap, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { SalesCoachChat } from '@/components/agents/sales-coach-chat';
import { CoachHistoryBar } from '@/components/agents/coach-history-bar';
import {
  listCoachConversations,
  getCoachMessages,
  deleteCoachConversation,
} from '../../actions';

export const dynamic = 'force-dynamic';

const PRODUCT_LABELS: Record<string, string> = {
  life: 'ประกันชีวิต',
  health: 'ประกันสุขภาพ',
  ci: 'โรคร้าย (CI)',
  retirement: 'บำนาญ',
  savings: 'สะสมทรัพย์',
  accident: 'อุบัติเหตุ',
};

export default async function CoachConversationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/' + locale + '/login');

  // Check active agent
  const { data: agent } = await supabase
    .from('agents')
    .select('id, status, agent_name, display_name, company, products')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!agent || (agent as any).status !== 'active') redirect('/' + locale + '/agents/coach');

  // Paywall check
  const { data: sub } = await supabase
    .from('agent_subscriptions')
    .select('plan, status')
    .eq('agent_id', (agent as any).id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const paidPlans = ['starter', 'pro', 'team', 'founder'];
  const onPaidPlan =
    !!sub &&
    (sub as any).status === 'active' &&
    paidPlans.includes(((sub as any).plan ?? '').toLowerCase());
  if (!onPaidPlan) redirect('/' + locale + '/agents/coach');

  // Verify conversation belongs to user
  const { data: conv } = await supabase
    .from('ai_conversations')
    .select('id, title, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('feature', 'coach')
    .maybeSingle();
  if (!conv) notFound();

  const [messages, conversations] = await Promise.all([
    getCoachMessages(id),
    listCoachConversations(),
  ]);

  const products = ((agent as any).products as string[] | null) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/agents/coach">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <GraduationCap className="h-5 w-5 text-amber-600" />
            <span className="truncate">{(conv as any).title || 'Sales Coach AI'}</span>
          </h1>
          <p className="text-xs text-muted-foreground">โค้ชนักขายส่วนตัว · ใช้ผลิตภัณฑ์ของคุณเป็น context</p>
        </div>
        <form action={deleteCoachConversation}>
          <input type="hidden" name="id" value={id} />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            aria-label="ลบแชทนี้"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </form>
      </header>

      {/* Context strip */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-amber-50/40 to-orange-50/40">
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 text-xs">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold">{(agent as any).agent_name}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {(agent as any).display_name ?? (agent as any).company ?? '—'}
            </span>
          </div>
          {products.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground">ผลิตภัณฑ์:</span>
              {products.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900"
                >
                  {PRODUCT_LABELS[p] ?? p}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CoachHistoryBar conversations={conversations} activeId={id} />

      <SalesCoachChat conversationId={id} initialMessages={messages} />
    </div>
  );
}
