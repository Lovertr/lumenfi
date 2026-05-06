'use client';

import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/routing';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listConversations, deleteConversation } from '@/app/[locale]/(app)/ai/actions';

interface Conversation {
  id: string;
  title: string | null;
  updated_at: string;
}

export function ConversationHistoryBar({ currentId }: { currentId?: string }) {
  const [list, setList] = useState<Conversation[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    listConversations().then((data) => setList(data as Conversation[]));
  }, [pathname]);

  if (list.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <Button asChild size="sm" variant="outline" className="shrink-0">
        <Link href="/ai">
          <Plus className="mr-1 h-3.5 w-3.5" />
          แชทใหม่
        </Link>
      </Button>
      {list.slice(0, 20).map((c) => {
        const active = c.id === currentId;
        return (
          <Link
            key={c.id}
            href={`/ai/c/${c.id}`}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
              active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:bg-muted/40'
            }`}
          >
            <MessageSquare className="h-3 w-3" />
            <span className="max-w-[120px] truncate">{c.title || 'Untitled'}</span>
          </Link>
        );
      })}
    </div>
  );
}
