'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { Send, Sparkles, AlertCircle, User, Bot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { sendSalesCoachMessage } from '@/app/[locale]/(app)/agents/coach/actions';
import { renderMarkdown } from '@/lib/markdown';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/ai/types';

interface DisplayMessage extends ChatMessage {
  id: string;
  pending?: boolean;
  error?: boolean;
}

const SUGGESTED_TOPICS: { title: string; prompt: string; emoji: string }[] = [
  {
    emoji: '💬',
    title: 'เปิดการสนทนาแบบไม่กดดัน',
    prompt:
      'ขอ script เปิดการสนทนากับ prospect ใหม่ที่ไม่กดดัน — แบบที่ทำให้เขารู้สึกว่าเราใส่ใจ ไม่ใช่แค่อยากขาย',
  },
  {
    emoji: '🛡️',
    title: 'รับมือ objection "แพง"',
    prompt:
      'ลูกค้าบอกว่า "แพงเกินไป" — ขอวิธีตอบ 3 รูปแบบที่ไม่ลดราคา แต่ทำให้เขามองเห็น value',
  },
  {
    emoji: '⏰',
    title: '"ขอคิดดูก่อน" — ต่อยังไง',
    prompt:
      'ลูกค้าบอก "ขอคิดดูก่อน" หลัง pitch จบ — เทคนิคถามต่อยังไงให้รู้เหตุผลจริง โดยไม่ทำให้เขารู้สึกถูกบังคับ',
  },
  {
    emoji: '👶',
    title: 'Pitch สำหรับพ่อแม่มือใหม่',
    prompt:
      'ออกแบบ pitch สำหรับ persona "พ่อแม่มือใหม่ มีลูก 0-3 ขวบ" — ใช้ตัวเลขจริง (ค่าเลี้ยงลูก) เป็นจุดเริ่ม',
  },
  {
    emoji: '📱',
    title: 'Content social media ดึง prospect',
    prompt:
      'ไอเดียโพสต์ Facebook 5 หัวข้อสำหรับเดือนนี้ที่ดึง prospect ใหม่ — ไม่ใช่โฆษณาขายตรง',
  },
  {
    emoji: '🎯',
    title: 'Follow-up cadence ที่ไม่กวน',
    prompt:
      'ขอแผน follow-up 30 วัน หลัง first meeting ที่ไม่กดดัน — channel + timing + sample message',
  },
];

const ERR_MAP: Record<string, string> = {
  unauthorized: 'กรุณา login ก่อน',
  not_agent: 'หน้านี้สำหรับตัวแทนที่ผ่านการอนุมัติเท่านั้น',
  agent_not_active: 'บัญชีตัวแทนของคุณยังไม่ active — รออนุมัติจาก admin',
  quota_chat_exceeded: 'คุณใช้ Lumenfi AI หมด quota รายวันแล้ว · ใส่ key ตัวเองที่ /ai/settings หรืออัพเกรด Pro',
  no_key_configured: 'ยังไม่ได้ตั้งค่า AI key — ไปที่ /ai/settings',
  no_ai_access: 'ต้องอัพเกรด Pro หรือใส่ AI key ของตัวเอง',
  agent_paywall: 'Sales Coach AI สำหรับแพ็คเกจ Starter+ เท่านั้น — อัพเกรดที่ /agents/pricing',
};

export function SalesCoachChat({
  conversationId: initialConversationId,
  initialMessages = [],
}: {
  conversationId?: string;
  initialMessages?: ChatMessage[];
} = {}) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [messages, setMessages] = useState<DisplayMessage[]>(
    initialMessages.map((m, i) => ({ id: `init-${i}`, role: m.role, content: m.content })),
  );
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send(rawText: string) {
    const text = rawText.trim();
    if (!text || pending) return;

    const userMsg: DisplayMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };
    const placeholder: DisplayMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      pending: true,
    };
    const nextHistory = [...messages, userMsg];
    setMessages([...nextHistory, placeholder]);
    setInput('');
    setPending(true);

    const historyForApi: ChatMessage[] = nextHistory
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.content }));

    const result = await sendSalesCoachMessage(
      historyForApi.slice(0, -1), // exclude the just-added user msg (server appends)
      text,
      conversationId,
    );

    setPending(false);
    setMessages((prev) => {
      const without = prev.filter((m) => m.id !== placeholder.id);
      if ('reply' in result) {
        // Capture the conversation id once and reflect it in the URL so refresh keeps history
        const wasNew = !conversationId;
        if (result.conversationId && !conversationId) {
          setConversationId(result.conversationId);
          if (wasNew) {
            // Don't navigate — just update history sidebar so the new convo appears
            router.refresh();
          }
        }
        return [
          ...without,
          { id: crypto.randomUUID(), role: 'assistant', content: result.reply },
        ];
      }
      const friendly = ERR_MAP[result.error] ?? `เกิดข้อผิดพลาด: ${result.error}`;
      return [
        ...without,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: friendly,
          error: true,
        },
      ];
    });
  }

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">หัวข้อที่นักขายชอบเริ่ม</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGGESTED_TOPICS.map((t) => (
                <button
                  key={t.title}
                  type="button"
                  onClick={() => send(t.prompt)}
                  disabled={pending}
                  className="group rounded-lg border bg-background p-3 text-left text-sm transition-all hover:border-primary/40 hover:shadow-sm disabled:opacity-50"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base">{t.emoji}</span>
                    <span className="font-medium text-foreground">{t.title}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {t.prompt}
                  </p>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              💡 หรือพิมพ์คำถามอะไรก็ได้ในช่องด้านล่าง — Sales Coach AI จะตอบโดยอ้างอิงผลิตภัณฑ์ที่คุณขาย
            </p>
          </CardContent>
        </Card>
      ) : null}

      {messages.length > 0 ? (
        <div
          ref={scrollRef}
          className="max-h-[60vh] space-y-3 overflow-y-auto rounded-lg border bg-muted/10 p-3"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                'flex gap-2',
                m.role === 'user' ? 'flex-row-reverse' : '',
              )}
            >
              <div
                className={cn(
                  'flex h-7 w-7 flex-none items-center justify-center rounded-full',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : m.error
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
                )}
              >
                {m.role === 'user' ? (
                  <User className="h-3.5 w-3.5" />
                ) : m.error ? (
                  <AlertCircle className="h-3.5 w-3.5" />
                ) : (
                  <Bot className="h-3.5 w-3.5" />
                )}
              </div>
              <div
                className={cn(
                  'flex-1 rounded-2xl px-4 py-2.5 text-sm',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : m.error
                    ? 'border border-destructive/30 bg-destructive/5 text-destructive'
                    : 'border bg-background',
                )}
              >
                {m.pending ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Sales Coach กำลังคิด...
                  </span>
                ) : m.role === 'assistant' && !m.error ? (
                  <div className="prose prose-sm max-w-none leading-relaxed dark:prose-invert">
                    {renderMarkdown(m.content)}
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ถามอะไรก็ได้... 'objection ‘แพง’ ตอบยังไง?'"
          disabled={pending}
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
        />
        <Button type="submit" disabled={pending || !input.trim()}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
