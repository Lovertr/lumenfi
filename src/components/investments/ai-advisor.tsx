import { Link } from '@/i18n/routing';
import { Sparkles, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Compact entry-point card on /investments that links to the full advisor.
 * The standalone investment-only advisor was replaced by the comprehensive
 * one at /advisor (covers debt, tax, retirement, goals, insurance too).
 */
export function AIAdvisor() {
  return (
    <Link href="/advisor">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5 transition-all hover:shadow-md">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">ที่ปรึกษา AI · เลขาทางการเงิน</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              วิเคราะห์ครบทุกมิติ — วางแผน · หนี้ · ลงทุน · ภาษี · เกษียณ
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
