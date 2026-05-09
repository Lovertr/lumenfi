import { Link } from '@/i18n/routing';
import { Sparkles, ChevronRight, Star } from 'lucide-react';

export function WhatsNewBanner({
  version,
  title,
  isMajor,
  highlightCount,
}: {
  version: string;
  title: string;
  isMajor: boolean;
  highlightCount: number;
}) {
  return (
    <Link href="/whats-new" className="block">
      <div className="group flex items-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-gradient-to-r from-primary/5 to-purple-500/5 p-3 transition-all hover:border-primary/60 hover:from-primary/10 hover:to-purple-500/10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600 text-white">
          {isMajor ? <Star className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              ใหม่
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">v{version}</span>
          </div>
          <p className="mt-0.5 text-sm font-semibold">{title}</p>
          <p className="text-[11px] text-muted-foreground">
            มี {highlightCount} ฟีเจอร์ใหม่ — แตะเพื่อดูทั้งหมด
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
