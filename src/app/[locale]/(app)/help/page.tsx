import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { HelpAssistant } from '@/components/help/help-assistant';
import { HelpArticleList } from '@/components/help/help-article-list';

export const dynamic = 'force-dynamic';

const CATEGORIES: Record<string, { label: string; emoji: string }> = {
  'getting-started': { label: 'เริ่มต้นใช้งาน', emoji: '🚀' },
  'transactions': { label: 'รายรับ-รายจ่าย', emoji: '💸' },
  'budgets': { label: 'งบประมาณ', emoji: '📊' },
  'goals': { label: 'เป้าหมาย', emoji: '🎯' },
  'debts': { label: 'หนี้สิน', emoji: '💳' },
  'insurance': { label: 'ประกัน', emoji: '🛡️' },
  'ai': { label: 'AI Advisor', emoji: '🤖' },
  'tools': { label: 'เครื่องมือ', emoji: '🧮' },
  'privacy': { label: 'ความเป็นส่วนตัว', emoji: '🔒' },
  'general': { label: 'ทั่วไป', emoji: '❓' },
};

async function getArticles(locale: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('help_articles')
    .select('*')
    .eq('locale', locale === 'en' ? 'en' : 'th')
    .order('sort_order');
  return data ?? [];
}

export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const articles = await getArticles(locale);

  // Group by category
  const grouped: Record<string, typeof articles> = {};
  for (const a of articles) {
    if (!grouped[a.category]) grouped[a.category] = [];
    grouped[a.category].push(a);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center gap-2">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <BookOpen className="h-5 w-5 text-primary" />
            ศูนย์ช่วยเหลือ
          </h1>
          <p className="text-xs text-muted-foreground">คู่มือการใช้งาน + AI ช่วยตอบ</p>
        </div>
      </header>

      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-amber-50">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">ถาม AI ช่วยเหลือ</h2>
              <p className="text-xs text-muted-foreground">"เพิ่มหมวดหมู่ใหม่ยังไง" "บันทึกค่าน้ำมันไว้ที่ไหน"</p>
            </div>
          </div>
          <div className="mt-4">
            <HelpAssistant />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {Object.entries(grouped).map(([cat, list]) => {
          const meta = CATEGORIES[cat] ?? { label: cat, emoji: '📄' };
          return (
            <Card key={cat}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xl">{meta.emoji}</span>
                  <h3 className="font-semibold">{meta.label}</h3>
                </div>
                <HelpArticleList articles={list} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {articles.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            ยังไม่มีบทความ — รัน migration 11 เพื่อเพิ่ม
          </CardContent>
        </Card>
      )}
    </div>
  );
}
