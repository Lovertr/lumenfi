'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Send, Sparkles, AlertCircle, User, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { sendChatMessage } from '@/app/[locale]/(app)/ai/actions';
import { renderMarkdown } from '@/lib/markdown';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/ai/types';

interface DisplayMessage extends ChatMessage {
  id: string;
  pending?: boolean;
  error?: boolean;
}

export function ChatUI() {
  const t = useTranslations('AI.chat');
  const locale = useLocale();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = (t.raw('suggestions') as string[]) ?? [];

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    const userMsg: DisplayMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    const placeholder: DisplayMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: '',
      pending: true,
    };

    setMessages((prev) => [...prev, userMsg, placeholder]);
    setInput('');
    setPending(true);

    const history: ChatMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
    const result = await sendChatMessage(history, trimmed, locale);

    setMessages((prev) =>
      prev.map((m) =>
        m.id === placeholder.id
          ? {
              ...m,
              pending: false,
              content: result.reply ?? `Error: ${result.error ?? 'unknown'}`,
              error: !!result.error,
            }
          : m
      )
    );
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-3" style={{ minHeight: 'calc(100vh - 200px)' }}>
      {messages.length === 0 ? (
        <Card>
          <CardContent className="p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              {t('title')}
            </p>
            <div className="space-y-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={pending}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/40 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 pb-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          <div ref={scrollRef} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-20 mt-auto lg:bottom-4"
      >
        <div className="flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={t('placeholder')}
            rows={1}
            disabled={pending}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground"
            style={{ minHeight: 40, maxHeight: 120 }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || pending}
            className="h-10 w-10 shrink-0 rounded-xl"
            aria-label={t('send')}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === 'user';
  const t = useTranslations('AI.chat');

  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-[#0A0F1F] text-[#FCD34D]'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'max-w-[88%] rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'rounded-tr-sm bg-primary text-primary-foreground'
            : message.error
              ? 'rounded-tl-sm border border-destructive/30 bg-destructive/10 text-destructive'
              : 'rounded-tl-sm bg-muted'
        )}
      >
        {message.pending ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: '300ms' }} />
            </span>
            {t('thinking')}
          </span>
        ) : message.error ? (
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{message.content}</span>
          </div>
        ) : isUser ? (
          <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
        ) : (
          <div className="leading-relaxed">{renderMarkdown(message.content)}</div>
        )}
      </div>
    </div>
  );
}
