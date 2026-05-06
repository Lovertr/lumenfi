'use client';

import { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Article {
  id: string;
  slug: string;
  title: string;
  body: string;
}

export function HelpArticleList({ articles }: { articles: Article[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = articles.find((a) => a.id === openId);

  return (
    <>
      <div className="space-y-1">
        {articles.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setOpenId(a.id)}
            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted/50"
          >
            <span>{a.title}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => setOpenId(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-background p-5 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold">{open.title}</h2>
              <Button size="icon" variant="ghost" onClick={() => setOpenId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {open.body}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
