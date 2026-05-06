import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatUI } from '@/components/ai/chat-ui';
import { ConversationHistoryBar } from '@/components/ai/conversation-history-bar';
import { getConversationMessages } from '@/app/[locale]/(app)/ai/actions';

export const dynamic = 'force-dynamic';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('AI');

  const initialMessages = await getConversationMessages(id);

  return (
    <div className="mx-auto max-w-3xl space-y-3 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/ai">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{t('title')}</h1>
            <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
        <Button asChild size="icon" variant="ghost" className="h-9 w-9">
          <Link href="/ai/settings">
            <SettingsIcon className="h-4 w-4" />
          </Link>
        </Button>
      </header>

      <ConversationHistoryBar currentId={id} />

      <ChatUI conversationId={id} initialMessages={initialMessages.filter(m => m.role !== 'system')} />
    </div>
  );
}
