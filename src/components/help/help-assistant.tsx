'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { askHelpAssistant } from '@/app/[locale]/(app)/help/actions';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

export function HelpAssistant() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const q = input.trim();
    if (!q || loading) return;
    setError(null);
    setLoading(true);
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setInput('');
    try {
      const r = await askHelpAssistant(q);
      if (r.error) {
        setError(r.error);
        setMessages((m) => m.slice(0, -1));
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: r.answer ?? '' }]);
      }
    } catch (e) {
      setError('ลองใหม่อีกครั้ง');
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {messages.length > 0 && (
        <div className="max-h-[300px] space-y-3 overflow-y-auto rounded-lg bg-background/60 p-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
              <div
                className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                {m.role === 'assistant' && <Sparkles className="mr-1 inline h-3 w-3" />}
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              AI กำลังคิด...
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="ถามอะไรก็ได้... เช่น 'เพิ่มหมวดหมู่ใหม่ยังไง'"
          disabled={loading}
        />
        <Button onClick={handleSubmit} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
          {error === 'no_ai_key'
            ? '💡 ตั้ง AI API Key ที่ /ai/settings เพื่อใช้ AI ตอบ — ระหว่างนี้ลองค้นหาในหมวดหมู่ด้านล่าง'
            : error}
        </p>
      )}
    </div>
  );
}
