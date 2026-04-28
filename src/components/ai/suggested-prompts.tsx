'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function SuggestedPrompts() {
  const t = useTranslations('AI.chat');
  // Use raw() to get the array directly
  const suggestions = (t.raw('suggestions') as string[]) ?? [];

  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          {t('title')}
        </p>
        <div className="space-y-2">
          {suggestions.map((sug) => (
            <button
              key={sug}
              type="button"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/40"
            >
              {sug}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
